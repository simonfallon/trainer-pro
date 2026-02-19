"""
Apps API Router
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth_utils import get_current_trainer_id
from app.database import get_db
from app.models.app import TrainerApp
from app.schemas.app import AppCreate, AppResponse, AppUpdate

router = APIRouter()


async def _get_app_owned_by(app_id: int, trainer_id: int, db: AsyncSession) -> TrainerApp:
    """Fetch an app and verify it belongs to the authenticated trainer."""
    result = await db.execute(select(TrainerApp).where(TrainerApp.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")
    if app.trainer_id != trainer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado")
    return app


@router.get("", response_model=list[AppResponse])
async def list_apps(
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """List all apps for the authenticated trainer."""
    result = await db.execute(select(TrainerApp).where(TrainerApp.trainer_id == trainer_id))
    return result.scalars().all()


@router.get("/{app_id}", response_model=AppResponse)
async def get_app(
    app_id: int,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Get an app by ID."""
    return await _get_app_owned_by(app_id, trainer_id, db)


@router.post("", response_model=AppResponse, status_code=status.HTTP_201_CREATED)
async def create_app(
    app_data: AppCreate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new app with theme configuration."""
    app = TrainerApp(
        trainer_id=trainer_id,
        name=app_data.name,
        theme_id=app_data.theme_id,
        theme_config=app_data.theme_config.model_dump(),
    )
    db.add(app)
    await db.flush()
    await db.refresh(app)
    return app


@router.put("/{app_id}", response_model=AppResponse)
async def update_app(
    app_id: int,
    app_data: AppUpdate,
    trainer_id: int = Depends(get_current_trainer_id),
    db: AsyncSession = Depends(get_db),
):
    """Update an app."""
    app = await _get_app_owned_by(app_id, trainer_id, db)

    update_data = app_data.model_dump(exclude_unset=True)
    if "theme_config" in update_data and update_data["theme_config"]:
        update_data["theme_config"] = update_data["theme_config"]

    for field, value in update_data.items():
        setattr(app, field, value)

    await db.flush()
    await db.refresh(app)
    return app
