"""
Payment Schemas
"""
from datetime import datetime
from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    """Schema for creating a payment (registering bulk session payments)."""
    sessions_paid: int = Field(..., ge=1, le=100, description="Number of sessions being paid")
    amount_cop: int = Field(..., ge=0, description="Total amount in Colombian Pesos")
    notes: str | None = None
    payment_date: datetime | None = None  # Defaults to now if not provided


class PaymentResponse(BaseModel):
    """Schema for payment response."""
    id: int
    client_id: int
    trainer_id: int
    sessions_paid: int
    amount_cop: int
    payment_date: datetime
    notes: str | None = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class PaymentBalanceResponse(BaseModel):
    """Schema for client payment balance."""
    total_sessions: int = Field(..., description="Total completed/scheduled sessions")
    paid_sessions: int = Field(..., description="Number of paid sessions")
    unpaid_sessions: int = Field(..., description="Number of unpaid sessions")
    prepaid_sessions: int = Field(..., description="Sessions paid in advance (positive balance)")
    has_positive_balance: bool = Field(..., description="True if client has prepaid sessions")
    total_amount_paid_cop: int = Field(..., description="Total amount paid in Colombian Pesos")

