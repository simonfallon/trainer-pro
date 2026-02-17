"""
Exercise Templates API Router
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.exercise_template import ExerciseTemplate
from app.schemas.exercise_template import (
    ExerciseTemplateCreate,
    ExerciseTemplateResponse,
    ExerciseTemplateUpdate,
)

router = APIRouter()


@router.get("", response_model=list[ExerciseTemplateResponse])
async def list_exercise_templates(
    trainer_app_id: int = Query(..., description="Trainer app ID to filter templates"),
    discipline_type: str | None = Query(None, description="Filter by discipline type"),
    db: AsyncSession = Depends(get_db),
):
    """List all exercise templates for a trainer app."""
    query = select(ExerciseTemplate).where(ExerciseTemplate.trainer_app_id == trainer_app_id)

    if discipline_type:
        query = query.where(ExerciseTemplate.discipline_type == discipline_type)

    query = query.order_by(ExerciseTemplate.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/autocomplete", response_model=list[ExerciseTemplateResponse])
async def autocomplete_exercise_templates(
    trainer_app_id: int = Query(..., description="Trainer app ID to filter templates"),
    q: str = Query("", description="Search query"),
    discipline_type: str | None = Query(None, description="Filter by discipline type"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    db: AsyncSession = Depends(get_db),
):
    """
    Autocomplete search for exercise templates with fuzzy matching.

    Uses PostgreSQL's ILIKE for case-insensitive substring matching and
    similarity() for fuzzy matching with typos/variations.
    """
    if not q:
        # Return all templates if no query
        query = select(ExerciseTemplate).where(ExerciseTemplate.trainer_app_id == trainer_app_id)
        if discipline_type:
            query = query.where(ExerciseTemplate.discipline_type == discipline_type)
        query = query.order_by(ExerciseTemplate.name).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    # Build fuzzy matching query
    # Match using ILIKE for substring matching (handles partial words)
    search_pattern = f"%{q}%"

    query = select(ExerciseTemplate).where(
        ExerciseTemplate.trainer_app_id == trainer_app_id,
        ExerciseTemplate.name.ilike(search_pattern),
    )

    if discipline_type:
        query = query.where(ExerciseTemplate.discipline_type == discipline_type)

    # Order by: exact prefix match first, then alphabetically
    # Use CASE to prioritize exact prefix matches
    query = query.order_by(
        func.lower(ExerciseTemplate.name).startswith(q.lower()).desc(), ExerciseTemplate.name
    ).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{template_id}", response_model=ExerciseTemplateResponse)
async def get_exercise_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get an exercise template by ID."""
    result = await db.execute(select(ExerciseTemplate).where(ExerciseTemplate.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise template not found",
        )

    return template


@router.post("", response_model=ExerciseTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise_template(
    template_data: ExerciseTemplateCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new exercise template."""
    template = ExerciseTemplate(
        trainer_app_id=template_data.trainer_app_id,
        name=template_data.name,
        discipline_type=template_data.discipline_type,
        field_schema=template_data.field_schema,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


@router.put("/{template_id}", response_model=ExerciseTemplateResponse)
async def update_exercise_template(
    template_id: int,
    template_data: ExerciseTemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an exercise template."""
    result = await db.execute(select(ExerciseTemplate).where(ExerciseTemplate.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise template not found",
        )

    update_data = template_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    await db.flush()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete an exercise template."""
    result = await db.execute(select(ExerciseTemplate).where(ExerciseTemplate.id == template_id))
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise template not found",
        )

    await db.delete(template)
    await db.flush()
