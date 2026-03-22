from talon.domain.models import SiteCredential, TaskPayload, TalonErrorCode, TalonTaskStatus


def test_task_status_values() -> None:
    assert TalonTaskStatus.READY == "READY"
    assert TalonTaskStatus.FAILED == "FAILED"
    assert TalonTaskStatus.PENDING_APPROVAL == "PENDING_APPROVAL"


def test_task_payload_defaults() -> None:
    p = TaskPayload(prompt="navigate to https://linkedin.com/in/foo and connect")
    assert p.max_steps == 10
    assert p.abort_conditions == []


def test_task_payload_custom() -> None:
    p = TaskPayload(
        prompt="send connection request",
        max_steps=5,
        abort_conditions=["already_connected", "profile_not_found"],
    )
    assert p.max_steps == 5
    assert "already_connected" in p.abort_conditions


def test_site_credential_clears_on_del() -> None:
    cred = SiteCredential(username="user@example.com", password="hunter2", totp_secret="BASE32")
    assert cred.username == "user@example.com"
    cred.__del__()
    assert cred.username == ""
    assert cred.password == ""
    assert cred.totp_secret is None


def test_talon_error_code_values() -> None:
    assert TalonErrorCode.NO_CREDENTIAL == "NO_CREDENTIAL"
    assert TalonErrorCode.OFF_SITE_NAVIGATION == "OFF_SITE_NAVIGATION"
    assert TalonErrorCode.CANCELLED == "CANCELLED"
