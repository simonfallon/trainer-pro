"""
Exercise Templates API Router
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_utils import get_current_trainer_id
from app.database import get_db
from app.models.app import TrainerApp
from app.models.exercise_template import ExerciseTemplate
from app.schemas.exercise_template import (
    ExerciseTemplateCreate,
    ExerciseTemplateResponse,
    ExerciseTemplateUpdate,
)

router = APIRouter()


async def _verify_app_ownership(
    trainer_app_id: int, trainer_id: int, db: AsyncSession
) -> TrainerApp:
    """Verify that a TrainerApp belongs to the authenticated trainer."""
    result = await db.execute(select(TrainerApp).where(TrainerApp.id == trainer_app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    if app.trainer_id != trainer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    return app


@router.get("", response_model=list[ExerciseTemplateResponse])
async def list_exercise_templates(
    trainer_app_id: int = Query(..., description="Trainer app ID to filter templates"),
    trainer_id: int = Depends(get_current_trainer_id),
    discipline_type: str | None = Query(None, description="Filter by discipline type"),
    db: AsyncSession = Depends(get_db),
):
    """List all exercise templates for a trainer app."""
    await _verify_app_ownership(trainer_app_id, trainer_id, db)

    query = select(ExerciseTemplate).where(ExerciseTemplate.trainer_app_id == trainer_app_id)

    if discipline_type:
        query = query.where(ExerciseTemplate.discipline_type == discipline_type)

    query = query.order_by(ExerciseTemplate.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/autocomplete", response_model=list[ExerciseTemplateResponse])
async def autocomplete_exercise_templates(
    trainer_app_id: int = Query(..., description="Trainer app ID to filter templates"),
    trainer_id: int = Depends(get_current_trainer_id),
    q: str = Query("", description="Search query"),
    discipline_type: str | None = Query(None, description="Filter by discipline type"),
    limit: int = Query(10, ge=1, le=1000, description="Maximum number of results"),
    db: AsyncSession = Depends(get_db),
):
    """Autocomplete search for exercise templates with fuzzy matching."""
    await _verify_app_ownership(trainer_app_id, trainer_id, db)

    if not q:
        query = select(ExerciseTemplate).where(ExerciseTemplate.trainer_app_id == trainer_app_id)
        if discipline_type:
            query = query.where(ExerciseTemplate.discipline_type == discipline_type)
        query = query.order_by(ExerciseTemplate.name).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    search_pattern = f"%{q}%"

    query = select(ExerciseTemplate).where(
        ExerciseTemplate.trainer_app_id == trainer_app_id,
        ExerciseTemplate.name.ilike(search_pattern),
    )

    if discipline_type:
        query = query.where(ExerciseTemplate.discipline_type == discipline_type)

    query = query.order_by(
        func.lower(ExerciseTemplate.name).startswith(q.lower()).desc(), ExerciseTemplate.name
    ).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{template_id}", response_model=ExerciseTemplateResponse)
async def get_exercise_template(
    template_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
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

    await _verify_app_ownership(template.trainer_app_id, trainer_id, db)
    return template


@router.post("", response_model=ExerciseTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise_template(
    template_data: ExerciseTemplateCreate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new exercise template."""
    await _verify_app_ownership(template_data.trainer_app_id, trainer_id, db)

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
    trainer_id: int = Depends(get_current_trainer_id),
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

    await _verify_app_ownership(template.trainer_app_id, trainer_id, db)

    update_data = template_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)

    await db.flush()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise_template(
    template_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
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

    await _verify_app_ownership(template.trainer_app_id, trainer_id, db)

    await db.delete(template)
    await db.flush()
