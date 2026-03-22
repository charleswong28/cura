"""
Session persistence — Chrome profile tarball encrypted in S3.

Pattern: copy-in / copy-out.
  - Download tarball from S3 → extract to /tmp/chrome/{user_id}/
  - Run Chrome against local POSIX filesystem (no s3fs)
  - Tar updated profile → AES-256-GCM encrypt → upload to S3

S3 key: sessions/{tenant_id}/{user_id}/{site_key}.tar.gz.enc
AWS SSE-KMS provides a second independent encryption layer.
90-day inactivity TTL via S3 lifecycle policy.
"""

import io
import logging
import os
import tarfile
import tempfile
from pathlib import Path

import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from talon.config import settings

logger = logging.getLogger(__name__)

_s3 = boto3.client("s3", region_name=settings.aws_region)
_sm = boto3.client("secretsmanager", region_name=settings.aws_region)


def _session_key_name(tenant_id: str, user_id: str, site_key: str) -> str:
    return f"{settings.secrets_manager_prefix}/session-key/{tenant_id}/{user_id}/{site_key}"


def _s3_key(tenant_id: str, user_id: str, site_key: str) -> str:
    return f"sessions/{tenant_id}/{user_id}/{site_key}.tar.gz.enc"


def _get_session_encryption_key(tenant_id: str, user_id: str, site_key: str) -> bytes:
    secret = _sm.get_secret_value(
        SecretId=_session_key_name(tenant_id, user_id, site_key)
    )
    return bytes.fromhex(secret["SecretString"])


def download_and_extract(tenant_id: str, user_id: str, site_key: str) -> str | None:
    """
    Download Chrome profile tarball from S3, decrypt, extract to /tmp.

    Returns the local profile directory path, or None if no profile exists yet.
    """
    s3_key = _s3_key(tenant_id, user_id, site_key)
    local_dir = f"/tmp/chrome/{user_id}/{site_key}"

    try:
        response = _s3.get_object(Bucket=settings.s3_sessions_bucket, Key=s3_key)
        ciphertext = response["Body"].read()
    except _s3.exceptions.NoSuchKey:
        logger.info("no existing session profile for %s/%s/%s", tenant_id, user_id, site_key)
        return None

    key = _get_session_encryption_key(tenant_id, user_id, site_key)
    aesgcm = AESGCM(key)

    # First 12 bytes are the nonce
    nonce, data = ciphertext[:12], ciphertext[12:]
    plaintext = aesgcm.decrypt(nonce, data, None)

    os.makedirs(local_dir, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(plaintext), mode="r:gz") as tar:
        tar.extractall(path=local_dir)

    logger.info("session profile extracted to %s", local_dir)
    return local_dir


def tar_and_upload(tenant_id: str, user_id: str, site_key: str, profile_dir: str) -> None:
    """
    Tar Chrome profile, AES-256-GCM encrypt, upload to S3.
    Overwrites the existing tarball (last known-good becomes this run).
    """
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        tar.add(profile_dir, arcname=".")
    plaintext = buf.getvalue()

    key = _get_session_encryption_key(tenant_id, user_id, site_key)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = nonce + aesgcm.encrypt(nonce, plaintext, None)

    s3_key = _s3_key(tenant_id, user_id, site_key)
    _s3.put_object(
        Bucket=settings.s3_sessions_bucket,
        Key=s3_key,
        Body=ciphertext,
        ServerSideEncryption="aws:kms",
    )
    logger.info("session profile uploaded to s3://%s/%s", settings.s3_sessions_bucket, s3_key)
