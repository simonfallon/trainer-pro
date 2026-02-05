"""
Sessions API Router
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.session import TrainingSession, SessionStatus
from app.models.client import Client
from app.schemas.session import (
    SessionCreate,
    SessionUpdate,
    SessionResponse,
    SessionStats,
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
