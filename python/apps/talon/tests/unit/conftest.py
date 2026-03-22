"""Shared fixtures for executor unit tests."""

import uuid

import pytest
from a2a.server.events import EventQueue
from a2a.server.agent_execution import RequestContext
from a2a.types import Message, MessageSendParams, Part, DataPart, Role

from talon.application.executor import TalonAgentExecutor
from talon.domain.models import TalonTaskStatus
from tests.fakes.fake_browser_backend import FakeBrowserBackend
from tests.fakes.fake_credential_store import FakeCredentialStore
from tests.fakes.fake_session_store import FakeSessionStore
from tests.fakes.fake_task_repository import FakeTaskRepository

TASK_ID = "01HXTEST0000000000000001"
USER_ID = "user-abc"
TENANT_ID = "default"
SITE_KEY = "linkedin.com"


def make_context(
    task_id: str = TASK_ID,
    user_id: str = USER_ID,
    site_key: str = SITE_KEY,
    payload: dict | None = None,
) -> RequestContext:
    data = {
        "task_id": task_id,
        "site_key": site_key,
        "payload": payload or {"prompt": "send connection request", "max_steps": 5, "abort_conditions": []},
    }
    msg = Message(
        role=Role.user,
        message_id=str(uuid.uuid4()),
        parts=[Part(root=DataPart(type="data", data=data))],
    )
    return RequestContext(
        request=MessageSendParams(message=msg),
        task_id=task_id,
        context_id=user_id,
    )


@pytest.fixture
def task_repo() -> FakeTaskRepository:
    repo = FakeTaskRepository()
    repo.seed(TASK_ID, TalonTaskStatus.READY)
    return repo


@pytest.fixture
def credential_store() -> FakeCredentialStore:
    store = FakeCredentialStore()
    store.seed(TENANT_ID, USER_ID, SITE_KEY)
    return store


@pytest.fixture
def session_store() -> FakeSessionStore:
    # existing profile → no login required
    return FakeSessionStore(existing_profile_dir="/tmp/fake-profile")


@pytest.fixture
def browser() -> FakeBrowserBackend:
    return FakeBrowserBackend()


@pytest.fixture
def executor(
    browser: FakeBrowserBackend,
    credential_store: FakeCredentialStore,
    session_store: FakeSessionStore,
    task_repo: FakeTaskRepository,
) -> TalonAgentExecutor:
    return TalonAgentExecutor(
        browser_backend=browser,
        credential_store=credential_store,
        session_store=session_store,
        task_repository=task_repo,
    )


async def collect_events(event_queue: EventQueue) -> list:
    """Drain all events from the queue into a list."""
    events = []
    while True:
        try:
            event = event_queue.queue.get_nowait()
            events.append(event)
        except Exception:
            break
    return events
