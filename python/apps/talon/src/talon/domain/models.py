from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class TalonTaskStatus(StrEnum):
    DRAFT = "DRAFT"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    REJECTED = "REJECTED"
    READY = "READY"
    CLAIMED = "CLAIMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class TalonErrorCode(StrEnum):
    NO_CREDENTIAL = "NO_CREDENTIAL"
    SESSION_INVALID = "SESSION_INVALID"
    STEP_FAILED = "STEP_FAILED"
    OFF_SITE_NAVIGATION = "OFF_SITE_NAVIGATION"
    TIMEOUT = "TIMEOUT"
    MAX_STEPS_EXCEEDED = "MAX_STEPS_EXCEEDED"
    ABORT_CONDITION_MET = "ABORT_CONDITION_MET"
    CANCELLED = "CANCELLED"


class TaskPayload(BaseModel):
    prompt: str
    max_steps: int = 10
    abort_conditions: list[str] = []


class TaskMessage(BaseModel):
    task_id: str
    site_key: str
    payload: TaskPayload


class StepResult(BaseModel):
    step: int
    description: str
    success: bool
    metadata: dict[str, Any] = {}


class TaskResult(BaseModel):
    success: bool
    steps: list[StepResult] = []
    error_code: TalonErrorCode | None = None
    error_message: str | None = None


class SiteCredential:
    """Holds login credentials for a target site. Discard after session closes."""

    def __init__(self, username: str, password: str, totp_secret: str | None = None) -> None:
        self.username = username
        self.password = password
        self.totp_secret = totp_secret

    def __del__(self) -> None:
        self.username = ""
        self.password = ""
        self.totp_secret = None
