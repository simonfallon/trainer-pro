"""
Authentication Router
Handles Google OAuth 2.0 flow.
"""
import secrets
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.app import TrainerApp
from app.models.trainer import Trainer

router = APIRouter()
settings = get_settings()

# For local dev, redirect to frontend callback page
# In production, this should match the authorized redirect URI in Google Console
REDIRECT_URI = "http://localhost:3000/auth/callback"

@router.get("/google/url")
async def get_google_auth_url():
    """
    Generate and return the Google OAuth 2.0 authorization URL.
    """
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")

    # Scopes:
    # openid, email, profile: for sign-in
    # https://www.googleapis.com/auth/calendar: for future calendar sync
    scopes = [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar"
    ]

    scope_str = " ".join(scopes)

    # State parameter for CSRF protection (in a real app, store and verify this)
    state = secrets.token_urlsafe(16)

    # Access type offline to get refresh token
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&"
        f"client_id={settings.google_client_id}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"scope={scope_str}&"
        f"state={state}&"
        f"access_type=offline&"
        f"prompt=consent"
    )

    return {"url": url, "state": state}


@router.post("/google/exchange")
async def exchange_google_code(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Exchange authorization code for tokens and sign in/up the trainer.
    """
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Authorization code required")

    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=500, detail="Google credentials not configured")

    # 1. Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to retrieve tokens from Google")

    tokens = response.json()
    id_token_jwt = tokens.get("id_token")
    access_token = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token") # Only present if access_type=offline and prompt=consent
    expires_in = tokens.get("expires_in")

    # 2. Verify ID Token
    try:
        id_info = id_token.verify_oauth2_token(
            id_token_jwt,
            google_requests.Request(),
            settings.google_client_id
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID Token")

    email = id_info.get("email")
    google_id = id_info.get("sub")
    name = id_info.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Email not found in token")

    # 3. Find or Create Trainer
    # Check by email first (primary identity)
    result = await db.execute(select(Trainer).where(Trainer.email == email))
    trainer = result.scalar_one_or_none()

    is_new_user = False

    if trainer:
        # Update tokens
        if refresh_token:
            trainer.google_refresh_token = refresh_token
        trainer.google_access_token = access_token
        trainer.google_id = google_id # Ensure this is set
        if expires_in:
            trainer.token_expiry = datetime.utcnow() + timedelta(seconds=expires_in)
    else:
        # Create new trainer
        is_new_user = True
        trainer = Trainer(
            name=name,
            email=email,
            phone=None,  # Will be collected in next step
            google_id=google_id,
            google_refresh_token=refresh_token,
            google_access_token=access_token,
            token_expiry=datetime.utcnow() + timedelta(seconds=expires_in) if expires_in else None
        )
        db.add(trainer)

    await db.flush()
    await db.refresh(trainer)

    # 4. Check if trainer has an app (setup complete)
    app_result = await db.execute(select(TrainerApp).where(TrainerApp.trainer_id == trainer.id))
    app = app_result.scalar_one_or_none()

    return {
        "trainer_id": trainer.id,
        "email": trainer.email,
        "name": trainer.name,
        "is_new_user": is_new_user or not trainer.phone,
        "has_app": app is not None,
        "app_id": app.id if app else None,
        "app_name": app.name if app else None
    }
