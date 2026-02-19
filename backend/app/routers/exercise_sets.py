"""
Exercise Sets API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth_utils import get_current_trainer_id
from app.database import get_db
from app.models.exercise_set import ExerciseSet
from app.models.exercise_template import ExerciseTemplate
from app.models.session import TrainingSession
from app.models.session_exercise import SessionExercise
from app.models.session_group import SessionGroup
from app.schemas.exercise_set import (
    ExerciseSetCreate,
    ExerciseSetResponse,
    ExerciseSetUpdate,
    ExerciseSetUpdateExercises,
)
from app.schemas.session_exercise import SessionExerciseResponse

router = APIRouter()


async def _verify_session_ownership(
    session_id: int, trainer_id: int, db: AsyncSession
) -> TrainingSession:
    result = await db.execute(select(TrainingSession).where(TrainingSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Training session not found"
        )
    if session.trainer_id != trainer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    return session


async def _verify_group_ownership(group_id: int, trainer_id: int, db: AsyncSession) -> SessionGroup:
    result = await db.execute(select(SessionGroup).where(SessionGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session group not found")
    if group.trainer_id != trainer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    return group


async def _verify_set_ownership(set_id: int, trainer_id: int, db: AsyncSession) -> ExerciseSet:
    """Load ExerciseSet and verify ownership through its parent session or group."""
    result = await db.execute(select(ExerciseSet).where(ExerciseSet.id == set_id))
    exercise_set = result.scalar_one_or_none()
    if not exercise_set:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise set not found")

    if exercise_set.session_id:
        await _verify_session_ownership(exercise_set.session_id, trainer_id, db)
    elif exercise_set.session_group_id:
        await _verify_group_ownership(exercise_set.session_group_id, trainer_id, db)

    return exercise_set


@router.get("/sessions/{session_id}/sets", response_model=list[ExerciseSetResponse])
async def list_exercise_sets_for_session(
    session_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """List all exercise sets for a session."""
    await _verify_session_ownership(session_id, trainer_id, db)

    query = (
        select(ExerciseSet)
        .options(selectinload(ExerciseSet.exercises))
        .where(ExerciseSet.session_id == session_id)
        .order_by(ExerciseSet.order_index, ExerciseSet.id)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/session-groups/{group_id}/sets", response_model=list[ExerciseSetResponse])
async def list_exercise_sets_for_group(
    group_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """List all exercise sets for a session group."""
    await _verify_group_ownership(group_id, trainer_id, db)

    query = (
        select(ExerciseSet)
        .options(selectinload(ExerciseSet.exercises))
        .where(ExerciseSet.session_group_id == group_id)
        .order_by(ExerciseSet.order_index, ExerciseSet.id)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/sessions/{session_id}",
    response_model=ExerciseSetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_exercise_set_for_session(
    session_id: int,
    set_data: ExerciseSetCreate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Create an exercise set for an individual session."""
    await _verify_session_ownership(session_id, trainer_id, db)

    max_order_result = await db.execute(
        select(ExerciseSet.order_index)
        .where(ExerciseSet.session_id == session_id)
        .order_by(ExerciseSet.order_index.desc())
        .limit(1)
    )
    max_order = max_order_result.scalar_one_or_none()
    next_order = (max_order + 1) if max_order is not None else 0

    exercise_set = ExerciseSet(
        session_id=session_id,
        session_group_id=None,
        name=set_data.name,
        series=set_data.series,
        order_index=next_order,
    )
    db.add(exercise_set)
    await db.flush()

    for exercise_data in set_data.exercises:
        if exercise_data.exercise_template_id:
            template_result = await db.execute(
                select(ExerciseTemplate).where(
                    ExerciseTemplate.id == exercise_data.exercise_template_id
                )
            )
            template = template_result.scalar_one_or_none()
            if template:
                template.usage_count += 1

        exercise = SessionExercise(
            session_id=session_id,
            session_group_id=None,
            exercise_set_id=exercise_set.id,
            exercise_template_id=exercise_data.exercise_template_id,
            custom_name=exercise_data.custom_name,
            data=exercise_data.data,
            order_index=exercise_data.order_index,
        )
        db.add(exercise)

    await db.flush()
    await db.refresh(exercise_set, ["exercises"])
    return exercise_set


