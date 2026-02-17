"""
Trainer Schemas
"""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class TrainerBase(BaseModel):
    """Base trainer schema."""

    name: str = Field(..., min_length=1, max_length=255)
    phone: str | None = Field(None, min_length=1, max_length=50)
    email: EmailStr
    logo_url: str | None = None
    discipline_type: str = Field(..., pattern="^(bmx|physio)$")
    google_id: str | None = None

    @field_validator("email")
    def validate_google_email(cls, v: str) -> str:
        # Skip validation in dev mode to allow test emails
        from app.config import get_settings

        settings = get_settings()
        if settings.dev_auth_bypass:
            return v

        if not v.endswith("@gmail.com"):
            raise ValueError("Email must be a Google email (@gmail.com)")
        return v


class TrainerCreate(TrainerBase):
    """Schema for creating a trainer."""

    pass


class TrainerUpdate(BaseModel):
    """Schema for updating a trainer."""

    name: str | None = Field(None, min_length=1, max_length=255)
    phone: str | None = Field(None, min_length=1, max_length=50)
    email: EmailStr | None = None
    logo_url: str | None = None
    discipline_type: str | None = Field(None, pattern="^(bmx|physio)$")

    @field_validator("email")
    def validate_google_email(cls, v: str | None) -> str | None:
        if v is None:
            return v

        # Skip validation in dev mode to allow test emails
        from app.config import get_settings

        settings = get_settings()
        if settings.dev_auth_bypass:
            return v

        if not v.endswith("@gmail.com"):
            raise ValueError("Email must be a Google email (@gmail.com)")
        return v


class TrainerResponse(TrainerBase):
    """Schema for trainer response."""

    id: int
    google_id: str | None = None
    logo_url: str | None = None
    discipline_type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
