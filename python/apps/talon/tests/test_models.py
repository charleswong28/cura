from talon.domain.models import TaskPayload, TalonTaskStatus


def test_task_status_values() -> None:
    assert TalonTaskStatus.READY == "READY"
    assert TalonTaskStatus.FAILED == "FAILED"


def test_task_payload_defaults() -> None:
    p = TaskPayload(prompt="navigate to https://linkedin.com/in/foo and connect")
    assert p.max_steps == 10
    assert p.abort_conditions == []
