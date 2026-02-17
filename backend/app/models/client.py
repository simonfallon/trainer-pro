"""
Client Model
"""
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Client(Base):
    """Client entity - people trained by the trainer."""

    __tablename__ = "clients"

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
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_location_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Profile fields
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    birth_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 'M', 'F', 'Otro'
    height_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Soft delete
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Relationships
    trainer: Mapped["Trainer"] = relationship(
        "Trainer",
        back_populates="clients",
    )
    default_location: Mapped["Location | None"] = relationship(
        "Location",
        back_populates="clients",
        foreign_keys=[default_location_id],
    )
    sessions: Mapped[list["TrainingSession"]] = relationship(
        "TrainingSession",
        back_populates="client",
        cascade="all, delete-orphan",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="client",
        cascade="all, delete-orphan",
    )

    @property
    def is_deleted(self) -> bool:
        """Check if client is soft-deleted."""
        return self.deleted_at is not None

    def __repr__(self) -> str:
        return f"<Client {self.name} ({self.id})>"


# Import for type hints
from app.models.location import Location
from app.models.payment import Payment
from app.models.session import TrainingSession
from app.models.trainer import Trainer
