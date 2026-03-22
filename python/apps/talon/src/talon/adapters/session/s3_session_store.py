"""
Adapter: S3 + AES-256-GCM session store.

Pattern: copy-in / copy-out.
  Download tarball → decrypt → extract to /tmp (real POSIX filesystem for Chrome)
  Tar updated profile → AES-256-GCM encrypt → upload to S3 (SSE-KMS second layer)

S3 key: sessions/{tenant_id}/{user_id}/{site_key}.tar.gz.enc
90-day inactivity TTL enforced via S3 lifecycle policy.
"""

import io
import logging
import os
import tarfile

import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from talon.domain.ports.session_store import SessionStore

logger = logging.getLogger(__name__)


class S3SessionStore(SessionStore):
    def __init__(self, region: str, bucket: str, secrets_prefix: str) -> None:
        self._s3 = boto3.client("s3", region_name=region)
        self._sm = boto3.client("secretsmanager", region_name=region)
        self._bucket = bucket
        self._secrets_prefix = secrets_prefix

    def download(self, tenant_id: str, user_id: str, site_key: str) -> str | None:
        s3_key = self._s3_key(tenant_id, user_id, site_key)
        local_dir = f"/tmp/chrome/{user_id}/{site_key}"
        try:
            response = self._s3.get_object(Bucket=self._bucket, Key=s3_key)
            ciphertext = response["Body"].read()
        except self._s3.exceptions.NoSuchKey:
            logger.info("no session profile for %s/%s/%s", tenant_id, user_id, site_key)
            return None

        key = self._get_encryption_key(tenant_id, user_id, site_key)
        nonce, data = ciphertext[:12], ciphertext[12:]
        plaintext = AESGCM(key).decrypt(nonce, data, None)

        os.makedirs(local_dir, exist_ok=True)
        with tarfile.open(fileobj=io.BytesIO(plaintext), mode="r:gz") as tar:
            tar.extractall(path=local_dir)

        logger.info("session profile extracted to %s", local_dir)
        return local_dir

    def upload(self, tenant_id: str, user_id: str, site_key: str, profile_dir: str) -> None:
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w:gz") as tar:
            tar.add(profile_dir, arcname=".")

        key = self._get_encryption_key(tenant_id, user_id, site_key)
        nonce = os.urandom(12)
        ciphertext = nonce + AESGCM(key).encrypt(nonce, buf.getvalue(), None)

        s3_key = self._s3_key(tenant_id, user_id, site_key)
        self._s3.put_object(
            Bucket=self._bucket,
            Key=s3_key,
            Body=ciphertext,
            ServerSideEncryption="aws:kms",
        )
        logger.info("session profile uploaded to s3://%s/%s", self._bucket, s3_key)

    def _s3_key(self, tenant_id: str, user_id: str, site_key: str) -> str:
        return f"sessions/{tenant_id}/{user_id}/{site_key}.tar.gz.enc"

    def _get_encryption_key(self, tenant_id: str, user_id: str, site_key: str) -> bytes:
        secret_name = f"{self._secrets_prefix}/session-key/{tenant_id}/{user_id}/{site_key}"
        response = self._sm.get_secret_value(SecretId=secret_name)
        return bytes.fromhex(response["SecretString"])
