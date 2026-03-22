"""
TalonAgentExecutor — application layer.

Receives all dependencies via constructor injection (ports, not adapters).
Zero imports from adapters/, boto3, browser-use, or httpx.
Switching any dependency is a one-line change in main.py.

Eight-step execution sequence (talon-technical-plan.md §10.4):
  1. Parse task_id, site_key, payload from A2A message
  2. DB safety gate — reject if task.status ≠ READY
  3. Claim: READY → CLAIMED; stream "Task claimed"
  4. Download session profile from store (skip login if healthy)
  5. Fetch credential from store (only when full login required)
  6. Open browser session; stream "Session ready"
  7. Execute task; stream one event per step
  8. Upload updated profile; stream completed artifact
"""

import logging

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.types import (
    DataPart,
    Message,
    Part,
    Role,
    TaskArtifactUpdateEvent,
    TaskState,
    TaskStatusUpdateEvent,
)

from talon.domain.models import (
    TaskMessage,
    TaskResult,
    TalonErrorCode,
    TalonTaskStatus,
)
from talon.domain.ports.browser_backend import BrowserBackend
from talon.domain.ports.credential_store import CredentialNotFoundError, CredentialStore
from talon.domain.ports.session_store import SessionStore
from talon.domain.ports.task_repository import TaskRepository

logger = logging.getLogger(__name__)


class TalonAgentExecutor(AgentExecutor):
    def __init__(
        self,
        browser_backend: BrowserBackend,
        credential_store: CredentialStore,
        session_store: SessionStore,
        task_repository: TaskRepository,
    ) -> None:
        self._browser = browser_backend
        self._credentials = credential_store
        self._sessions = session_store
        self._tasks = task_repository

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        # Step 1 — parse message
        msg = self._parse_message(context)
        if msg is None:
            await self._emit_failed(event_queue, "Invalid message format")
            return

        task_id = msg.task_id
        site_key = msg.site_key
        payload = msg.payload
        user_id = context.context_id or ""
        tenant_id = await self._resolve_tenant(user_id)

        # Step 2 — safety gate
        task = await self._tasks.fetch(task_id)
        if task is None or task["status"] != TalonTaskStatus.READY:
            await self._emit_failed(event_queue, "Task is not READY — rejected")
            return

        # Step 3 — claim
        await self._tasks.transition(task_id, TalonTaskStatus.CLAIMED)
        await self._emit_working(event_queue, "Task claimed. Preparing session.")

        profile_dir = f"/tmp/chrome/{user_id}/{site_key}"
        credential = None

        try:
            # Step 4 — session profile
            existing_dir = self._sessions.download(tenant_id, user_id, site_key)
            needs_login = existing_dir is None

            # Step 5 — credential (only when login required)
            if needs_login:
                try:
                    credential = self._credentials.fetch(tenant_id, user_id, site_key, task_id)
                except CredentialNotFoundError as e:
                    await self._tasks.fail(task_id, TalonErrorCode.NO_CREDENTIAL, str(e))
                    await self._emit_failed(event_queue, str(e))
                    return

            # Step 6 — open browser
            proxy = await self._resolve_proxy(user_id)
            await self._browser.open_session(site_key, profile_dir, proxy)

            if needs_login and credential:
                # TODO: site-specific login steps (TALON-018)
                pass

            if not await self._browser.health_check():
                await self._tasks.fail(task_id, TalonErrorCode.SESSION_INVALID, "health check failed")
                await self._emit_failed(event_queue, "Session invalid")
                return

            await self._emit_working(event_queue, "Browser session opened.")

            # Step 7 — execute
            await self._tasks.transition(task_id, TalonTaskStatus.IN_PROGRESS)
            steps = await self._browser.execute_task(payload)

            for step in steps:
                await event_queue.enqueue_event(
                    TaskStatusUpdateEvent(
                        state=TaskState.working,
                        message=Message(
                            role=Role.agent,
                            parts=[
                                Part(
                                    root=DataPart(
                                        type="data",
                                        data={"step": step.step, "description": step.description},
                                    )
                                )
                            ],
                        ),
                    )
                )

        except Exception as e:
            logger.exception("task %s failed", task_id)
            await self._tasks.fail(task_id, TalonErrorCode.STEP_FAILED, str(e))
            await self._emit_failed(event_queue, str(e))
            return
        finally:
            await self._browser.close_session()
            credential = None  # discard from memory

        # Step 8 — persist session, emit completed
        self._sessions.upload(tenant_id, user_id, site_key, profile_dir)
        await self._tasks.transition(task_id, TalonTaskStatus.COMPLETED)

        result = TaskResult(success=True, steps=steps)
        await event_queue.enqueue_event(
            TaskArtifactUpdateEvent(
                artifact={"type": "data", "data": result.model_dump()},
                last_chunk=True,
            )
        )
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(state=TaskState.completed, final=True)
        )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        msg = self._parse_message(context)
        if msg:
            await self._tasks.fail(msg.task_id, TalonErrorCode.CANCELLED, "cancelled by client")

    # ── helpers ──────────────────────────────────────────────────────────────

    def _parse_message(self, context: RequestContext) -> TaskMessage | None:
        try:
            for part in context.message.parts:
                if hasattr(part.root, "data"):
                    return TaskMessage.model_validate(part.root.data)
        except Exception:
            pass
        return None

    async def _resolve_tenant(self, user_id: str) -> str:
        # TODO: resolve tenant from CRM (TALON-015)
        return "default"

    async def _resolve_proxy(self, user_id: str) -> str | None:
        # TODO: fetch from CRM proxy agent config (TALON-056)
        return None

    async def _emit_working(self, event_queue: EventQueue, text: str) -> None:
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                state=TaskState.working,
                message=Message(
                    role=Role.agent,
                    parts=[Part(root=DataPart(type="text", text=text))],
                ),
            )
        )

    async def _emit_failed(self, event_queue: EventQueue, text: str) -> None:
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                state=TaskState.failed,
                message=Message(
                    role=Role.agent,
                    parts=[Part(root=DataPart(type="text", text=text))],
                ),
                final=True,
            )
        )
