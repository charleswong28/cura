"""
Executor unit tests — one test per execution path.

All external dependencies are replaced by fakes. No network, no AWS, no browser.
"""

import pytest
from a2a.server.events import EventQueue
from a2a.types import TaskArtifactUpdateEvent, TaskState, TaskStatusUpdateEvent

from talon.application.executor import TalonAgentExecutor
from talon.domain.models import StepResult, TalonErrorCode, TalonTaskStatus
from tests.fakes.fake_browser_backend import FakeBrowserBackend
from tests.fakes.fake_credential_store import FakeCredentialStore
from tests.fakes.fake_session_store import FakeSessionStore
from tests.fakes.fake_task_repository import FakeTaskRepository
from tests.unit.conftest import SITE_KEY, TASK_ID, TENANT_ID, USER_ID, collect_events, make_context


# ── happy path ────────────────────────────────────────────────────────────────


async def test_happy_path_completes_task(
    executor: TalonAgentExecutor,
    task_repo: FakeTaskRepository,
    session_store: FakeSessionStore,
    browser: FakeBrowserBackend,
) -> None:
    """Full flow: READY → CLAIMED → IN_PROGRESS → COMPLETED, profile uploaded."""
    q = EventQueue()
    await executor.execute(make_context(), q)

    # Task transitions: CLAIMED → IN_PROGRESS → COMPLETED
    statuses = [s for _, s in task_repo.transitions]
    assert TalonTaskStatus.CLAIMED in statuses
    assert TalonTaskStatus.IN_PROGRESS in statuses
    assert TalonTaskStatus.COMPLETED in statuses

    # Session was uploaded after execution
    assert len(session_store.uploads) == 1
    assert session_store.uploads[0]["site_key"] == SITE_KEY

    # Browser was opened and closed
    assert browser.opened
    assert browser.closed
    assert browser.last_site_key == SITE_KEY

    # Final event is completed
    events = await collect_events(q)
    final = events[-1]
    assert isinstance(final, TaskStatusUpdateEvent)
    assert final.status.state == TaskState.completed
    assert final.final is True


async def test_happy_path_emits_artifact(
    executor: TalonAgentExecutor,
) -> None:
    """Completed task emits a TaskArtifactUpdateEvent with result data."""
    q = EventQueue()
    await executor.execute(make_context(), q)

    events = await collect_events(q)
    artifact_events = [e for e in events if isinstance(e, TaskArtifactUpdateEvent)]
    assert len(artifact_events) == 1
    result_data = artifact_events[0].artifact.parts[0].root.data
    assert result_data["success"] is True
    assert isinstance(result_data["steps"], list)


async def test_happy_path_no_credential_fetch_when_session_exists(
    executor: TalonAgentExecutor,
    credential_store: FakeCredentialStore,
    session_store: FakeSessionStore,
) -> None:
    """When a session profile already exists, credentials are never fetched."""
    # FakeSessionStore returns existing_profile_dir by default
    q = EventQueue()
    await executor.execute(make_context(), q)

    assert len(credential_store.fetch_calls) == 0


async def test_happy_path_fetches_credential_on_first_run(
    browser: FakeBrowserBackend,
    credential_store: FakeCredentialStore,
    task_repo: FakeTaskRepository,
) -> None:
    """No existing session → credential is fetched for login."""
    executor = TalonAgentExecutor(
        browser_backend=browser,
        credential_store=credential_store,
        session_store=FakeSessionStore(existing_profile_dir=None),  # first run
        task_repository=task_repo,
    )
    q = EventQueue()
    await executor.execute(make_context(), q)

    assert len(credential_store.fetch_calls) == 1
    assert credential_store.fetch_calls[0]["task_id"] == TASK_ID


# ── safety gate ───────────────────────────────────────────────────────────────


async def test_rejects_non_ready_task(
    executor: TalonAgentExecutor,
    task_repo: FakeTaskRepository,
    browser: FakeBrowserBackend,
) -> None:
    """A task not in READY status must be rejected before any browser action."""
    task_repo.seed(TASK_ID, TalonTaskStatus.PENDING_APPROVAL)

    q = EventQueue()
    await executor.execute(make_context(), q)

    # No browser session opened
    assert not browser.opened

    # Final event is failed
    events = await collect_events(q)
    assert events[-1].status.state == TaskState.failed
    assert events[-1].final is True


async def test_rejects_unknown_task(
    executor: TalonAgentExecutor,
    browser: FakeBrowserBackend,
) -> None:
    """A task_id not in the repository is rejected."""
    q = EventQueue()
    await executor.execute(make_context(task_id="nonexistent"), q)

    assert not browser.opened
    events = await collect_events(q)
    assert events[-1].status.state == TaskState.failed


async def test_rejects_completed_task(
    executor: TalonAgentExecutor,
    task_repo: FakeTaskRepository,
    browser: FakeBrowserBackend,
) -> None:
    """A terminal COMPLETED task cannot be re-executed."""
    task_repo.seed(TASK_ID, TalonTaskStatus.COMPLETED)

    q = EventQueue()
    await executor.execute(make_context(), q)

    assert not browser.opened


# ── credential failure ────────────────────────────────────────────────────────


async def test_no_credential_fails_task(
    browser: FakeBrowserBackend,
    task_repo: FakeTaskRepository,
) -> None:
    """Missing credential on first run → FAILED(NO_CREDENTIAL), no browser opened."""
    executor = TalonAgentExecutor(
        browser_backend=browser,
        credential_store=FakeCredentialStore(),  # nothing seeded
        session_store=FakeSessionStore(existing_profile_dir=None),
        task_repository=task_repo,
    )
    q = EventQueue()
    await executor.execute(make_context(), q)

    assert not browser.opened

    task = await task_repo.fetch(TASK_ID)
    assert task["status"] == TalonTaskStatus.FAILED
    assert task["errorCode"] == TalonErrorCode.NO_CREDENTIAL


