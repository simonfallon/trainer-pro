"""
Exercise Template Model
"""

from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExerciseTemplate(Base):
    """Exercise template - reusable exercise definitions per discipline."""

    __tablename__ = "exercise_templates"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    trainer_app_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("trainer_apps.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Exercise identification
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    discipline_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # Defines what fields this exercise type expects
    # Example for physio: {"repeticiones": "int", "series": "int", "weight": "float", "variations": "text"}
    # Example for BMX: {"runs": "int", "track_style": "text", "jump_height": "float"}
    field_schema: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Analytics
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

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
    trainer_app: Mapped["TrainerApp"] = relationship(
        "TrainerApp",
        back_populates="exercise_templates",
    )
    session_exercises: Mapped[list["SessionExercise"]] = relationship(
        "SessionExercise",
        back_populates="exercise_template",
    )

    def __repr__(self) -> str:
        return f"<ExerciseTemplate {self.name} ({self.discipline_type})>"


# Import for type hints
from app.models.app import TrainerApp
from app.models.session_exercise import SessionExercise
