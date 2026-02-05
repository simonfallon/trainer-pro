"""
App Schemas
"""
from datetime import datetime
from pydantic import BaseModel, Field


class ThemeConfig(BaseModel):
    """Theme configuration schema."""
    colors: dict[str, str]
    fonts: dict[str, str]


class AppBase(BaseModel):
    """Base app schema."""
    name: str = Field(..., min_length=1, max_length=255)
    theme_id: str = Field(..., min_length=1, max_length=50)
    theme_config: ThemeConfig


class AppCreate(AppBase):
    """Schema for creating an app."""
    trainer_id: int


class AppUpdate(BaseModel):
    """Schema for updating an app."""
    name: str | None = Field(None, min_length=1, max_length=255)
    theme_id: str | None = Field(None, min_length=1, max_length=50)
    theme_config: ThemeConfig | None = None


class AppResponse(AppBase):
    """Schema for app response."""
    id: int
    trainer_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
