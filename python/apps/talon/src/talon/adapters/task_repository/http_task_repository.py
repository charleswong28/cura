"""
Adapter: HTTP task repository.

Talks to the CRM API over HTTP using a runner-scoped bearer token.
The runner token has no task-create or task-approve access (talon-technical-plan.md §2).
"""

import logging

import httpx

from talon.domain.models import TalonErrorCode, TalonTaskStatus
from talon.domain.ports.task_repository import TaskRepository

logger = logging.getLogger(__name__)


class HttpTaskRepository(TaskRepository):
    def __init__(self, base_url: str, runner_token: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {runner_token}"}

    async def fetch(self, task_id: str) -> dict | None:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{self._base_url}/talon/tasks/{task_id}",
                headers=self._headers,
                timeout=10,
            )
            if r.status_code == 200:
                return r.json()
            logger.warning("fetch task %s returned %s", task_id, r.status_code)
            return None

    async def transition(self, task_id: str, status: TalonTaskStatus) -> None:
        async with httpx.AsyncClient() as client:
            r = await client.patch(
                f"{self._base_url}/talon/tasks/{task_id}/status",
                json={"status": status},
                headers=self._headers,
                timeout=10,
            )
            r.raise_for_status()

    async def fail(self, task_id: str, error_code: TalonErrorCode, message: str) -> None:
        async with httpx.AsyncClient() as client:
            r = await client.patch(
                f"{self._base_url}/talon/tasks/{task_id}/status",
                json={"status": "FAILED", "errorCode": error_code, "errorMessage": message},
                headers=self._headers,
                timeout=10,
            )
            r.raise_for_status()
