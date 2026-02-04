"""
Session Schemas
"""
from datetime import datetime
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    """Training session status."""
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SessionBase(BaseModel):
    """Base session schema."""
    client_id: UUID
    location_id: UUID | None = None
    scheduled_at: datetime
    duration_minutes: int = Field(default=60, ge=15, le=480)
    notes: str | None = None
    status: SessionStatus = Field(default=SessionStatus.SCHEDULED)
    session_doc: str | None = None


class SessionCreate(SessionBase):
    """Schema for creating a session."""
    trainer_id: UUID


class SessionUpdate(BaseModel):
    """Schema for updating a session."""
    client_id: UUID | None = None
    location_id: UUID | None = None
    scheduled_at: datetime | None = None
    duration_minutes: int | None = Field(None, ge=15, le=480)
    notes: str | None = None
    status: SessionStatus | None = None
    session_doc: str | None = None


class SessionResponse(SessionBase):
    """Schema for session response."""
    id: UUID
    trainer_id: UUID
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
    cancelled_sessions: int
    total_clients: int

