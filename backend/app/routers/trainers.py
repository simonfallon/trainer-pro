"""
Trainers API Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.trainer import Trainer
from app.schemas.trainer import TrainerCreate, TrainerResponse, TrainerUpdate

router = APIRouter()


@router.get("/{trainer_id}", response_model=TrainerResponse)
async def get_trainer(
    trainer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a trainer by ID."""
    result = await db.execute(select(Trainer).where(Trainer.id == trainer_id))
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer not found",
        )

    return trainer


@router.post("", response_model=TrainerResponse, status_code=status.HTTP_201_CREATED)
async def create_trainer(
    trainer_data: TrainerCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new trainer."""
    trainer = Trainer(
        name=trainer_data.name,
        phone=trainer_data.phone,
        email=trainer_data.email,
        logo_url=trainer_data.logo_url,
    )
    db.add(trainer)
    await db.flush()
    await db.refresh(trainer)
    return trainer


@router.put("/{trainer_id}", response_model=TrainerResponse)
async def update_trainer(
    trainer_id: int,
    trainer_data: TrainerUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a trainer."""
    result = await db.execute(select(Trainer).where(Trainer.id == trainer_id))
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trainer not found",
        )

    update_data = trainer_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(trainer, field, value)

    await db.flush()
    await db.refresh(trainer)
    return trainer
