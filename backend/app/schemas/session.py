"""
Session Schemas
"""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    """Training session status."""

    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SessionBase(BaseModel):
    """Base session schema."""

    client_id: int
    location_id: int | None = None
    scheduled_at: datetime
    started_at: datetime | None = None
    duration_minutes: int = Field(default=60, ge=15, le=480)
    notes: str | None = None
    status: SessionStatus = Field(default=SessionStatus.SCHEDULED)
    session_doc: str | None = None


class SessionCreate(SessionBase):
    """Schema for creating a session. trainer_id is derived from the session token."""


class SessionUpdate(BaseModel):
    """Schema for updating a session."""

    client_id: int | None = None
    location_id: int | None = None
    scheduled_at: datetime | None = None
    started_at: datetime | None = None
    duration_minutes: int | None = Field(None, ge=15, le=480)
    notes: str | None = None
    status: SessionStatus | None = None
    session_doc: str | None = None


class SessionResponse(SessionBase):
    """Schema for session response."""

    id: int
    trainer_id: int
    session_group_id: int | None = None
    is_paid: bool = False
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionStats(BaseModel):
    """Schema for session statistics."""

    total_sessions: int
    completed_sessions: int
    scheduled_sessions: int
    total_clients: int


class SessionGroupCreate(BaseModel):
    """Schema for creating a session group. trainer_id is derived from the session token."""

    client_ids: list[int] = Field(..., min_length=1)
    location_id: int | None = None
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=15, le=480)
    notes: str | None = None


class SessionGroupResponse(BaseModel):
    """Schema for session group response."""

    id: int
    trainer_id: int
    location_id: int | None
    scheduled_at: datetime
    duration_minutes: int
    notes: str | None
    created_at: datetime
    updated_at: datetime
    sessions: list[SessionResponse] = []

    class Config:
        from_attributes = True


class StartActiveSessionRequest(BaseModel):
    """Schema for starting an active session. trainer_id is derived from the session token."""

    session_id: int | None = None
    client_ids: list[int] = Field(..., min_length=1)
    duration_minutes: int = Field(default=60, ge=15, le=480)
    location_id: int | None = None
    notes: str | None = None


class ActiveSessionResponse(BaseModel):
    """Response for active session - could be single session or group."""

    session: SessionResponse | None = None
    session_group: SessionGroupResponse | None = None
    clients: list = []  # Will be populated from the session(s)
    started_at: datetime
    duration_minutes: int


class ClientNotesRequest(BaseModel):
    """Request for saving client notes during session."""

    client_id: int
    notes: str


class LapTimesRequest(BaseModel):
    """Request for saving BMX lap times."""

    client_id: int
    lap_times_ms: list[int] = Field(..., min_length=1)
    total_duration_ms: int
