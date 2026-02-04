"""
Trainer App Model
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TrainerApp(Base):
    """Trainer App entity - represents a trainer's personalized app configuration."""
    
    __tablename__ = "trainer_apps"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    trainer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
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
    
    def __repr__(self) -> str:
        return f"<TrainerApp {self.name} ({self.id})>"


# Import for type hints
from app.models.trainer import Trainer
