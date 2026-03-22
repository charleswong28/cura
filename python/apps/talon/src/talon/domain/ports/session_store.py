from abc import ABC, abstractmethod


class SessionStore(ABC):
    """
    Port: browser session persistence.

    Implementations decide how Chrome profiles are stored and encrypted
    (S3 + AES-256-GCM, local disk for tests, in-memory for unit tests, etc.).
    The application layer only sees download/upload — no storage details.
    """

    @abstractmethod
    def download(self, tenant_id: str, user_id: str, site_key: str) -> str | None:
        """
        Retrieve and extract a Chrome profile for (tenant, user, site).

        Returns the local profile directory path, or None if no profile exists.
        """

    @abstractmethod
    def upload(self, tenant_id: str, user_id: str, site_key: str, profile_dir: str) -> None:
        """
        Persist the updated Chrome profile for (tenant, user, site).

        Overwrites the previous version. Called after every successful task batch.
        """
