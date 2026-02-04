"""
Development-only authentication bypass.

SECURITY WARNING: This module MUST be disabled in production.
Only use for E2E testing in development environments.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.trainer import Trainer
from app.models.app import TrainerApp
from app.config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("/dev/login")
async def dev_login(db: AsyncSession = Depends(get_db)):
    """
    DEV ONLY: Bypass Google OAuth and return test trainer data.
    
    This endpoint is ONLY available when DEV_AUTH_BYPASS=true.
    Returns the same structure as the Google OAuth exchange endpoint.
    
    Security: Returns 404 if dev auth is disabled.
    """
    # CRITICAL: Fail closed if dev auth is not explicitly enabled
    if not settings.dev_auth_bypass:
        raise HTTPException(status_code=404, detail="Not found")
    
    if not settings.dev_trainer_id:
        raise HTTPException(
            status_code=500,
            detail="DEV_TRAINER_ID not configured"
        )
    
    # Fetch dev trainer
    result = await db.execute(
        select(Trainer).where(Trainer.id == settings.dev_trainer_id)
    )
    trainer = result.scalar_one_or_none()
    
    if not trainer:
        raise HTTPException(
            status_code=500,
            detail=f"Dev trainer not found. Run: python backend/scripts/seed_data.py"
        )
    
    # Check if trainer has an app
    app_result = await db.execute(
        select(TrainerApp).where(TrainerApp.trainer_id == trainer.id)
    )
    app = app_result.scalar_one_or_none()
    
    # Return same structure as Google OAuth exchange
    return {
        "trainer_id": str(trainer.id),
        "email": trainer.email,
        "name": trainer.name,
        "is_new_user": False,  # Always false for dev trainer
        "has_app": app is not None,
        "app_id": str(app.id) if app else None,
        "app_name": app.name if app else None,
    }
