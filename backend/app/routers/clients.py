"""
Clients API Router
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.client import Client
from app.models.session import TrainingSession, SessionStatus
from app.models.payment import Payment
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.schemas.session import SessionResponse
from app.schemas.payment import PaymentCreate, PaymentResponse, PaymentBalanceResponse

router = APIRouter()


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    trainer_id: int = Query(..., description="Trainer ID to filter clients"),
    include_deleted: bool = Query(False, description="Include soft-deleted clients"),
    db: AsyncSession = Depends(get_db),
):
    """List all clients for a trainer."""
    query = select(Client).where(Client.trainer_id == trainer_id)
    
    if not include_deleted:
        query = query.where(Client.deleted_at.is_(None))
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a client by ID."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    return client


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new client."""
    client = Client(
        trainer_id=client_data.trainer_id,
        name=client_data.name,
        phone=client_data.phone,
        email=client_data.email,
        notes=client_data.notes,
        default_location_id=client_data.default_location_id,
        photo_url=client_data.photo_url,
        birth_date=client_data.birth_date,
        gender=client_data.gender,
        height_cm=client_data.height_cm,
        weight_kg=client_data.weight_kg,
    )
    db.add(client)
    await db.flush()
    await db.refresh(client)
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    await db.flush()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    client.deleted_at = datetime.utcnow()
    await db.flush()


@router.get("/{client_id}/sessions", response_model=list[SessionResponse])
async def get_client_sessions(
    client_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all training sessions for a specific client."""
    # Verify client exists
    client_result = await db.execute(select(Client).where(Client.id == client_id))
    if not client_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    # Get sessions ordered by date (most recent first)
    query = (
        select(TrainingSession)
        .where(TrainingSession.client_id == client_id)
        .order_by(TrainingSession.scheduled_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{client_id}/payment-balance", response_model=PaymentBalanceResponse)
async def get_client_payment_balance(
    client_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get payment balance summary for a client."""
    # Verify client exists
    client_result = await db.execute(select(Client).where(Client.id == client_id))
    if not client_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    # Count sessions (only completed and scheduled, not cancelled)
    sessions_query = select(TrainingSession).where(
        TrainingSession.client_id == client_id,
        TrainingSession.status.in_([SessionStatus.COMPLETED.value, SessionStatus.SCHEDULED.value])
    )
    sessions_result = await db.execute(sessions_query)
    sessions = sessions_result.scalars().all()
    
    total_sessions = len(sessions)
    paid_sessions = sum(1 for s in sessions if s.is_paid)
    unpaid_sessions = total_sessions - paid_sessions
    
    # Calculate prepaid balance from payments vs sessions
    # Get total sessions paid through payment records
    payments_query = select(func.sum(Payment.sessions_paid)).where(Payment.client_id == client_id)
    payments_result = await db.execute(payments_query)
    total_paid_through_payments = payments_result.scalar() or 0
    
    # Prepaid = sessions paid in payments - sessions marked as paid (that used those payments)
    # Simple model: prepaid = paid_sessions - total_sessions if positive
    prepaid_sessions = max(0, paid_sessions - total_sessions) if paid_sessions > total_sessions else 0
    # More accurate: check payment records vs actual used sessions
    prepaid_sessions = max(0, total_paid_through_payments - total_sessions)
    
    return PaymentBalanceResponse(
        total_sessions=total_sessions,
        paid_sessions=paid_sessions,
        unpaid_sessions=unpaid_sessions,
        prepaid_sessions=prepaid_sessions,
        has_positive_balance=prepaid_sessions > 0,
    )


@router.post("/{client_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def register_client_payment(
    client_id: int,
    payment_data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a bulk payment for a client.
    This will also mark the oldest unpaid sessions as paid.
    """
    # Verify client exists and get trainer_id
    client_result = await db.execute(select(Client).where(Client.id == client_id))
    client = client_result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    
    # Create payment record
    payment = Payment(
        client_id=client_id,
        trainer_id=client.trainer_id,
        sessions_paid=payment_data.sessions_paid,
        amount_cop=payment_data.amount_cop,
        payment_date=payment_data.payment_date or datetime.utcnow(),
        notes=payment_data.notes,
    )
    db.add(payment)
    
    # Mark oldest unpaid sessions as paid
    unpaid_sessions_query = (
        select(TrainingSession)
        .where(
            TrainingSession.client_id == client_id,
            TrainingSession.is_paid == False,
            TrainingSession.status.in_([SessionStatus.COMPLETED.value, SessionStatus.SCHEDULED.value])
        )
        .order_by(TrainingSession.scheduled_at.asc())
        .limit(payment_data.sessions_paid)
    )
    unpaid_result = await db.execute(unpaid_sessions_query)
    unpaid_sessions = unpaid_result.scalars().all()
    
    now = datetime.utcnow()
    for session in unpaid_sessions:
        session.is_paid = True
        session.paid_at = now
    
    await db.flush()
    await db.refresh(payment)
    return payment
