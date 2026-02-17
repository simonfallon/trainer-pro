"""
Session Group Model
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SessionGroup(Base):
    """Session Group entity - groups multiple training sessions that occur together."""

    __tablename__ = "session_groups"

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
    location_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )

    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        default=60,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

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
        back_populates="session_groups",
    )
    location: Mapped["Location | None"] = relationship(
        "Location",
        back_populates="session_groups",
    )
    sessions: Mapped[list["TrainingSession"]] = relationship(
        "TrainingSession",
        back_populates="session_group",
        cascade="all, delete-orphan",
    )
    exercises: Mapped[list["SessionExercise"]] = relationship(
        "SessionExercise",
        back_populates="session_group",
        cascade="all, delete-orphan",
        order_by="SessionExercise.order_index",
    )
    exercise_sets: Mapped[list["ExerciseSet"]] = relationship(
        "ExerciseSet",
        back_populates="session_group",
        cascade="all, delete-orphan",
        order_by="ExerciseSet.order_index",
    )

    def __repr__(self) -> str:
        return f"<SessionGroup {self.scheduled_at} ({len(self.sessions)} clients)>"


# Import for type hints
from app.models.exercise_set import ExerciseSet
from app.models.location import Location
from app.models.session import TrainingSession
from app.models.session_exercise import SessionExercise
from app.models.trainer import Trainer
