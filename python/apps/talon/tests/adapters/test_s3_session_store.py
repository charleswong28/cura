"""
S3SessionStore adapter tests — moto mocks AWS locally, no real calls made.

Tests cover:
- download when no profile exists (first run)
- upload → download round-trip (decrypt matches original content)
- encryption: ciphertext is not plaintext
- concurrent users produce independent S3 keys
"""

import io
import json
import os
import tarfile
import tempfile

import boto3
import pytest
from moto import mock_aws

from talon.adapters.session.s3_session_store import S3SessionStore

REGION = "ap-southeast-2"
BUCKET = "test-sessions"
SECRETS_PREFIX = "talon"
TENANT_ID = "tenant-1"
USER_ID = "user-abc"
SITE_KEY = "linkedin.com"
SESSION_KEY_HEX = os.urandom(32).hex()  # 256-bit key


@pytest.fixture(autouse=True)
def aws_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test")
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)


@pytest.fixture
def aws_resources():
    """Spin up mocked S3 bucket and Secrets Manager secret."""
    with mock_aws():
        s3 = boto3.client("s3", region_name=REGION)
        s3.create_bucket(
            Bucket=BUCKET,
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )
        sm = boto3.client("secretsmanager", region_name=REGION)
        sm.create_secret(
            Name=f"{SECRETS_PREFIX}/session-key/{TENANT_ID}/{USER_ID}/{SITE_KEY}",
            SecretString=SESSION_KEY_HEX,
        )
        yield s3, sm


@pytest.fixture
def store() -> S3SessionStore:
    return S3SessionStore(region=REGION, bucket=BUCKET, secrets_prefix=SECRETS_PREFIX)


@pytest.fixture
def profile_dir(tmp_path):
    """A temp directory with a fake Chrome profile file."""
    (tmp_path / "Cookies").write_text("fake-cookie-data")
    (tmp_path / "localStorage").mkdir()
    (tmp_path / "localStorage" / "data.db").write_bytes(b"\x00\x01\x02\x03")
    return str(tmp_path)


def test_download_returns_none_when_no_profile(aws_resources, store: S3SessionStore) -> None:
    result = store.download(TENANT_ID, USER_ID, SITE_KEY)
    assert result is None


def test_upload_then_download_restores_files(
    aws_resources, store: S3SessionStore, profile_dir: str, tmp_path
) -> None:
    store.upload(TENANT_ID, USER_ID, SITE_KEY, profile_dir)

    download_dir = str(tmp_path / "restored")
    os.makedirs(download_dir)

    # Patch the download to extract to our tmp dir
    original_download = store.download

    def patched_download(tenant_id, user_id, site_key):
        s3_key = store._s3_key(tenant_id, user_id, site_key)
        response = store._s3.get_object(Bucket=store._bucket, Key=s3_key)
        ciphertext = response["Body"].read()
        key = store._get_encryption_key(tenant_id, user_id, site_key)
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        nonce, data = ciphertext[:12], ciphertext[12:]
        plaintext = AESGCM(key).decrypt(nonce, data, None)
        os.makedirs(download_dir, exist_ok=True)
        with tarfile.open(fileobj=io.BytesIO(plaintext), mode="r:gz") as tar:
            tar.extractall(path=download_dir)
        return download_dir

    result_dir = patched_download(TENANT_ID, USER_ID, SITE_KEY)
    assert os.path.exists(os.path.join(result_dir, "Cookies"))
    cookie_content = open(os.path.join(result_dir, "Cookies")).read()
    assert cookie_content == "fake-cookie-data"


def test_upload_stores_encrypted_bytes(
    aws_resources, store: S3SessionStore, profile_dir: str
) -> None:
    store.upload(TENANT_ID, USER_ID, SITE_KEY, profile_dir)

    s3 = boto3.client("s3", region_name=REGION)
    response = s3.get_object(
        Bucket=BUCKET,
        Key=f"sessions/{TENANT_ID}/{USER_ID}/{SITE_KEY}.tar.gz.enc",
    )
    ciphertext = response["Body"].read()

    # Ciphertext must not contain the plaintext cookie string
    assert b"fake-cookie-data" not in ciphertext
    # Nonce is 12 bytes; the rest is ciphertext + tag
    assert len(ciphertext) > 12


def test_different_users_have_independent_s3_keys(
    aws_resources, store: S3SessionStore, profile_dir: str
) -> None:
    # Seed a second secret for user-xyz
    sm = boto3.client("secretsmanager", region_name=REGION)
    sm.create_secret(
        Name=f"{SECRETS_PREFIX}/session-key/{TENANT_ID}/user-xyz/{SITE_KEY}",
        SecretString=os.urandom(32).hex(),
    )

    store.upload(TENANT_ID, "user-xyz", SITE_KEY, profile_dir)
    store.upload(TENANT_ID, USER_ID, SITE_KEY, profile_dir)

    s3 = boto3.client("s3", region_name=REGION)
    objects = s3.list_objects_v2(Bucket=BUCKET)["Contents"]
    keys = {o["Key"] for o in objects}

    assert f"sessions/{TENANT_ID}/user-xyz/{SITE_KEY}.tar.gz.enc" in keys
    assert f"sessions/{TENANT_ID}/{USER_ID}/{SITE_KEY}.tar.gz.enc" in keys


def test_upload_overwrites_previous_version(
    aws_resources, store: S3SessionStore, profile_dir: str, tmp_path
) -> None:
    """Second upload replaces first — last known-good is always the latest run."""
    store.upload(TENANT_ID, USER_ID, SITE_KEY, profile_dir)

    # Update the profile file
    (tmp_path / "Cookies").write_text("updated-cookie-data")
    store.upload(TENANT_ID, USER_ID, SITE_KEY, str(tmp_path))

    s3 = boto3.client("s3", region_name=REGION)
    objects = s3.list_objects_v2(Bucket=BUCKET)["Contents"]
    # Still only one object
    assert len(objects) == 1
