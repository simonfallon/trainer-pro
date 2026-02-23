"""
Clients API Router
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth_utils import get_current_trainer_id
from app.database import get_db
from app.models.client import Client
from app.models.payment import Payment
from app.models.session import SessionStatus, TrainingSession
from app.schemas.client import (
    ClientCreate,
    ClientResponse,
    ClientUpdate,
    ExerciseHistoryEntry,
    ExerciseHistoryResponse,
    LocationLapTimes,
    SessionLapTimes,
)
from app.schemas.payment import PaymentBalanceResponse, PaymentCreate, PaymentResponse
from app.schemas.session import SessionResponse

router = APIRouter()


async def _get_client_owned_by(client_id: int, trainer_id: int, db: AsyncSession) -> Client:
    """Fetch a client and verify it belongs to the authenticated trainer."""
    query = (
        select(Client).where(Client.id == client_id).options(joinedload(Client.default_location))
    )
    result = await db.execute(query)
    client = result.scalar_one_or_none()

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    if client.trainer_id != trainer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")

    return client


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    trainer_id: int = Depends(get_current_trainer_id),
    include_deleted: bool = Query(False, description="Include soft-deleted clients"),
    db: AsyncSession = Depends(get_db),
):
    """List all clients for the authenticated trainer."""
    query = (
        select(Client)
        .where(Client.trainer_id == trainer_id)
        .options(joinedload(Client.default_location))
    )

    if not include_deleted:
        query = query.where(Client.deleted_at.is_(None))

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Get a client by ID."""
    return await _get_client_owned_by(client_id, trainer_id, db)


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new client."""
    client = Client(
        trainer_id=trainer_id,
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
    # Re-query to load relationships
    query = (
        select(Client).where(Client.id == client.id).options(joinedload(Client.default_location))
    )
    result = await db.execute(query)
    return result.scalar_one()


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a client."""
    client = await _get_client_owned_by(client_id, trainer_id, db)

    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.flush()
    # Re-query to load relationships
    query = (
        select(Client).where(Client.id == client_id).options(joinedload(Client.default_location))
    )
    result = await db.execute(query)
    return result.scalar_one()


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a client."""
    client = await _get_client_owned_by(client_id, trainer_id, db)
    client.deleted_at = datetime.now(UTC)
    await db.flush()


@router.get("/{client_id}/sessions", response_model=list[SessionResponse])
async def get_client_sessions(
    client_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Get all training sessions for a specific client."""
    await _get_client_owned_by(client_id, trainer_id, db)

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
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Get payment balance summary for a client."""
    await _get_client_owned_by(client_id, trainer_id, db)

    # Count sessions (only completed, scheduled, and in_progress, not cancelled)
    sessions_query = select(TrainingSession).where(
        TrainingSession.client_id == client_id,
        TrainingSession.status.in_(
            [
                SessionStatus.COMPLETED.value,
                SessionStatus.SCHEDULED.value,
                SessionStatus.IN_PROGRESS.value,
            ]
        ),
    )
    sessions_result = await db.execute(sessions_query)
    sessions = sessions_result.scalars().all()

    total_sessions = len(sessions)
    paid_sessions = sum(1 for s in sessions if s.is_paid)
    unpaid_sessions = total_sessions - paid_sessions

    # Calculate prepaid balance from payments vs sessions
    payments_query = select(func.sum(Payment.sessions_paid)).where(Payment.client_id == client_id)
    payments_result = await db.execute(payments_query)
    total_paid_through_payments = payments_result.scalar() or 0

    # Get total amount paid in COP
    amount_query = select(func.sum(Payment.amount_cop)).where(Payment.client_id == client_id)
    amount_result = await db.execute(amount_query)
    total_amount_paid_cop = amount_result.scalar() or 0

    prepaid_sessions = max(0, total_paid_through_payments - total_sessions)

    return PaymentBalanceResponse(
        total_sessions=total_sessions,
        paid_sessions=paid_sessions,
        unpaid_sessions=unpaid_sessions,
        prepaid_sessions=prepaid_sessions,
        has_positive_balance=prepaid_sessions > 0,
        total_amount_paid_cop=total_amount_paid_cop,
    )


@router.post(
    "/{client_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED
)
async def register_client_payment(
    client_id: int,
    payment_data: PaymentCreate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Register a bulk payment for a client."""
    client = await _get_client_owned_by(client_id, trainer_id, db)

    # Create payment record
    payment = Payment(
        client_id=client_id,
        trainer_id=client.trainer_id,
        sessions_paid=payment_data.sessions_paid,
        amount_cop=payment_data.amount_cop,
        payment_date=payment_data.payment_date or datetime.now(UTC),
        notes=payment_data.notes,
    )
    db.add(payment)

    # Mark oldest unpaid sessions as paid
    unpaid_sessions_query = (
        select(TrainingSession)
        .where(
            TrainingSession.client_id == client_id,
            TrainingSession.is_paid.is_(False),
            TrainingSession.status.in_(
                [
                    SessionStatus.COMPLETED.value,
                    SessionStatus.SCHEDULED.value,
                    SessionStatus.IN_PROGRESS.value,
                ]
            ),
        )
        .order_by(TrainingSession.scheduled_at.asc())
        .limit(payment_data.sessions_paid)
    )
    unpaid_result = await db.execute(unpaid_sessions_query)
    unpaid_sessions = unpaid_result.scalars().all()

    now = datetime.now(UTC)
    for session in unpaid_sessions:
        session.is_paid = True
        session.paid_at = now

    await db.flush()
    await db.refresh(payment)
    return payment


