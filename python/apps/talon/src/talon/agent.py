"""
TalonAgentExecutor — A2A AgentExecutor implementation.

Implements the eight-step execution sequence from talon-technical-plan.md §10.4:
  1. Extract task_id, site_key, payload from A2A message
  2. DB check: reject if task.status ≠ READY (safety gate)
  3. Claim: READY → CLAIMED atomically; stream "Task claimed" event
  4. Fetch session state from S3 (decrypt); if valid, skip login
  5. Fetch credential from vault (only if full login required)
  6. Open BrowserBackend session; stream "Session ready" event
  7. Execute task via backend; stream a progress event per step
  8. On completion: export browser state → encrypt → upload S3; stream completed
"""

import logging
from typing import AsyncIterator

import httpx
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

from talon.browser.browser_use_backend import BrowserUseBackend
from talon.config import settings
from talon.credentials.vault import CredentialNotFoundError, fetch_credential
from talon.models import TaskMessage, TaskResult, TalonErrorCode, TalonTaskStatus
from talon.session.persistence import download_and_extract, tar_and_upload

logger = logging.getLogger(__name__)


class TalonAgentExecutor(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        # Step 1: extract message data
        msg = self._parse_message(context)
        if msg is None:
            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    state=TaskState.failed,
                    message=Message(
                        role=Role.agent,
                        parts=[Part(root=DataPart(type="text", text="Invalid message format"))],
                    ),
                    final=True,
                )
            )
            return

        task_id = msg.task_id
        site_key = msg.site_key
        payload = msg.payload

        # context_id is the userId (from §10.3)
        user_id = context.context_id or ""
        tenant_id = await self._resolve_tenant(user_id)

        # Step 2: DB safety gate — task must be READY
        task = await self._fetch_task(task_id)
        if task is None or task["status"] != TalonTaskStatus.READY:
            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    state=TaskState.failed,
                    message=Message(
                        role=Role.agent,
                        parts=[Part(root=DataPart(type="text", text="Task is not READY — rejected"))],
                    ),
                    final=True,
                )
            )
            return

        # Step 3: claim
        await self._transition_task(task_id, "CLAIMED")
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                state=TaskState.working,
                message=Message(
                    role=Role.agent,
                    parts=[Part(root=DataPart(type="text", text="Task claimed. Preparing session."))],
                ),
            )
        )

        backend = BrowserUseBackend()
        profile_dir = f"/tmp/chrome/{user_id}/{site_key}"

        try:
            # Step 4: fetch session state from S3
            existing_dir = download_and_extract(tenant_id, user_id, site_key)
            needs_login = existing_dir is None

            # Step 5: fetch credential only if login required
            credential = None
            if needs_login:
                try:
                    credential = fetch_credential(tenant_id, user_id, site_key, task_id)
                except CredentialNotFoundError as e:
                    await self._fail_task(task_id, TalonErrorCode.NO_CREDENTIAL, str(e))
                    await event_queue.enqueue_event(
                        TaskStatusUpdateEvent(
                            state=TaskState.failed,
                            message=Message(
                                role=Role.agent,
                                parts=[Part(root=DataPart(type="text", text=str(e)))],
                            ),
                            final=True,
                        )
                    )
                    return

            # Step 6: open browser session
            proxy = await self._get_proxy(user_id)
            await backend.open_session(site_key, profile_dir, proxy)

            if needs_login and credential:
                # TODO: implement login steps (TALON-018)
                pass

            healthy = await backend.health_check()
            if not healthy:
                await self._fail_task(task_id, TalonErrorCode.SESSION_INVALID, "health check failed")
                await event_queue.enqueue_event(
                    TaskStatusUpdateEvent(
                        state=TaskState.failed,
                        message=Message(
                            role=Role.agent,
                            parts=[Part(root=DataPart(type="text", text="Session invalid"))],
                        ),
                        final=True,
                    )
                )
                return

            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    state=TaskState.working,
                    message=Message(
                        role=Role.agent,
                        parts=[Part(root=DataPart(type="text", text="Browser session opened."))],
                    ),
                )
            )

            # Step 7: execute task, stream step events
            await self._transition_task(task_id, "IN_PROGRESS")
            steps = await backend.execute_task(payload)

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
            logger.exception("task %s failed: %s", task_id, e)
            await self._fail_task(task_id, TalonErrorCode.STEP_FAILED, str(e))
            await event_queue.enqueue_event(
                TaskStatusUpdateEvent(
                    state=TaskState.failed,
                    message=Message(
                        role=Role.agent,
                        parts=[Part(root=DataPart(type="text", text=str(e)))],
                    ),
                    final=True,
                )
            )
            return
        finally:
            await backend.close_session()
            # Discard credential from memory
            credential = None

        # Step 8: upload updated session state, emit completed
        tar_and_upload(tenant_id, user_id, site_key, profile_dir)
        await self._transition_task(task_id, "COMPLETED")

        result = TaskResult(success=True, steps=steps)
        await event_queue.enqueue_event(
            TaskArtifactUpdateEvent(
                artifact={
                    "type": "data",
                    "data": result.model_dump(),
                },
                last_chunk=True,
            )
        )
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                state=TaskState.completed,
                final=True,
            )
        )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        msg = self._parse_message(context)
        if msg:
            await self._fail_task(msg.task_id, TalonErrorCode.CANCELLED, "cancelled by client")

    # ── helpers ──────────────────────────────────────────────────────────────

    def _parse_message(self, context: RequestContext) -> TaskMessage | None:
        try:
            for part in context.message.parts:
                if hasattr(part.root, "data"):
                    data = part.root.data
                    return TaskMessage.model_validate(data)
        except Exception:
            pass
        return None

    async def _fetch_task(self, task_id: str) -> dict | None:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{settings.crm_api_url}/talon/tasks/{task_id}",
                headers={"Authorization": f"Bearer {settings.runner_token}"},
                timeout=10,
            )
            if r.status_code == 200:
                return r.json()
        return None

    async def _transition_task(self, task_id: str, status: str) -> None:
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{settings.crm_api_url}/talon/tasks/{task_id}/status",
                json={"status": status},
                headers={"Authorization": f"Bearer {settings.runner_token}"},
                timeout=10,
            )

    async def _fail_task(self, task_id: str, error_code: TalonErrorCode, message: str) -> None:
        async with httpx.AsyncClient() as client:
            await client.patch(
                f"{settings.crm_api_url}/talon/tasks/{task_id}/status",
                json={"status": "FAILED", "errorCode": error_code, "errorMessage": message},
                headers={"Authorization": f"Bearer {settings.runner_token}"},
                timeout=10,
            )

    async def _resolve_tenant(self, user_id: str) -> str:
        # TODO: resolve tenant from CRM (TALON-015)
        return "default"

    async def _get_proxy(self, user_id: str) -> str | None:
        # TODO: fetch from CRM proxy agent config (TALON-022)
        return None
