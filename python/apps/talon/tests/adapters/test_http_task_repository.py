"""
HttpTaskRepository adapter tests — respx mocks httpx, no real network calls.

Tests cover:
- fetch: 200 returns dict, 404 returns None
- transition: PATCH is sent with correct body
- fail: PATCH is sent with errorCode and errorMessage
- Authorization header is always set with runner token
"""

import pytest
import respx
import httpx

from talon.adapters.task_repository.http_task_repository import HttpTaskRepository
from talon.domain.models import TalonErrorCode, TalonTaskStatus

BASE_URL = "http://api:8000"
TOKEN = "test-runner-token"
TASK_ID = "01HXTEST0000000000000001"


@pytest.fixture
def repo() -> HttpTaskRepository:
    return HttpTaskRepository(base_url=BASE_URL, runner_token=TOKEN)


@respx.mock
async def test_fetch_returns_task_on_200(repo: HttpTaskRepository) -> None:
    task_data = {"id": TASK_ID, "status": "READY", "siteKey": "linkedin.com"}
    respx.get(f"{BASE_URL}/talon/tasks/{TASK_ID}").mock(
        return_value=httpx.Response(200, json=task_data)
    )

    result = await repo.fetch(TASK_ID)

    assert result == task_data


@respx.mock
async def test_fetch_returns_none_on_404(repo: HttpTaskRepository) -> None:
    respx.get(f"{BASE_URL}/talon/tasks/{TASK_ID}").mock(
        return_value=httpx.Response(404)
    )

    result = await repo.fetch(TASK_ID)

    assert result is None


@respx.mock
async def test_fetch_returns_none_on_500(repo: HttpTaskRepository) -> None:
    respx.get(f"{BASE_URL}/talon/tasks/{TASK_ID}").mock(
        return_value=httpx.Response(500)
    )

    result = await repo.fetch(TASK_ID)

    assert result is None


@respx.mock
async def test_fetch_sends_bearer_token(repo: HttpTaskRepository) -> None:
    route = respx.get(f"{BASE_URL}/talon/tasks/{TASK_ID}").mock(
        return_value=httpx.Response(200, json={"id": TASK_ID, "status": "READY"})
    )

    await repo.fetch(TASK_ID)

    assert route.called
    request = route.calls.last.request
    assert request.headers["Authorization"] == f"Bearer {TOKEN}"


@respx.mock
async def test_transition_sends_patch_with_status(repo: HttpTaskRepository) -> None:
    route = respx.patch(f"{BASE_URL}/talon/tasks/{TASK_ID}/status").mock(
        return_value=httpx.Response(200)
    )

    await repo.transition(TASK_ID, TalonTaskStatus.CLAIMED)

    assert route.called
    body = httpx.Request(
        "PATCH",
        f"{BASE_URL}/talon/tasks/{TASK_ID}/status",
        content=route.calls.last.request.content,
    )
    import json
    payload = json.loads(route.calls.last.request.content)
    assert payload["status"] == "CLAIMED"


@respx.mock
async def test_fail_sends_error_code_and_message(repo: HttpTaskRepository) -> None:
    route = respx.patch(f"{BASE_URL}/talon/tasks/{TASK_ID}/status").mock(
        return_value=httpx.Response(200)
    )

    await repo.fail(TASK_ID, TalonErrorCode.NO_CREDENTIAL, "no credential for linkedin.com/user-abc")

    import json
    payload = json.loads(route.calls.last.request.content)
    assert payload["status"] == "FAILED"
    assert payload["errorCode"] == "NO_CREDENTIAL"
    assert "linkedin.com" in payload["errorMessage"]


@respx.mock
async def test_all_requests_include_bearer_token(repo: HttpTaskRepository) -> None:
    patch_route = respx.patch(f"{BASE_URL}/talon/tasks/{TASK_ID}/status").mock(
        return_value=httpx.Response(200)
    )

    await repo.transition(TASK_ID, TalonTaskStatus.IN_PROGRESS)
    await repo.fail(TASK_ID, TalonErrorCode.STEP_FAILED, "boom")

    for call in patch_route.calls:
        assert call.request.headers["Authorization"] == f"Bearer {TOKEN}"
