"""
Exercise Set Schemas
"""
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.session_exercise import SessionExerciseResponse


class ExerciseInSetCreate(BaseModel):
    """Schema for creating an exercise within a set."""
    exercise_template_id: int | None = None
    custom_name: str | None = Field(None, max_length=255)
    data: dict = Field(default_factory=dict)
    order_index: int = Field(default=0, ge=0)


class ExerciseInSetUpdate(BaseModel):
    """Schema for updating an exercise within a set."""
    id: int | None = None  # If provided, update existing; otherwise create new
    exercise_template_id: int | None = None
    custom_name: str | None = Field(None, max_length=255)
    data: dict | None = None
    order_index: int | None = Field(None, ge=0)


class ExerciseSetBase(BaseModel):
    """Base exercise set schema."""
    name: str = Field(..., min_length=1, max_length=255)
    series: int = Field(..., gt=0)


class ExerciseSetCreate(ExerciseSetBase):
    """Schema for creating an exercise set."""
    exercises: list[ExerciseInSetCreate] = Field(default_factory=list)
    session_id: int | None = None  # Set by router based on endpoint
    session_group_id: int | None = None  # Set by router based on endpoint


class ExerciseSetUpdate(BaseModel):
    """Schema for updating exercise set metadata."""
    name: str | None = Field(None, min_length=1, max_length=255)
    series: int | None = Field(None, gt=0)


class ExerciseSetUpdateExercises(BaseModel):
    """Schema for updating exercises within a set."""
    exercises: list[ExerciseInSetUpdate] = Field(..., min_length=1)


class ExerciseSetResponse(ExerciseSetBase):
    """Schema for exercise set response."""
    id: int
    session_id: int | None
    session_group_id: int | None
    order_index: int
    exercises: list[SessionExerciseResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
