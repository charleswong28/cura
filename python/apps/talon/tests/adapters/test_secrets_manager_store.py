"""
SecretsManagerCredentialStore adapter tests — moto mocks AWS.

Tests cover:
- successful credential fetch
- CredentialNotFoundError when secret is absent
- fetch never logs credential values (log capture check)
- fetching the same secret twice returns the same values
"""

import json
import logging

import boto3
import pytest
from moto import mock_aws

from talon.adapters.credentials.secrets_manager_store import SecretsManagerCredentialStore
from talon.domain.ports.credential_store import CredentialNotFoundError

REGION = "ap-southeast-2"
PREFIX = "talon"
TENANT_ID = "tenant-1"
USER_ID = "user-abc"
SITE_KEY = "linkedin.com"
TASK_ID = "01HXTEST0000000000000001"


@pytest.fixture(autouse=True)
def aws_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)


@pytest.fixture
def sm_client():
    with mock_aws():
        yield boto3.client("secretsmanager", region_name=REGION)


@pytest.fixture
def store() -> SecretsManagerCredentialStore:
    return SecretsManagerCredentialStore(region=REGION, prefix=PREFIX)


def _seed_secret(sm_client, username: str = "alice@example.com", password: str = "hunter2") -> None:
    sm_client.create_secret(
        Name=f"{PREFIX}/{SITE_KEY}/{TENANT_ID}/{USER_ID}",
        SecretString=json.dumps({"username": username, "password": password}),
    )


def test_fetch_returns_credential(sm_client, store: SecretsManagerCredentialStore) -> None:
    _seed_secret(sm_client)
    cred = store.fetch(TENANT_ID, USER_ID, SITE_KEY, TASK_ID)
    assert cred.username == "alice@example.com"
    assert cred.password == "hunter2"
    assert cred.totp_secret is None


def test_fetch_with_totp(sm_client, store: SecretsManagerCredentialStore) -> None:
    sm_client.create_secret(
        Name=f"{PREFIX}/{SITE_KEY}/{TENANT_ID}/{USER_ID}",
        SecretString=json.dumps({
            "username": "bob@example.com",
            "password": "p@ssw0rd",
            "totp_secret": "JBSWY3DPEHPK3PXP",
        }),
    )
    cred = store.fetch(TENANT_ID, USER_ID, SITE_KEY, TASK_ID)
    assert cred.totp_secret == "JBSWY3DPEHPK3PXP"


def test_fetch_raises_when_secret_not_found(sm_client, store: SecretsManagerCredentialStore) -> None:
    with pytest.raises(CredentialNotFoundError):
        store.fetch(TENANT_ID, USER_ID, SITE_KEY, TASK_ID)


def test_fetch_logs_request_without_credential_values(
    sm_client, store: SecretsManagerCredentialStore, caplog: pytest.LogCaptureFixture
) -> None:
    _seed_secret(sm_client, username="alice@example.com", password="supersecret")
    with caplog.at_level(logging.INFO, logger="talon.adapters.credentials.secrets_manager_store"):
        store.fetch(TENANT_ID, USER_ID, SITE_KEY, TASK_ID)

    log_text = "\n".join(caplog.messages)
    assert "credential_fetch_requested" in log_text
    assert TASK_ID in log_text
    # Credential values must never appear in logs
    assert "supersecret" not in log_text
    assert "alice@example.com" not in log_text


def test_fetch_not_found_logs_denial(
    sm_client, store: SecretsManagerCredentialStore, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.WARNING, logger="talon.adapters.credentials.secrets_manager_store"):
        try:
            store.fetch(TENANT_ID, USER_ID, SITE_KEY, TASK_ID)
        except CredentialNotFoundError:
            pass

    log_text = "\n".join(caplog.messages)
    assert "credential_fetch_denied" in log_text
    assert "not_found" in log_text


def test_fetch_twice_returns_same_values(sm_client, store: SecretsManagerCredentialStore) -> None:
    _seed_secret(sm_client)
    cred1 = store.fetch(TENANT_ID, USER_ID, SITE_KEY, TASK_ID)
    cred2 = store.fetch(TENANT_ID, USER_ID, SITE_KEY, TASK_ID)
    assert cred1.username == cred2.username
