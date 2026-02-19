"""
Session Exercises API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_utils import get_current_trainer_id
from app.database import get_db
from app.models.exercise_template import ExerciseTemplate
from app.models.session import TrainingSession
from app.models.session_exercise import SessionExercise
from app.models.session_group import SessionGroup
from app.schemas.session_exercise import (
    SessionExerciseCreate,
    SessionExerciseReorderRequest,
    SessionExerciseResponse,
    SessionExerciseUpdate,
)

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


@router.get("/sessions/{session_id}/exercises", response_model=list[SessionExerciseResponse])
async def list_session_exercises(
    session_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """List all exercises for a training session."""
    await _verify_session_ownership(session_id, trainer_id, db)

    query = (
        select(SessionExercise)
        .where(SessionExercise.session_id == session_id)
        .order_by(SessionExercise.order_index, SessionExercise.id)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/session-groups/{group_id}/exercises", response_model=list[SessionExerciseResponse])
async def list_session_group_exercises(
    group_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """List all exercises for a session group."""
    await _verify_group_ownership(group_id, trainer_id, db)

    query = (
        select(SessionExercise)
        .where(SessionExercise.session_group_id == group_id)
        .order_by(SessionExercise.order_index, SessionExercise.id)
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/sessions/{session_id}/exercises",
    response_model=SessionExerciseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session_exercise(
    session_id: int,
    exercise_data: SessionExerciseCreate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Add an exercise to a training session."""
    await _verify_session_ownership(session_id, trainer_id, db)

    exercise_data.session_id = session_id
    exercise_data.session_group_id = None

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
        session_id=exercise_data.session_id,
        session_group_id=exercise_data.session_group_id,
        exercise_template_id=exercise_data.exercise_template_id,
        custom_name=exercise_data.custom_name,
        data=exercise_data.data,
        order_index=exercise_data.order_index,
    )
    db.add(exercise)
    await db.flush()
    await db.refresh(exercise)
    return exercise


@router.post(
    "/session-groups/{group_id}/exercises",
    response_model=SessionExerciseResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_session_group_exercise(
    group_id: int,
    exercise_data: SessionExerciseCreate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Add an exercise to a session group."""
    await _verify_group_ownership(group_id, trainer_id, db)

    exercise_data.session_id = None
    exercise_data.session_group_id = group_id

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
        session_id=exercise_data.session_id,
        session_group_id=exercise_data.session_group_id,
        exercise_template_id=exercise_data.exercise_template_id,
        custom_name=exercise_data.custom_name,
        data=exercise_data.data,
        order_index=exercise_data.order_index,
    )
    db.add(exercise)
    await db.flush()
    await db.refresh(exercise)
    return exercise


@router.put("/{exercise_id}", response_model=SessionExerciseResponse)
async def update_session_exercise(
    exercise_id: int,
    exercise_data: SessionExerciseUpdate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a session exercise."""
    result = await db.execute(select(SessionExercise).where(SessionExercise.id == exercise_id))
    exercise = result.scalar_one_or_none()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session exercise not found",
        )

    # Verify ownership through parent
    if exercise.session_id:
        await _verify_session_ownership(exercise.session_id, trainer_id, db)
    elif exercise.session_group_id:
        await _verify_group_ownership(exercise.session_group_id, trainer_id, db)

    update_data = exercise_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(exercise, field, value)

    await db.flush()
    await db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session_exercise(
    exercise_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a session exercise."""
    result = await db.execute(select(SessionExercise).where(SessionExercise.id == exercise_id))
    exercise = result.scalar_one_or_none()

    if not exercise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session exercise not found",
        )

    if exercise.session_id:
        await _verify_session_ownership(exercise.session_id, trainer_id, db)
    elif exercise.session_group_id:
        await _verify_group_ownership(exercise.session_group_id, trainer_id, db)

    await db.delete(exercise)
    await db.flush()


@router.put(
    "/sessions/{session_id}/exercises/reorder", response_model=list[SessionExerciseResponse]
)
async def reorder_session_exercises(
    session_id: int,
    reorder_data: SessionExerciseReorderRequest,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Bulk reorder exercises for a session."""
    await _verify_session_ownership(session_id, trainer_id, db)

    for index, exercise_id in enumerate(reorder_data.exercise_ids):
        result = await db.execute(
            select(SessionExercise).where(
                SessionExercise.id == exercise_id, SessionExercise.session_id == session_id
            )
        )
        exercise = result.scalar_one_or_none()
        if exercise:
            exercise.order_index = index

    await db.flush()

    query = (
        select(SessionExercise)
        .where(SessionExercise.session_id == session_id)
        .order_by(SessionExercise.order_index, SessionExercise.id)
    )
    result = await db.execute(query)
    return result.scalars().all()
