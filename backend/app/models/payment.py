"""
Payment Model
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Payment(Base):
    """Payment record for tracking bulk session payments."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    client_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
    )
    trainer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("trainers.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Number of sessions covered by this payment
    sessions_paid: Mapped[int] = mapped_column(Integer, nullable=False)

    # Amount in Colombian Pesos
    amount_cop: Mapped[int] = mapped_column(Integer, nullable=False)

    # When the payment was made
    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
    )

    # Relationships
    client: Mapped["Client"] = relationship(
        "Client",
        back_populates="payments",
    )
    trainer: Mapped["Trainer"] = relationship(
        "Trainer",
        back_populates="payments",
    )

    def __repr__(self) -> str:
        return f"<Payment {self.sessions_paid} sessions - {self.amount_cop} COP>"


# Import for type hints
from app.models.client import Client
from app.models.trainer import Trainer