# ── session invalid ───────────────────────────────────────────────────────────


async def test_unhealthy_session_fails_task(
    credential_store: FakeCredentialStore,
    session_store: FakeSessionStore,
    task_repo: FakeTaskRepository,
) -> None:
    """health_check() returning False → FAILED(SESSION_INVALID)."""
    executor = TalonAgentExecutor(
        browser_backend=FakeBrowserBackend(healthy=False),
        credential_store=credential_store,
        session_store=session_store,
        task_repository=task_repo,
    )
    q = EventQueue()
    await executor.execute(make_context(), q)

    task = await task_repo.fetch(TASK_ID)
    assert task["status"] == TalonTaskStatus.FAILED
    assert task["errorCode"] == TalonErrorCode.SESSION_INVALID


# ── step failure ──────────────────────────────────────────────────────────────


async def test_execute_task_exception_fails_task(
    credential_store: FakeCredentialStore,
    session_store: FakeSessionStore,
    task_repo: FakeTaskRepository,
) -> None:
    """Unhandled exception during execute_task → FAILED(STEP_FAILED), browser closed."""

    class ExplodingBackend(FakeBrowserBackend):
        async def execute_task(self, payload):  # type: ignore[override]
            raise RuntimeError("selector not found")

    executor = TalonAgentExecutor(
        browser_backend=ExplodingBackend(),
        credential_store=credential_store,
        session_store=session_store,
        task_repository=task_repo,
    )
    q = EventQueue()
    await executor.execute(make_context(), q)

    task = await task_repo.fetch(TASK_ID)
    assert task["status"] == TalonTaskStatus.FAILED
    assert task["errorCode"] == TalonErrorCode.STEP_FAILED
    assert "selector not found" in task["errorMessage"]


async def test_browser_always_closed_on_failure(
    session_store: FakeSessionStore,
    task_repo: FakeTaskRepository,
) -> None:
    """Browser.close_session() is called even when execute_task raises."""

    class ExplodingBackend(FakeBrowserBackend):
        async def execute_task(self, payload):  # type: ignore[override]
            raise RuntimeError("boom")

    backend = ExplodingBackend()
    executor = TalonAgentExecutor(
        browser_backend=backend,
        credential_store=FakeCredentialStore(),
        session_store=session_store,
        task_repository=task_repo,
    )
    q = EventQueue()
    await executor.execute(make_context(), q)

    assert backend.closed


# ── cancel ────────────────────────────────────────────────────────────────────


async def test_cancel_marks_task_failed_cancelled(
    executor: TalonAgentExecutor,
    task_repo: FakeTaskRepository,
) -> None:
    q = EventQueue()
    await executor.cancel(make_context(), q)

    task = await task_repo.fetch(TASK_ID)
    assert task["errorCode"] == TalonErrorCode.CANCELLED


# ── invalid message ───────────────────────────────────────────────────────────


async def test_invalid_message_emits_failed_event(
    executor: TalonAgentExecutor,
    browser: FakeBrowserBackend,
) -> None:
    """Malformed message → failed event, no DB write, no browser."""
    import uuid
    from a2a.server.agent_execution import RequestContext
    from a2a.types import Message, MessageSendParams, Part, TextPart, Role

    bad_msg = Message(
        role=Role.user,
        message_id=str(uuid.uuid4()),
        parts=[Part(root=TextPart(type="text", text="not a task message"))],
    )
    ctx = RequestContext(
        request=MessageSendParams(message=bad_msg),
        task_id="bad-task",
        context_id=USER_ID,
    )
    q = EventQueue()
    await executor.execute(ctx, q)

    assert not browser.opened
    events = await collect_events(q)
    assert events[-1].status.state == TaskState.failed


# ── session upload skipped on failure ─────────────────────────────────────────


async def test_session_not_uploaded_on_step_failure(
    session_store: FakeSessionStore,
    task_repo: FakeTaskRepository,
) -> None:
    """Profile must not be uploaded if execution fails (avoid overwriting good state)."""

    class ExplodingBackend(FakeBrowserBackend):
        async def execute_task(self, payload):  # type: ignore[override]
            raise RuntimeError("boom")

    executor = TalonAgentExecutor(
        browser_backend=ExplodingBackend(),
        credential_store=FakeCredentialStore(),
        session_store=session_store,
        task_repository=task_repo,
    )
    q = EventQueue()
    await executor.execute(make_context(), q)

    assert len(session_store.uploads) == 0


# ── multiple steps streamed ───────────────────────────────────────────────────


async def test_multiple_steps_emit_working_events(
    credential_store: FakeCredentialStore,
    session_store: FakeSessionStore,
    task_repo: FakeTaskRepository,
) -> None:
    """Each step returned by the backend emits one working status event."""
    steps = [
        StepResult(step=1, description="navigated to profile", success=True),
        StepResult(step=2, description="clicked connect", success=True),
        StepResult(step=3, description="sent note", success=True),
    ]
    executor = TalonAgentExecutor(
        browser_backend=FakeBrowserBackend(steps=steps),
        credential_store=credential_store,
        session_store=session_store,
        task_repository=task_repo,
    )
    q = EventQueue()
    await executor.execute(make_context(), q)

    events = await collect_events(q)
    working = [
        e for e in events
        if isinstance(e, TaskStatusUpdateEvent) and e.status.state == TaskState.working
    ]
    # claim event + session ready + one per step = 2 + 3 = 5
    assert len(working) == 5