@router.post(
    "/session-groups/{group_id}",
    response_model=ExerciseSetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_exercise_set_for_group(
    group_id: int,
    set_data: ExerciseSetCreate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Create an exercise set for a session group."""
    await _verify_group_ownership(group_id, trainer_id, db)

    max_order_result = await db.execute(
        select(ExerciseSet.order_index)
        .where(ExerciseSet.session_group_id == group_id)
        .order_by(ExerciseSet.order_index.desc())
        .limit(1)
    )
    max_order = max_order_result.scalar_one_or_none()
    next_order = (max_order + 1) if max_order is not None else 0

    exercise_set = ExerciseSet(
        session_id=None,
        session_group_id=group_id,
        name=set_data.name,
        series=set_data.series,
        order_index=next_order,
    )
    db.add(exercise_set)
    await db.flush()

    for exercise_data in set_data.exercises:
        if exercise_data.exercise_template_id:
            template_result = await db.execute(
                select(ExerciseTemplate).where(
                    ExerciseTemplate.id == exercise_data.exercise_template_id
                )
            )
            template = template_result.scalar_one_or_none()
            if template:
                template.usage_count += 1

        exercise = SessionExercise(
            session_id=None,
            session_group_id=group_id,
            exercise_set_id=exercise_set.id,
            exercise_template_id=exercise_data.exercise_template_id,
            custom_name=exercise_data.custom_name,
            data=exercise_data.data,
            order_index=exercise_data.order_index,
        )
        db.add(exercise)

    await db.flush()
    await db.refresh(exercise_set, ["exercises"])
    return exercise_set


@router.get("/{set_id}", response_model=ExerciseSetResponse)
async def get_exercise_set(
    set_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Get an exercise set by ID with its exercises."""
    await _verify_set_ownership(set_id, trainer_id, db)

    result = await db.execute(
        select(ExerciseSet)
        .options(selectinload(ExerciseSet.exercises))
        .where(ExerciseSet.id == set_id)
    )
    return result.scalar_one()


@router.put("/{set_id}", response_model=ExerciseSetResponse)
async def update_exercise_set(
    set_id: int,
    set_data: ExerciseSetUpdate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Update exercise set metadata (name and/or series)."""
    exercise_set = await _verify_set_ownership(set_id, trainer_id, db)

    update_data = set_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(exercise_set, field, value)

    await db.flush()
    await db.refresh(exercise_set, ["exercises"])
    return exercise_set


@router.put("/{set_id}/exercises", response_model=ExerciseSetResponse)
async def update_exercise_set_exercises(
    set_id: int,
    update_data: ExerciseSetUpdateExercises,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Update exercises within a set (add, remove, modify)."""
    exercise_set = await _verify_set_ownership(set_id, trainer_id, db)

    existing_result = await db.execute(
        select(SessionExercise.id).where(SessionExercise.exercise_set_id == set_id)
    )
    existing_ids = set(existing_result.scalars().all())

    updated_ids = set()

    for exercise_data in update_data.exercises:
        if exercise_data.id and exercise_data.id in existing_ids:
            exercise_result = await db.execute(
                select(SessionExercise).where(SessionExercise.id == exercise_data.id)
            )
            exercise = exercise_result.scalar_one()

            update_dict = exercise_data.model_dump(exclude_unset=True, exclude={"id"})
            for field, value in update_dict.items():
                if value is not None:
                    setattr(exercise, field, value)

            updated_ids.add(exercise_data.id)
        else:
            if exercise_data.exercise_template_id:
                template_result = await db.execute(
                    select(ExerciseTemplate).where(
                        ExerciseTemplate.id == exercise_data.exercise_template_id
                    )
                )
                template = template_result.scalar_one_or_none()
                if template:
                    template.usage_count += 1

            exercise = SessionExercise(
                session_id=exercise_set.session_id,
                session_group_id=exercise_set.session_group_id,
                exercise_set_id=set_id,
                exercise_template_id=exercise_data.exercise_template_id,
                custom_name=exercise_data.custom_name,
                data=exercise_data.data or {},
                order_index=exercise_data.order_index or 0,
            )
            db.add(exercise)

    ids_to_delete = existing_ids - updated_ids
    if ids_to_delete:
        for exercise_id in ids_to_delete:
            exercise_result = await db.execute(
                select(SessionExercise).where(SessionExercise.id == exercise_id)
            )
            exercise = exercise_result.scalar_one_or_none()
            if exercise:
                await db.delete(exercise)

    await db.flush()
    await db.refresh(exercise_set, ["exercises"])
    return exercise_set


@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise_set(
    set_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete an exercise set and all its exercises."""
    exercise_set = await _verify_set_ownership(set_id, trainer_id, db)
    await db.delete(exercise_set)
    await db.flush()


@router.put("/{set_id}/reorder", response_model=list[SessionExerciseResponse])
async def reorder_exercise_set_exercises(
    set_id: int,
    exercise_ids: list[int],
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Reorder exercises within a set."""
    await _verify_set_ownership(set_id, trainer_id, db)

    for index, exercise_id in enumerate(exercise_ids):
        result = await db.execute(
            select(SessionExercise).where(
                SessionExercise.id == exercise_id, SessionExercise.exercise_set_id == set_id
            )
        )
        exercise = result.scalar_one_or_none()
        if exercise:
            exercise.order_index = index

    await db.flush()

    query = (
        select(SessionExercise)
        .where(SessionExercise.exercise_set_id == set_id)
        .order_by(SessionExercise.order_index, SessionExercise.id)
    )
    result = await db.execute(query)
    return result.scalars().all()
