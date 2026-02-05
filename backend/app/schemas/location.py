"""
Location Schemas
"""
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class LocationType(str, Enum):
    """Location type enumeration."""
    TRAINER_BASE = "trainer_base"
    CLIENT_HOME = "client_home"
    GYM = "gym"
    TRACK = "track"
    OTHER = "other"


class LocationBase(BaseModel):
    """Base location schema."""
    name: str = Field(..., min_length=1, max_length=255)
    type: LocationType = Field(default=LocationType.OTHER)
    address_line1: str | None = Field(None, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    region: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=100)
    latitude: float | None = None
    longitude: float | None = None
    google_place_id: str | None = Field(None, max_length=255)


class LocationCreate(LocationBase):
    """Schema for creating a location."""
    trainer_id: int


class LocationUpdate(BaseModel):
    """Schema for updating a location."""
    name: str | None = Field(None, min_length=1, max_length=255)
    type: LocationType | None = None
    address_line1: str | None = Field(None, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    region: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=100)
    latitude: float | None = None
    longitude: float | None = None
    google_place_id: str | None = Field(None, max_length=255)


class LocationResponse(LocationBase):
    """Schema for location response."""
    id: int
    trainer_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
