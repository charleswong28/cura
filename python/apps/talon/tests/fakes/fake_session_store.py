"""
In-memory SessionStore for unit tests.

Tracks download/upload calls. Returns a pre-configured profile dir
or None to simulate a first-run (no existing session).
"""

from talon.domain.ports.session_store import SessionStore


class FakeSessionStore(SessionStore):
    def __init__(self, existing_profile_dir: str | None = "/tmp/fake-profile") -> None:
        """
        existing_profile_dir: value returned by download().
          None  → simulates first run (no session in store)
          str   → simulates an existing session
        """
        self._existing = existing_profile_dir
        self.downloads: list[dict] = []
        self.uploads: list[dict] = []

    def download(self, tenant_id: str, user_id: str, site_key: str) -> str | None:
        self.downloads.append(
            {"tenant_id": tenant_id, "user_id": user_id, "site_key": site_key}
        )
        return self._existing

    def upload(self, tenant_id: str, user_id: str, site_key: str, profile_dir: str) -> None:
        self.uploads.append(
            {"tenant_id": tenant_id, "user_id": user_id, "site_key": site_key, "profile_dir": profile_dir}
        )
