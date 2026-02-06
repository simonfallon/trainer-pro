"""
Session Exercise Schemas
"""
from datetime import datetime
from pydantic import BaseModel, Field, model_validator


class SessionExerciseBase(BaseModel):
    """Base session exercise schema."""
    exercise_template_id: int | None = None
    custom_name: str | None = Field(None, max_length=255)
    data: dict = Field(default_factory=dict)
    order_index: int = Field(default=0, ge=0)


class SessionExerciseCreate(SessionExerciseBase):
    """Schema for creating a session exercise."""
    session_id: int | None = None
    session_group_id: int | None = None
    
    # Note: XOR validation is handled by the router via path parameters
    # The router will set either session_id or session_group_id based on the endpoint


class SessionExerciseUpdate(BaseModel):
    """Schema for updating a session exercise."""
    exercise_template_id: int | None = None
    custom_name: str | None = Field(None, max_length=255)
    data: dict | None = None
    order_index: int | None = Field(None, ge=0)


class SessionExerciseResponse(SessionExerciseBase):
    """Schema for session exercise response."""
    id: int
    session_id: int | None
    session_group_id: int | None
    exercise_set_id: int | None
    created_at: datetime
    
    class Config:
        from_attributes = True


class SessionExerciseReorderRequest(BaseModel):
    """Schema for bulk reordering session exercises."""
    exercise_ids: list[int] = Field(..., min_length=1)
