"""
Client Schemas
"""
from datetime import datetime

from pydantic import BaseModel, Field, computed_field


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
