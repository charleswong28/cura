"""
Talon — A2A Server entry point.

Publishes the agent card at /.well-known/agent.json.
Handles A2A task execution on port 8001.
"""

import logging

import uvicorn
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import (
    AgentCapabilities,
    AgentCard,
    AgentSkill,
)

from talon.agent import TalonAgentExecutor
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
    request_handler = DefaultRequestHandler(
        agent_executor=TalonAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )
    return A2AStarletteApplication(
        agent_card=AGENT_CARD,
        http_handler=request_handler,
    )


def main() -> None:
    app = build_app()
    logger.info("Talon A2A server starting on %s:%s", settings.host, settings.port)
    uvicorn.run(app.build(), host=settings.host, port=settings.port, log_level=settings.log_level)


if __name__ == "__main__":
    main()
