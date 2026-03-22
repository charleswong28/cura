from abc import ABC, abstractmethod

from talon.domain.models import TalonErrorCode, TalonTaskStatus


class TaskRepository(ABC):
    """
    Port: task state machine access.

    Implementations decide the transport (HTTP to CRM API, direct DB for tests,
    in-memory for unit tests, etc.). The application layer only sees fetch/transition.
    """

    @abstractmethod
    async def fetch(self, task_id: str) -> dict | None:
        """Return the task record, or None if not found."""

    @abstractmethod
    async def transition(self, task_id: str, status: TalonTaskStatus) -> None:
        """Transition the task to the given status."""

    @abstractmethod
    async def fail(
        self,
        task_id: str,
        error_code: TalonErrorCode,
        message: str,
    ) -> None:
        """Transition the task to FAILED with an error code and message."""
