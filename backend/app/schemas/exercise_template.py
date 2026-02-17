"""
Exercise Template Schemas
"""

from datetime import datetime

from pydantic import BaseModel, Field


class ExerciseTemplateBase(BaseModel):
    """Base exercise template schema."""

    name: str = Field(..., min_length=1, max_length=255)
    discipline_type: str = Field(..., min_length=1, max_length=50)
    field_schema: dict = Field(default_factory=dict)


class ExerciseTemplateCreate(ExerciseTemplateBase):
    """Schema for creating an exercise template."""

    trainer_app_id: int


class ExerciseTemplateUpdate(BaseModel):
    """Schema for updating an exercise template."""

    name: str | None = Field(None, min_length=1, max_length=255)
    discipline_type: str | None = Field(None, min_length=1, max_length=50)
    field_schema: dict | None = None


class ExerciseTemplateResponse(ExerciseTemplateBase):
    """Schema for exercise template response."""

    id: int
    trainer_app_id: int
    usage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
