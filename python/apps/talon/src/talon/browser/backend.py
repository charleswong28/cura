"""
BrowserBackend — four-method interface for all browser execution backends.

Switching backends for a site is a one-line config change. No task lifecycle
or permission model changes are required.
"""

from abc import ABC, abstractmethod

from talon.models import StepResult, TaskPayload


class BrowserBackend(ABC):
    """Abstract base for site-specific browser execution backends."""

    @abstractmethod
    async def open_session(
        self,
        site_key: str,
        user_data_dir: str,
        proxy: str | None = None,
    ) -> None:
        """
        Open a browser session scoped to site_key.

        allowed_domains is set to [site_key] subdomains at session creation.
        Off-site navigation raises NavigationBlockedError.
        """

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the current session is still authenticated."""

    @abstractmethod
    async def execute_task(self, payload: TaskPayload) -> list[StepResult]:
        """
        Execute a single pre-approved task payload.

        Streams a StepResult per step. Raises on abort conditions or step failure.
        """

    @abstractmethod
    async def close_session(self) -> None:
        """Close the browser session and discard all in-memory state."""
