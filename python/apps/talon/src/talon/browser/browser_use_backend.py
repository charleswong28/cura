"""
browser-use backend — LLM + CDP, external process.

browser-use controls Chrome via CDP from an external Python process.
It never touches page internals (no in-page JS injection).
The LLM adapts to DOM changes without selector maintenance.
"""

import logging

from browser_use import Agent, BrowserConfig, BrowserProfile, ProxySettings

from talon.browser.backend import BrowserBackend
from talon.models import StepResult, TaskPayload

logger = logging.getLogger(__name__)


class NavigationBlockedError(Exception):
    pass


class BrowserUseBackend(BrowserBackend):
    def __init__(self) -> None:
        self._agent: Agent | None = None
        self._site_key: str | None = None

    async def open_session(
        self,
        site_key: str,
        user_data_dir: str,
        proxy: str | None = None,
    ) -> None:
        self._site_key = site_key
        proxy_settings = ProxySettings(server=proxy) if proxy else None

        profile = BrowserProfile(
            user_data_dir=user_data_dir,
            proxy=proxy_settings,
            allowed_domains=[site_key, f"*.{site_key}"],
        )
        self._config = BrowserConfig(
            headless=True,
            profile=profile,
        )
        logger.info("browser session opened for %s", site_key)

    async def health_check(self) -> bool:
        # TODO: implement site-specific session health check
        # For now return True; full implementation in TALON-019
        return True

    async def execute_task(self, payload: TaskPayload) -> list[StepResult]:
        if self._agent is None:
            self._agent = Agent(
                task=payload.prompt,
                browser_config=self._config,
                max_actions=payload.max_steps,
            )

        results: list[StepResult] = []
        step_num = 0

        async for step in self._agent.run():
            step_num += 1
            result = StepResult(
                step=step_num,
                description=str(step),
                success=True,
            )
            results.append(result)
            logger.info("step %d completed: %s", step_num, step)

        return results

    async def close_session(self) -> None:
        if self._agent:
            await self._agent.close()
            self._agent = None
        logger.info("browser session closed for %s", self._site_key)
        self._site_key = None
