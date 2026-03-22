"""
Adapter: AWS Secrets Manager credential store.

Credentials are stored AES-256-GCM encrypted at rest.
Every fetch is logged (taskId, siteKey, timestamp) — no credential values logged.
Runners cannot enumerate or list credentials.
"""

import json
import logging

import boto3

from talon.domain.models import SiteCredential
from talon.domain.ports.credential_store import CredentialNotFoundError, CredentialStore

logger = logging.getLogger(__name__)


class SecretsManagerCredentialStore(CredentialStore):
    def __init__(self, region: str, prefix: str) -> None:
        self._client = boto3.client("secretsmanager", region_name=region)
        self._prefix = prefix

    def fetch(
        self,
        tenant_id: str,
        user_id: str,
        site_key: str,
        task_id: str,
    ) -> SiteCredential:
        secret_name = f"{self._prefix}/{site_key}/{tenant_id}/{user_id}"
        logger.info(
            "credential_fetch_requested task_id=%s site_key=%s user_id=%s",
            task_id, site_key, user_id,
        )
        try:
            response = self._client.get_secret_value(SecretId=secret_name)
            secret = json.loads(response["SecretString"])
            return SiteCredential(
                username=secret["username"],
                password=secret["password"],
                totp_secret=secret.get("totp_secret"),
            )
        except self._client.exceptions.ResourceNotFoundException:
            logger.warning(
                "credential_fetch_denied task_id=%s site_key=%s user_id=%s reason=not_found",
                task_id, site_key, user_id,
            )
            raise CredentialNotFoundError(f"no credential for {site_key}/{user_id}")
