"""
Talon — wiring point.

This is the only file that knows about concrete adapters.
To swap a dependency, change one line here — nothing else changes.
"""

import logging

import uvicorn
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill

from talon.adapters.browser.browser_use_backend import BrowserUseBackend
from talon.adapters.credentials.secrets_manager_store import SecretsManagerCredentialStore
from talon.adapters.session.s3_session_store import S3SessionStore
from talon.adapters.task_repository.http_task_repository import HttpTaskRepository
from talon.application.executor import TalonAgentExecutor
from talon.config import settings

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)

AGENT_CARD = AgentCard(
    name="talon",
    description=(
        "Deterministic browser task executor for Cura. "
        "Executes pre-approved browser tasks against specific sites. "
        "One site per session. Human approval required before any task reaches this agent."
    ),
    url=f"http://{settings.host}:{settings.port}",
    version="1.0.0",
    capabilities=AgentCapabilities(streaming=True, push_notifications=False),
    skills=[
        AgentSkill(
            id="execute_browser_task",
            name="Execute Browser Task",
            description=(
                "Execute a single pre-approved browser action. "
                "task_id must be READY in the Cura DB. "
                "Streams step-level progress. Returns result artifact."
            ),
            tags=["browser", "automation", "recruitment"],
            input_modes=["application/json"],
            output_modes=["application/json"],
        )
    ],
)


def build_app() -> A2AStarletteApplication:
    executor = TalonAgentExecutor(
        browser_backend=BrowserUseBackend(headless=settings.headless),
        credential_store=SecretsManagerCredentialStore(
            region=settings.aws_region,
            prefix=settings.secrets_manager_prefix,
        ),
        session_store=S3SessionStore(
            region=settings.aws_region,
            bucket=settings.s3_sessions_bucket,
            secrets_prefix=settings.secrets_manager_prefix,
        ),
        task_repository=HttpTaskRepository(
            base_url=settings.crm_api_url,
            runner_token=settings.runner_token,
        ),
    )
    request_handler = DefaultRequestHandler(
        agent_executor=executor,
        task_store=InMemoryTaskStore(),
    )
    return A2AStarletteApplication(agent_card=AGENT_CARD, http_handler=request_handler)


def main() -> None:
    app = build_app()
    logger.info("Talon A2A server starting on %s:%s", settings.host, settings.port)
    uvicorn.run(app.build(), host=settings.host, port=settings.port, log_level=settings.log_level)


if __name__ == "__main__":
    main()
