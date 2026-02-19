"""
Development-only authentication bypass.

SECURITY WARNING: This module MUST be disabled in production.
Only use for E2E testing in development environments.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_utils import COOKIE_NAME, create_session_token
from app.config import get_settings
from app.database import get_db
from app.models.app import TrainerApp
from app.models.trainer import Trainer

router = APIRouter()
settings = get_settings()


def _set_session_cookie(response: Response, trainer_id: int) -> None:
    """Helper to set the JWT session cookie on a dev auth response."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=create_session_token(trainer_id),
        httponly=True,
        secure=False,  # Set to True in production (HTTPS)
        samesite="lax",
        max_age=60 * 60 * 168,  # 7 days
        path="/",
    )


@router.post("/dev/login")
async def dev_login(response: Response, db: AsyncSession = Depends(get_db)):
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
        raise HTTPException(status_code=500, detail="DEV_TRAINER_ID not configured")

    # Fetch dev trainer
    result = await db.execute(select(Trainer).where(Trainer.id == settings.dev_trainer_id))
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(
            status_code=500,
            detail="Dev trainer not found. Run: python backend/scripts/seed_data.py",
        )

    # Check if trainer has an app
    app_result = await db.execute(select(TrainerApp).where(TrainerApp.trainer_id == trainer.id))
    app = app_result.scalar_one_or_none()

    _set_session_cookie(response, trainer.id)
    # Return same structure as Google OAuth exchange
    return {
        "trainer_id": trainer.id,
        "email": trainer.email,
        "name": trainer.name,
        "is_new_user": False,  # Always false for dev trainer
        "has_app": app is not None,
        "app_id": app.id if app else None,
        "app_name": app.name if app else None,
    }


@router.post("/dev/onboarding")
async def dev_onboarding(response: Response, db: AsyncSession = Depends(get_db)):
    """
    DEV ONLY: Create/return a test trainer WITHOUT an app for testing onboarding flow.

    This endpoint is ONLY available when DEV_AUTH_BYPASS=true.
    Returns a trainer with is_new_user=true and has_app=false to trigger onboarding.

    Security: Returns 404 if dev auth is disabled.
    """
    # CRITICAL: Fail closed if dev auth is not explicitly enabled
    if not settings.dev_auth_bypass:
        raise HTTPException(status_code=404, detail="Not found")

    # Look for or create a test trainer for onboarding
    test_email = "test-onboarding@trainer.dev"

    result = await db.execute(select(Trainer).where(Trainer.email == test_email))
    trainer = result.scalar_one_or_none()

    if not trainer:
        # Create fresh test trainer
        trainer = Trainer(
            email=test_email,
            name="Test Onboarding User",
            google_id="dev-onboarding-test",
            discipline_type="test",  # Generic test discipline
        )
        db.add(trainer)
        await db.commit()
        await db.refresh(trainer)
    else:
        # Clear existing app if any to allow re-testing
        await db.execute(TrainerApp.__table__.delete().where(TrainerApp.trainer_id == trainer.id))
        # Reset trainer fields for fresh onboarding
        trainer.phone = None
        trainer.logo_url = None
        await db.commit()

    _set_session_cookie(response, trainer.id)
    # Return structure that triggers onboarding (Step 2)
    return {
        "trainer_id": trainer.id,
        "email": trainer.email,
        "name": trainer.name,
        "is_new_user": True,  # This triggers onboarding flow
        "has_app": False,
        "app_id": None,
        "app_name": None,
    }


@router.post("/dev/login/{discipline}")
async def dev_login_discipline(
    discipline: str, response: Response, db: AsyncSession = Depends(get_db)
):
    """
    DEV ONLY: Login as specific discipline trainer (bmx or physio).

    This endpoint is ONLY available when DEV_AUTH_BYPASS=true.
    Returns the same structure as the Google OAuth exchange endpoint.

    Security: Returns 404 if dev auth is disabled.
    """
    # CRITICAL: Fail closed if dev auth is not explicitly enabled
    if not settings.dev_auth_bypass:
        raise HTTPException(status_code=404, detail="Not found")

    if discipline not in ["bmx", "physio"]:
        raise HTTPException(status_code=400, detail="Invalid discipline. Use 'bmx' or 'physio'")

    # Find trainer with matching discipline
    result = await db.execute(select(Trainer).where(Trainer.discipline_type == discipline).limit(1))
    trainer = result.scalar_one_or_none()

    if not trainer:
        raise HTTPException(
            status_code=500,
            detail=f"{discipline.upper()} trainer not found. Run: python backend/scripts/seed_data.py",
        )

    # Check if trainer has an app
    app_result = await db.execute(select(TrainerApp).where(TrainerApp.trainer_id == trainer.id))
    app = app_result.scalar_one_or_none()

    _set_session_cookie(response, trainer.id)
    # Return same structure as Google OAuth exchange
    return {
        "trainer_id": trainer.id,
        "email": trainer.email,
        "name": trainer.name,
        "is_new_user": False,
        "has_app": app is not None,
        "app_id": app.id if app else None,
        "app_name": app.name if app else None,
    }
