"""
In-memory TaskRepository for unit tests.

Stores task state in a plain dict. Raises on unexpected task IDs so tests
fail loudly rather than silently passing with None.
"""

from talon.domain.models import TalonErrorCode, TalonTaskStatus
from talon.domain.ports.task_repository import TaskRepository


class FakeTaskRepository(TaskRepository):
    def __init__(self, tasks: dict[str, dict] | None = None) -> None:
        self._tasks: dict[str, dict] = tasks or {}
        self.transitions: list[tuple[str, str]] = []  # (task_id, status) history

    def seed(self, task_id: str, status: TalonTaskStatus) -> None:
        self._tasks[task_id] = {"id": task_id, "status": status}

    async def fetch(self, task_id: str) -> dict | None:
        return self._tasks.get(task_id)

    async def transition(self, task_id: str, status: TalonTaskStatus) -> None:
        assert task_id in self._tasks, f"unknown task_id {task_id}"
        self._tasks[task_id]["status"] = status
        self.transitions.append((task_id, status))

    async def fail(self, task_id: str, error_code: TalonErrorCode, message: str) -> None:
        assert task_id in self._tasks, f"unknown task_id {task_id}"
        self._tasks[task_id].update(
            {"status": TalonTaskStatus.FAILED, "errorCode": error_code, "errorMessage": message}
        )
        self.transitions.append((task_id, TalonTaskStatus.FAILED))
