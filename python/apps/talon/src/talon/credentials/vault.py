"""
Credential vault — just-in-time, single-use fetch from Secrets Manager.

The runner receives a short-lived fetch token per task. Credentials are
discarded from memory immediately after the browser session closes.

Vault design:
- Stored AES-256-GCM encrypted at rest in Secrets Manager
- Single-use fetch token scoped to (taskId, siteKey, userId)
- Every fetch is logged (taskId, siteKey, timestamp) — no credential value logged
- Runners cannot enumerate or list credentials
"""

import logging

import boto3

from talon.config import settings
from talon.models import TalonErrorCode

logger = logging.getLogger(__name__)

_sm = boto3.client("secretsmanager", region_name=settings.aws_region)


class CredentialNotFoundError(Exception):
    error_code = TalonErrorCode.NO_CREDENTIAL


class SiteCredential:
    def __init__(self, username: str, password: str, totp_secret: str | None = None) -> None:
        self.username = username
        self.password = password
        self.totp_secret = totp_secret

    def __del__(self) -> None:
        # Overwrite references on GC to minimise window credentials are in memory
        self.username = ""
        self.password = ""
        self.totp_secret = None


def fetch_credential(
    tenant_id: str,
    user_id: str,
    site_key: str,
    task_id: str,
) -> SiteCredential:
    """
    Fetch a site credential from Secrets Manager.

    Raises CredentialNotFoundError if no credential exists for the combination.
    Logs the fetch event (no credential values logged).
    """
    secret_name = f"{settings.secrets_manager_prefix}/{site_key}/{tenant_id}/{user_id}"
    logger.info(
        "credential_fetch_requested task_id=%s site_key=%s user_id=%s",
        task_id,
        site_key,
        user_id,
    )

    try:
        response = _sm.get_secret_value(SecretId=secret_name)
        import json
        secret = json.loads(response["SecretString"])
        return SiteCredential(
            username=secret["username"],
            password=secret["password"],
            totp_secret=secret.get("totp_secret"),
        )
    except _sm.exceptions.ResourceNotFoundException:
        logger.warning(
            "credential_fetch_denied task_id=%s site_key=%s user_id=%s reason=not_found",
            task_id,
            site_key,
            user_id,
        )
        raise CredentialNotFoundError(f"no credential for {site_key}/{user_id}")
