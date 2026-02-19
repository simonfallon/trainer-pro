"""
Location Model
"""

from datetime import UTC, datetime
from enum import Enum as PyEnum

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class LocationType(str, PyEnum):
    """Location type enumeration."""

    TRAINER_BASE = "trainer_base"
    CLIENT_HOME = "client_home"
    GYM = "gym"
    TRACK = "track"
    OTHER = "other"


class Location(Base):
    """Location entity - training venues and spots."""

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    trainer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("trainers.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(
        String(20),
        default=LocationType.OTHER.value,
        nullable=False,
    )

    # Address fields
    address_line1: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Geo coordinates
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)
    google_place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    # Relationships
    trainer: Mapped["Trainer"] = relationship(
        "Trainer",
        back_populates="locations",
    )
    clients: Mapped[list["Client"]] = relationship(
        "Client",
        back_populates="default_location",
        foreign_keys="[Client.default_location_id]",
    )
    sessions: Mapped[list["TrainingSession"]] = relationship(
        "TrainingSession",
        back_populates="location",
    )
    session_groups: Mapped[list["SessionGroup"]] = relationship(
        "SessionGroup",
        back_populates="location",
    )

    def __repr__(self) -> str:
        return f"<Location {self.name} ({self.type})>"


# Import for type hints
from app.models.client import Client
from app.models.session import TrainingSession
from app.models.session_group import SessionGroup
from app.models.trainer import Trainer
