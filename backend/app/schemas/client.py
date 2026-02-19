"""
Client Schemas
"""

from datetime import datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.location import LocationResponse


class ClientBase(BaseModel):
    """Base client schema."""

    name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=50)
    email: str | None = Field(None, max_length=255)
    notes: str | None = None
    default_location_id: int | None = None
    # Profile fields
    photo_url: str | None = Field(None, max_length=500)
    birth_date: datetime | None = None
    gender: str | None = Field(None, max_length=20)  # 'M', 'F', 'Otro'
    height_cm: int | None = Field(None, ge=50, le=300)
    weight_kg: float | None = Field(None, ge=10, le=500)


class ClientCreate(ClientBase):
    """Schema for creating a client."""

    trainer_id: int


class ClientUpdate(BaseModel):
    """Schema for updating a client."""

    name: str | None = Field(None, min_length=1, max_length=255)
    phone: str | None = Field(None, min_length=1, max_length=50)
    email: str | None = Field(None, max_length=255)
    notes: str | None = None
    default_location_id: int | None = None
    # Profile fields
    photo_url: str | None = Field(None, max_length=500)
    birth_date: datetime | None = None
    gender: str | None = Field(None, max_length=20)
    height_cm: int | None = Field(None, ge=50, le=300)
    weight_kg: float | None = Field(None, ge=10, le=500)


class ClientResponse(ClientBase):
    """Schema for client response."""

    id: int
    trainer_id: int
    google_id: str | None = None
    default_location: LocationResponse | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def age(self) -> int | None:
        """Calculate age from birth_date."""
        if self.birth_date is None:
            return None
        today = datetime.now(self.birth_date.tzinfo) if self.birth_date.tzinfo else datetime.now()
        age = today.year - self.birth_date.year
        if (today.month, today.day) < (self.birth_date.month, self.birth_date.day):
            age -= 1
        return age

    class Config:
        from_attributes = True


# Lap Times by Location
class SessionLapTimes(BaseModel):
    """Lap times for a single session."""

    session_id: int
    recorded_at: datetime
    lap_times_ms: list[int]
    total_laps: int
    best_time_ms: int
    average_time_ms: int


class LocationLapTimes(BaseModel):
    """Lap times aggregated by location."""

    location_id: int | None
    location_name: str
    average_time_ms: int
    best_time_ms: int
    total_laps: int
    sessions: list[SessionLapTimes]


# Exercise History
class ExerciseHistoryEntry(BaseModel):
    """Single exercise history entry."""

    session_id: int
    date: datetime
    exercise_name: str
    data: dict


class ExerciseHistoryResponse(BaseModel):
    """Exercise history for a client."""

    exercises: list[str]  # List of unique exercise names
    history: list[ExerciseHistoryEntry]
