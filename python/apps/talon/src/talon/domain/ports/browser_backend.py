from abc import ABC, abstractmethod

from talon.domain.models import StepResult, TaskPayload


class BrowserBackend(ABC):
    """
    Port: browser execution backend.

    Four methods. Switching implementations for a site is a one-line config
    change in main.py — no task lifecycle or permission model changes.
    """

    @abstractmethod
    async def open_session(
        self,
        site_key: str,
        user_data_dir: str,
        proxy: str | None = None,
    ) -> None:
        """Open a browser session scoped to site_key only (allowed_domains enforced)."""

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the current session is still authenticated."""

    @abstractmethod
    async def execute_task(self, payload: TaskPayload) -> list[StepResult]:
        """Execute a pre-approved task. Raises on abort condition or step failure."""

    @abstractmethod
    async def close_session(self) -> None:
        """Close the session and discard all in-memory state."""
