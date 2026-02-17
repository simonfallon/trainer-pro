"""
Training Session Model
"""
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SessionStatus(str, PyEnum):
    """Training session status."""
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TrainingSession(Base):
    """Training Session entity - scheduled training appointments."""

    __tablename__ = "training_sessions"

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
    client_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    location_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )
    session_group_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("session_groups.id", ondelete="CASCADE"),
        nullable=True,
    )

    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        default=60,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default=SessionStatus.SCHEDULED.value,
        nullable=False,
    )

    # Payment tracking
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Session documentation (trainer's notes about the session)
    session_doc: Mapped[str | None] = mapped_column(Text, nullable=True)

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
        back_populates="sessions",
    )
    client: Mapped["Client"] = relationship(
        "Client",
        back_populates="sessions",
    )
    location: Mapped["Location | None"] = relationship(
        "Location",
        back_populates="sessions",
    )
    session_group: Mapped["SessionGroup | None"] = relationship(
        "SessionGroup",
        back_populates="sessions",
    )
    exercises: Mapped[list["SessionExercise"]] = relationship(
        "SessionExercise",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SessionExercise.order_index",
    )
    exercise_sets: Mapped[list["ExerciseSet"]] = relationship(
        "ExerciseSet",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ExerciseSet.order_index",
    )

    def __repr__(self) -> str:
        return f"<TrainingSession {self.scheduled_at} ({self.status})>"


# Import for type hints
from app.models.client import Client
from app.models.exercise_set import ExerciseSet
from app.models.location import Location
from app.models.session_exercise import SessionExercise
from app.models.session_group import SessionGroup
from app.models.trainer import Trainer
