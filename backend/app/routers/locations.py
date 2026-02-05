"""
Locations API Router
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.location import Location
from app.schemas.location import LocationCreate, LocationUpdate, LocationResponse

router = APIRouter()


@router.get("", response_model=list[LocationResponse])
async def list_locations(
    trainer_id: int = Query(..., description="Trainer ID to filter locations"),
    db: AsyncSession = Depends(get_db),
):
    """List all locations for a trainer."""
    result = await db.execute(
        select(Location).where(Location.trainer_id == trainer_id)
    )
    return result.scalars().all()


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a location by ID."""
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    
    return location


@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_data: LocationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new location."""
    location = Location(
        trainer_id=location_data.trainer_id,
        name=location_data.name,
        type=location_data.type.value,
        address_line1=location_data.address_line1,
        address_line2=location_data.address_line2,
        city=location_data.city,
        region=location_data.region,
        postal_code=location_data.postal_code,
        country=location_data.country,
        latitude=location_data.latitude,
        longitude=location_data.longitude,
        google_place_id=location_data.google_place_id,
    )
    db.add(location)
    await db.flush()
    await db.refresh(location)
    return location


@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_data: LocationUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a location."""
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    
    update_data = location_data.model_dump(exclude_unset=True)
    if "type" in update_data and update_data["type"]:
        update_data["type"] = update_data["type"].value
    
    for field, value in update_data.items():
        setattr(location, field, value)
    
    await db.flush()
    await db.refresh(location)
    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a location."""
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found",
        )
    
    await db.delete(location)
    await db.flush()
