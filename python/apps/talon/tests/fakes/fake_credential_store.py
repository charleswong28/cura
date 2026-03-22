"""
In-memory CredentialStore for unit tests.

Seed credentials by (tenant_id, user_id, site_key). Raises
CredentialNotFoundError for anything not seeded.
"""

from talon.domain.models import SiteCredential
from talon.domain.ports.credential_store import CredentialNotFoundError, CredentialStore


class FakeCredentialStore(CredentialStore):
    def __init__(self) -> None:
        self._store: dict[tuple[str, str, str], SiteCredential] = {}
        self.fetch_calls: list[dict] = []

    def seed(
        self,
        tenant_id: str,
        user_id: str,
        site_key: str,
        username: str = "user@example.com",
        password: str = "s3cr3t",
    ) -> None:
        self._store[(tenant_id, user_id, site_key)] = SiteCredential(
            username=username, password=password
        )

    def fetch(self, tenant_id: str, user_id: str, site_key: str, task_id: str) -> SiteCredential:
        self.fetch_calls.append(
            {"tenant_id": tenant_id, "user_id": user_id, "site_key": site_key, "task_id": task_id}
        )
        key = (tenant_id, user_id, site_key)
        if key not in self._store:
            raise CredentialNotFoundError(f"no credential for {site_key}/{user_id}")
        return self._store[key]
