"""
Exercise Set Model
"""
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExerciseSet(Base):
    """Exercise set - groups exercises for circuit training."""

    __tablename__ = "exercise_sets"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    # Link to either individual session OR group session
    session_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("training_sessions.id", ondelete="CASCADE"),
        nullable=True,
    )
    session_group_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("session_groups.id", ondelete="CASCADE"),
        nullable=True,
    )

    # Set metadata
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    series: Mapped[int] = mapped_column(Integer, nullable=False)

    # Order of sets in the session
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

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
    session: Mapped["TrainingSession | None"] = relationship(
        "TrainingSession",
        back_populates="exercise_sets",
    )
    session_group: Mapped["SessionGroup | None"] = relationship(
        "SessionGroup",
        back_populates="exercise_sets",
    )
    exercises: Mapped[list["SessionExercise"]] = relationship(
        "SessionExercise",
        back_populates="exercise_set",
        cascade="all, delete-orphan",
        order_by="SessionExercise.order_index",
    )

    # Ensure either session_id or session_group_id is set, but not both
    __table_args__ = (
        CheckConstraint(
            "(session_id IS NOT NULL AND session_group_id IS NULL) OR "
            "(session_id IS NULL AND session_group_id IS NOT NULL)",
            name="check_set_session_xor_group"
        ),
    )

    def __repr__(self) -> str:
        return f"<ExerciseSet {self.name} ({self.series} series, {len(self.exercises)} exercises)>"


# Import for type hints
from app.models.session import TrainingSession
from app.models.session_exercise import SessionExercise
from app.models.session_group import SessionGroup
