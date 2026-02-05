"""
Trainer Model
"""
from datetime import datetime
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Trainer(Base):
    """Trainer entity - the main user of the platform."""
    
    __tablename__ = "trainers"
    
    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_refresh_token: Mapped[str | None] = mapped_column(String, nullable=True)
    google_access_token: Mapped[str | None] = mapped_column(String, nullable=True)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
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
    apps: Mapped[list["TrainerApp"]] = relationship(
        "TrainerApp",
        back_populates="trainer",
        cascade="all, delete-orphan",
    )
    locations: Mapped[list["Location"]] = relationship(
        "Location",
        back_populates="trainer",
        cascade="all, delete-orphan",
    )
    clients: Mapped[list["Client"]] = relationship(
        "Client",
        back_populates="trainer",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[list["TrainingSession"]] = relationship(
        "TrainingSession",
        back_populates="trainer",
        cascade="all, delete-orphan",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="trainer",
        cascade="all, delete-orphan",
    )
    
    def __repr__(self) -> str:
        return f"<Trainer {self.name} ({self.id})>"


# Import for type hints - avoid circular import
from app.models.app import TrainerApp
from app.models.location import Location
from app.models.client import Client
from app.models.session import TrainingSession
from app.models.payment import Payment
