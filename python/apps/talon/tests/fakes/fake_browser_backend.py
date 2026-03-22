"""
In-memory BrowserBackend for unit tests.

Configurable: inject steps to return, toggle health_check result,
and record which calls were made.
"""

from talon.domain.models import StepResult, TaskPayload
from talon.domain.ports.browser_backend import BrowserBackend


class FakeBrowserBackend(BrowserBackend):
    def __init__(
        self,
        steps: list[StepResult] | None = None,
        healthy: bool = True,
    ) -> None:
        self._steps = steps or [StepResult(step=1, description="fake step", success=True)]
        self._healthy = healthy
        self.opened = False
        self.closed = False
        self.last_site_key: str | None = None
        self.last_proxy: str | None = None

    async def open_session(self, site_key: str, user_data_dir: str, proxy: str | None = None) -> None:
        self.opened = True
        self.last_site_key = site_key
        self.last_proxy = proxy

    async def health_check(self) -> bool:
        return self._healthy

    async def execute_task(self, payload: TaskPayload) -> list[StepResult]:
        return self._steps

    async def close_session(self) -> None:
        self.closed = True
