"""
Sessions API Router
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.client import Client
from app.models.session import SessionStatus, TrainingSession
from app.models.session_group import SessionGroup
from app.schemas.session import (
    ClientNotesRequest,
    LapTimesRequest,
    SessionCreate,
    SessionGroupCreate,
    SessionGroupResponse,
    SessionResponse,
    SessionStats,
    SessionUpdate,
    StartActiveSessionRequest,
)

router = APIRouter()


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    trainer_id: int = Query(..., description="Trainer ID to filter sessions"),
    start_date: datetime | None = Query(None, description="Filter sessions from this date"),
    end_date: datetime | None = Query(None, description="Filter sessions until this date"),
    status_filter: str | None = Query(None, description="Filter by session status"),
    db: AsyncSession = Depends(get_db),
):
    """List all sessions for a trainer with optional date range filter."""
    query = select(TrainingSession).where(TrainingSession.trainer_id == trainer_id)

    if start_date:
        query = query.where(TrainingSession.scheduled_at >= start_date)
    if end_date:
        query = query.where(TrainingSession.scheduled_at <= end_date)
    if status_filter:
        query = query.where(TrainingSession.status == status_filter)

    query = query.order_by(TrainingSession.scheduled_at)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats", response_model=SessionStats)
async def get_session_stats(
    trainer_id: int = Query(..., description="Trainer ID to get stats for"),
    start_date: datetime | None = Query(None, description="Stats from this date"),
    end_date: datetime | None = Query(None, description="Stats until this date"),
    db: AsyncSession = Depends(get_db),
):
    """Get session statistics for a trainer."""
    # Build base query
    base_query = select(TrainingSession).where(TrainingSession.trainer_id == trainer_id)

    if start_date:
        base_query = base_query.where(TrainingSession.scheduled_at >= start_date)
    if end_date:
        base_query = base_query.where(TrainingSession.scheduled_at <= end_date)

    # Get all sessions
    result = await db.execute(base_query)
    sessions = result.scalars().all()

    # Calculate stats
    total = len(sessions)
    completed = sum(1 for s in sessions if s.status == SessionStatus.COMPLETED.value)
    scheduled = sum(1 for s in sessions if s.status == SessionStatus.SCHEDULED.value)
    cancelled = sum(1 for s in sessions if s.status == SessionStatus.CANCELLED.value)

    # Get unique clients
    client_query = (
        select(func.count(func.distinct(Client.id)))
        .where(Client.trainer_id == trainer_id)
        .where(Client.deleted_at.is_(None))
    )
    client_result = await db.execute(client_query)
    total_clients = client_result.scalar() or 0

    return SessionStats(
        total_sessions=total,
        completed_sessions=completed,
        scheduled_sessions=scheduled,
        cancelled_sessions=cancelled,
        total_clients=total_clients,
    )


# Active Session Endpoints (must come before /{session_id} to avoid routing conflicts)

@router.get("/current", response_model=SessionResponse | None)
async def get_current_session(
    trainer_id: int = Query(..., description="Trainer ID"),
    tolerance_minutes: int = Query(15, description="Tolerance in minutes"),
    db: AsyncSession = Depends(get_db),
):
    """Find session scheduled within tolerance (±minutes) of current time."""
    from datetime import timedelta

    now = datetime.utcnow()
    start_time = now - timedelta(minutes=tolerance_minutes)
    end_time = now + timedelta(minutes=tolerance_minutes)

    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.trainer_id == trainer_id)
        .where(TrainingSession.status == SessionStatus.SCHEDULED.value)
        .where(TrainingSession.scheduled_at >= start_time)
        .where(TrainingSession.scheduled_at <= end_time)
        .order_by(TrainingSession.scheduled_at)
    )

    return result.scalars().first()


@router.post("/active/start", response_model=SessionResponse | SessionGroupResponse, status_code=status.HTTP_201_CREATED)
async def start_active_session(
    data: StartActiveSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start or create an active session."""
    now = datetime.utcnow()

    if data.session_id:
        # Start existing session
        result = await db.execute(
            select(TrainingSession).where(TrainingSession.id == data.session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        # Update to in progress
        session.status = SessionStatus.IN_PROGRESS.value
        session.started_at = now
        await db.flush()
        await db.refresh(session)
        return session

    else:
        # Create new ad-hoc session(s)
        if len(data.client_ids) == 1:
            # Single client session
            session = TrainingSession(
                trainer_id=data.trainer_id,
                client_id=data.client_ids[0],
                location_id=data.location_id,
                scheduled_at=now,
                started_at=now,
                duration_minutes=data.duration_minutes,
                notes=data.notes,
                status=SessionStatus.IN_PROGRESS.value,
            )
            db.add(session)
            await db.flush()
            await db.refresh(session)
            return session

        else:
            # Multiple clients - create group session
            session_group = SessionGroup(
                trainer_id=data.trainer_id,
                location_id=data.location_id,
                scheduled_at=now,
                duration_minutes=data.duration_minutes,
                notes=data.notes,
            )
            db.add(session_group)
            await db.flush()

            # Create individual sessions for each client
            for client_id in data.client_ids:
                session = TrainingSession(
                    trainer_id=data.trainer_id,
                    client_id=client_id,
                    location_id=data.location_id,
                    session_group_id=session_group.id,
                    scheduled_at=now,
                    started_at=now,
                    duration_minutes=data.duration_minutes,
                    notes=data.notes,
                    status=SessionStatus.IN_PROGRESS.value,
                )
                db.add(session)

            await db.flush()

            # Reload with relationships
            result = await db.execute(
                select(SessionGroup)
                .options(selectinload(SessionGroup.sessions))
                .where(SessionGroup.id == session_group.id)
            )
            session_group = result.scalar_one()
            return session_group


@router.get("/active", response_model=SessionResponse | SessionGroupResponse | None)
async def get_active_session(
    trainer_id: int = Query(..., description="Trainer ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get current active session for trainer."""
    # Try to find an active individual session first
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.trainer_id == trainer_id)
        .where(TrainingSession.status == SessionStatus.IN_PROGRESS.value)
        .where(TrainingSession.session_group_id.is_(None))
        .order_by(TrainingSession.started_at.desc())
    )
    session = result.scalars().first()

    if session:
        return session

    # Check for active group session
    result = await db.execute(
        select(SessionGroup)
        .options(selectinload(SessionGroup.sessions))
        .join(TrainingSession, SessionGroup.id == TrainingSession.session_group_id)
        .where(SessionGroup.trainer_id == trainer_id)
        .where(TrainingSession.status == SessionStatus.IN_PROGRESS.value)
        .order_by(SessionGroup.scheduled_at.desc())
        .distinct()
    )

    return result.scalars().first()


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a session by ID."""
    result = await db.execute(
        select(TrainingSession).where(TrainingSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    return session


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new training session."""
    session = TrainingSession(
        trainer_id=session_data.trainer_id,
        client_id=session_data.client_id,
        location_id=session_data.location_id,
        scheduled_at=session_data.scheduled_at,
        duration_minutes=session_data.duration_minutes,
        notes=session_data.notes,
        status=session_data.status.value,
        session_doc=session_data.session_doc,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a session."""
    result = await db.execute(
        select(TrainingSession).where(TrainingSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    update_data = session_data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].value

    for field, value in update_data.items():
        setattr(session, field, value)

    await db.flush()
    await db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Cancel a session (soft cancel via status change)."""
    result = await db.execute(
        select(TrainingSession).where(TrainingSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    session.status = SessionStatus.CANCELLED.value
    await db.flush()


@router.patch("/{session_id}/payment", response_model=SessionResponse)
async def toggle_session_payment(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Toggle the payment status of a session."""
    result = await db.execute(
        select(TrainingSession).where(TrainingSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Toggle is_paid
    session.is_paid = not session.is_paid
    session.paid_at = datetime.utcnow() if session.is_paid else None

    await db.flush()
    await db.refresh(session)
    return session


@router.post("/group", response_model=SessionGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_session_group(
    group_data: SessionGroupCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new session group with multiple clients."""
    # Create the session group
    session_group = SessionGroup(
        trainer_id=group_data.trainer_id,
        location_id=group_data.location_id,
        scheduled_at=group_data.scheduled_at,
        duration_minutes=group_data.duration_minutes,
        notes=group_data.notes,
    )
    db.add(session_group)
    await db.flush()

    # Create individual sessions for each client
    for client_id in group_data.client_ids:
        session = TrainingSession(
            trainer_id=group_data.trainer_id,
            client_id=client_id,
            location_id=group_data.location_id,
            session_group_id=session_group.id,
            scheduled_at=group_data.scheduled_at,
            duration_minutes=group_data.duration_minutes,
            notes=group_data.notes,
            status=SessionStatus.SCHEDULED.value,
        )
        db.add(session)

    await db.flush()

    # Eagerly load the sessions relationship to avoid greenlet error
    result = await db.execute(
        select(SessionGroup)
        .options(selectinload(SessionGroup.sessions))
        .where(SessionGroup.id == session_group.id)
    )
    session_group = result.scalar_one()

    return session_group


@router.get("/groups", response_model=list[SessionGroupResponse])
async def list_session_groups(
    trainer_id: int = Query(..., description="Trainer ID to filter session groups"),
    start_date: datetime | None = Query(None, description="Filter from this date"),
    end_date: datetime | None = Query(None, description="Filter until this date"),
    db: AsyncSession = Depends(get_db),
):
    """List all session groups for a trainer."""
    query = (
        select(SessionGroup)
        .options(selectinload(SessionGroup.sessions))
        .where(SessionGroup.trainer_id == trainer_id)
    )

    if start_date:
        query = query.where(SessionGroup.scheduled_at >= start_date)
    if end_date:
        query = query.where(SessionGroup.scheduled_at <= end_date)

    query = query.order_by(SessionGroup.scheduled_at)
    result = await db.execute(query)
    return result.scalars().all()
async def get_current_session(
    trainer_id: int = Query(..., description="Trainer ID"),
    tolerance_minutes: int = Query(15, description="Tolerance in minutes"),
    db: AsyncSession = Depends(get_db),
):
    """Find session scheduled within tolerance (±minutes) of current time."""
    from datetime import timedelta

    now = datetime.utcnow()
    start_time = now - timedelta(minutes=tolerance_minutes)
    end_time = now + timedelta(minutes=tolerance_minutes)

    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.trainer_id == trainer_id)
        .where(TrainingSession.status == SessionStatus.SCHEDULED.value)
        .where(TrainingSession.scheduled_at >= start_time)
        .where(TrainingSession.scheduled_at <= end_time)
        .order_by(TrainingSession.scheduled_at)
    )

    return result.scalars().first()


@router.post("/active/start", response_model=SessionResponse | SessionGroupResponse, status_code=status.HTTP_201_CREATED)
async def start_active_session(
    data: StartActiveSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start or create an active session."""
    now = datetime.utcnow()

    if data.session_id:
        # Start existing session
        result = await db.execute(
            select(TrainingSession).where(TrainingSession.id == data.session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        # Update to in progress
        session.status = SessionStatus.IN_PROGRESS.value
        session.started_at = now
        await db.flush()
        await db.refresh(session)
        return session

    else:
        # Create new ad-hoc session(s)
        if len(data.client_ids) == 1:
            # Single client session
            session = TrainingSession(
                trainer_id=data.trainer_id,
                client_id=data.client_ids[0],
                location_id=data.location_id,
                scheduled_at=now,
                started_at=now,
                duration_minutes=data.duration_minutes,
                notes=data.notes,
                status=SessionStatus.IN_PROGRESS.value,
            )
            db.add(session)
            await db.flush()
            await db.refresh(session)
            return session

        else:
            # Multiple clients - create group session
            session_group = SessionGroup(
                trainer_id=data.trainer_id,
                location_id=data.location_id,
                scheduled_at=now,
                duration_minutes=data.duration_minutes,
                notes=data.notes,
            )
            db.add(session_group)
            await db.flush()

            # Create individual sessions for each client
            for client_id in data.client_ids:
                session = TrainingSession(
                    trainer_id=data.trainer_id,
                    client_id=client_id,
                    location_id=data.location_id,
                    session_group_id=session_group.id,
                    scheduled_at=now,
                    started_at=now,
                    duration_minutes=data.duration_minutes,
                    notes=data.notes,
                    status=SessionStatus.IN_PROGRESS.value,
                )
                db.add(session)

            await db.flush()

            # Reload with relationships
            result = await db.execute(
                select(SessionGroup)
                .options(selectinload(SessionGroup.sessions))
                .where(SessionGroup.id == session_group.id)
            )
            session_group = result.scalar_one()
            return session_group


@router.get("/active", response_model=SessionResponse | SessionGroupResponse | None)
async def get_active_session(
    trainer_id: int = Query(..., description="Trainer ID"),
    db: AsyncSession = Depends(get_db),
):
    """Get current active session for trainer."""
    # Try to find an active individual session first
    result = await db.execute(
        select(TrainingSession)
        .where(TrainingSession.trainer_id == trainer_id)
        .where(TrainingSession.status == SessionStatus.IN_PROGRESS.value)
        .where(TrainingSession.session_group_id.is_(None))
        .order_by(TrainingSession.started_at.desc())
    )
    session = result.scalars().first()

    if session:
        return session

    # Check for active group session
    result = await db.execute(
        select(SessionGroup)
        .options(selectinload(SessionGroup.sessions))
        .join(TrainingSession, SessionGroup.id == TrainingSession.session_group_id)
        .where(SessionGroup.trainer_id == trainer_id)
        .where(TrainingSession.status == SessionStatus.IN_PROGRESS.value)
        .order_by(SessionGroup.scheduled_at.desc())
        .distinct()
    )

    return result.scalars().first()


@router.patch("/{session_id}/client-notes", response_model=SessionResponse)
async def save_client_notes(
    session_id: int,
    data: ClientNotesRequest,
    db: AsyncSession = Depends(get_db),
):
    """Save notes for a specific client during active session."""
    import json

    result = await db.execute(
        select(TrainingSession).where(TrainingSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Parse existing session_doc or create new structure
    session_doc = {}
    if session.session_doc:
        try:
            session_doc = json.loads(session.session_doc)
        except (json.JSONDecodeError, TypeError):
            # If session_doc is plain text, preserve it as general_notes
            session_doc = {"general_notes": session.session_doc}

    # Update client notes
    if "client_notes" not in session_doc:
        session_doc["client_notes"] = {}

    session_doc["client_notes"][str(data.client_id)] = data.notes

    # Save back as JSON string
    session.session_doc = json.dumps(session_doc)

    await db.flush()
    await db.refresh(session)
    return session


@router.post("/{session_id}/lap-times")
async def save_lap_times(
    session_id: int,
    data: LapTimesRequest,
    db: AsyncSession = Depends(get_db),
):
    """Save BMX lap times as a session exercise."""
    from app.models.session_exercise import SessionExercise

    result = await db.execute(
        select(TrainingSession).where(TrainingSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    # Create session exercise with lap times
    exercise_data = {
        "lap_times_ms": data.lap_times_ms,
        "total_duration_ms": data.total_duration_ms,
        "lap_count": len(data.lap_times_ms),
        "client_id": data.client_id,
    }

    # Get the next order index
    result = await db.execute(
        select(func.max(SessionExercise.order_index))
        .where(SessionExercise.session_id == session_id)
    )
    max_order = result.scalar() or -1

    exercise = SessionExercise(
        session_id=session_id,
        custom_name="Toma de Tiempo BMX",
        data=exercise_data,
        order_index=max_order + 1,
    )
    db.add(exercise)
    await db.flush()
    await db.refresh(exercise)

    return {
        "id": exercise.id,
        "session_id": exercise.session_id,
        "custom_name": exercise.custom_name,
        "data": exercise.data,
        "order_index": exercise.order_index,
    }
