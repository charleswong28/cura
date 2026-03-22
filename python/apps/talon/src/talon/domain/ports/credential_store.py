from abc import ABC, abstractmethod

from talon.domain.models import SiteCredential


class CredentialNotFoundError(Exception):
    pass


class CredentialStore(ABC):
    """
    Port: site credential retrieval.

    Implementations decide where credentials live (Secrets Manager, Vault,
    local env for tests, etc.). The application layer never touches the
    storage mechanism directly.
    """

    @abstractmethod
    def fetch(
        self,
        tenant_id: str,
        user_id: str,
        site_key: str,
        task_id: str,
    ) -> SiteCredential:
        """
        Return the credential for (tenant, user, site).

        Raises CredentialNotFoundError if absent.
        Logs the fetch event — never logs credential values.
        """