@router.get("/{client_id}/lap-times-by-location", response_model=list[LocationLapTimes])
async def get_client_lap_times_by_location(
    client_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Get lap times aggregated by location for a BMX client."""
    from app.models.location import Location
    from app.models.session_exercise import SessionExercise

    await _get_client_owned_by(client_id, trainer_id, db)

    query = (
        select(
            TrainingSession.location_id,
            Location.name.label("location_name"),
            SessionExercise.data,
            TrainingSession.id.label("session_id"),
            TrainingSession.scheduled_at,
        )
        .join(SessionExercise, SessionExercise.session_id == TrainingSession.id)
        .outerjoin(Location, Location.id == TrainingSession.location_id)
        .where(
            TrainingSession.client_id == client_id,
            SessionExercise.custom_name == "Toma de Tiempo BMX",
        )
        .order_by(TrainingSession.scheduled_at.desc())
    )

    result = await db.execute(query)
    rows = result.all()

    location_map: dict[int | None, dict] = {}

    for row in rows:
        location_id = row.location_id
        location_name = row.location_name or "Sin ubicación"
        lap_times_ms = row.data.get("lap_times_ms", [])
        session_id = row.session_id
        recorded_at = row.scheduled_at

        if location_id not in location_map:
            location_map[location_id] = {
                "location_id": location_id,
                "location_name": location_name,
                "sessions": {},
                "all_times": [],
            }

        if session_id not in location_map[location_id]["sessions"]:
            location_map[location_id]["sessions"][session_id] = {
                "session_id": session_id,
                "recorded_at": recorded_at,
                "lap_times_ms": [],
            }

        location_map[location_id]["sessions"][session_id]["lap_times_ms"].extend(lap_times_ms)
        location_map[location_id]["all_times"].extend(lap_times_ms)

    result_list = []
    for loc_data in location_map.values():
        all_times = loc_data["all_times"]
        if not all_times:
            continue

        sessions = []
        for session_data in loc_data["sessions"].values():
            session_times = session_data["lap_times_ms"]
            if session_times:
                sessions.append(
                    SessionLapTimes(
                        session_id=session_data["session_id"],
                        recorded_at=session_data["recorded_at"],
                        lap_times_ms=session_times,
                        total_laps=len(session_times),
                        best_time_ms=min(session_times),
                        average_time_ms=int(sum(session_times) / len(session_times)),
                    )
                )

        sessions.sort(key=lambda s: s.recorded_at, reverse=True)

        result_list.append(
            LocationLapTimes(
                location_id=loc_data["location_id"],
                location_name=loc_data["location_name"],
                total_laps=len(all_times),
                best_time_ms=min(all_times),
                average_time_ms=int(sum(all_times) / len(all_times)),
                sessions=sessions,
            )
        )

    return result_list


@router.get("/{client_id}/exercise-history", response_model=ExerciseHistoryResponse)
async def get_client_exercise_history(
    client_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    exercise_name: str | None = Query(None, description="Filter by specific exercise name"),
    db: AsyncSession = Depends(get_db),
):
    """Get exercise history for a physio client."""
    from app.models.session_exercise import SessionExercise

    await _get_client_owned_by(client_id, trainer_id, db)

    query = (
        select(
            SessionExercise.custom_name,
            SessionExercise.data,
            TrainingSession.id.label("session_id"),
            TrainingSession.scheduled_at,
        )
        .join(TrainingSession, TrainingSession.id == SessionExercise.session_id)
        .where(
            TrainingSession.client_id == client_id,
            SessionExercise.custom_name.isnot(None),
            SessionExercise.custom_name != "Toma de Tiempo BMX",
        )
        .order_by(TrainingSession.scheduled_at.desc())
    )

    if exercise_name:
        query = query.where(SessionExercise.custom_name == exercise_name)

    result = await db.execute(query)
    rows = result.all()

    exercises_set = set()
    history = []

    for row in rows:
        exercise_name_val = row.custom_name
        exercises_set.add(exercise_name_val)

        history.append(
            ExerciseHistoryEntry(
                session_id=row.session_id,
                date=row.scheduled_at,
                exercise_name=exercise_name_val,
                data=row.data,
            )
        )

    return ExerciseHistoryResponse(
        exercises=sorted(list(exercises_set)),
        history=history,
    )
