"""
Trainer App Model
"""
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TrainerApp(Base):
    """Trainer App entity - represents a trainer's personalized app configuration."""
    
    __tablename__ = "trainer_apps"
    
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
    theme_id: Mapped[str] = mapped_column(String(50), nullable=False)
    theme_config: Mapped[dict] = mapped_column(JSON, nullable=False)
    
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
        back_populates="apps",
    )
    exercise_templates: Mapped[list["ExerciseTemplate"]] = relationship(
        "ExerciseTemplate",
        back_populates="trainer_app",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<TrainerApp {self.name} ({self.id})>"


# Import for type hints
from app.models.trainer import Trainer
from app.models.exercise_template import ExerciseTemplate
