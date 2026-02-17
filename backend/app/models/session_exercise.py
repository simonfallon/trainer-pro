"""
Session Exercise Model
"""

from datetime import datetime

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SessionExercise(Base):
    """Exercise instance - actual exercises performed in a session."""

    __tablename__ = "session_exercises"

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

    # Link to template (nullable for ad-hoc exercises)
    exercise_template_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("exercise_templates.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Link to exercise set (nullable - exercises can exist independently or within a set)
    exercise_set_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("exercise_sets.id", ondelete="CASCADE"),
        nullable=True,
    )

    # For ad-hoc exercises not based on a template
    custom_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Flexible JSONB field for discipline-specific data
    # Example physio: {"repeticiones": 12, "series": 3, "weight": 25.5, "variations": "con banda"}
    # Example BMX: {"runs": 5, "duracion_total": "00:05:23", "tiempos_vuelta": ["00:01:05", "00:01:03"]}
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Order of exercises in the session
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    # Relationships
    session: Mapped["TrainingSession | None"] = relationship(
        "TrainingSession",
        back_populates="exercises",
    )
    session_group: Mapped["SessionGroup | None"] = relationship(
        "SessionGroup",
        back_populates="exercises",
    )
    exercise_template: Mapped["ExerciseTemplate | None"] = relationship(
        "ExerciseTemplate",
        back_populates="session_exercises",
    )
    exercise_set: Mapped["ExerciseSet | None"] = relationship(
        "ExerciseSet",
        back_populates="exercises",
    )

    # Ensure either session_id or session_group_id is set, but not both
    __table_args__ = (
        CheckConstraint(
            "(session_id IS NOT NULL AND session_group_id IS NULL) OR "
            "(session_id IS NULL AND session_group_id IS NOT NULL)",
            name="check_session_xor_group",
        ),
    )

    def __repr__(self) -> str:
        name = self.custom_name if self.custom_name else f"Template#{self.exercise_template_id}"
        set_info = f" in Set#{self.exercise_set_id}" if self.exercise_set_id else ""
        return f"<SessionExercise {name}{set_info}>"


# Import for type hints
from app.models.exercise_set import ExerciseSet
from app.models.exercise_template import ExerciseTemplate
from app.models.session import TrainingSession
from app.models.session_group import SessionGroup
