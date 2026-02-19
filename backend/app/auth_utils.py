"""
JWT authentication utilities.
Provides token creation, decoding, and a FastAPI dependency for protected routes.
"""

from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Cookie, HTTPException, status

from app.config import get_settings

COOKIE_NAME = "trainer_session"


def create_session_token(trainer_id: int) -> str:
    """Create a signed JWT for a trainer session."""
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(hours=settings.jwt_expire_hours)
    payload = {
        "sub": str(trainer_id),
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_session_token(token: str) -> int:
    """Decode and validate JWT. Returns trainer_id. Raises HTTPException on failure."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return int(payload["sub"])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión expirada"
        ) from exc
    except (jwt.InvalidTokenError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido"
        ) from exc


async def get_current_trainer_id(
    trainer_session: str | None = Cookie(default=None),
) -> int:
    """FastAPI dependency: extracts and validates trainer_id from session cookie."""
    if not trainer_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado",
        )
    return decode_session_token(trainer_session)
