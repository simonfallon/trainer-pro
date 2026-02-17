"""
Payment API Integration Tests
"""
from datetime import datetime, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Client, Trainer, TrainingSession


class TestPaymentEndpoints:
    """Test payment registration and balance operations."""

    async def test_get_payment_balance_empty(
        self,
        client: AsyncClient,
        test_client_record: Client,
    ):
        """Test payment balance with no sessions."""
        response = await client.get(
            f"/clients/{test_client_record.id}/payment-balance"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_sessions"] == 0
        assert data["paid_sessions"] == 0
        assert data["unpaid_sessions"] == 0
        assert data["prepaid_sessions"] == 0
        assert data["has_positive_balance"] is False

    async def test_get_payment_balance_with_unpaid_sessions(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_trainer: Trainer,
        test_client_record: Client,
    ):
        """Test payment balance with unpaid sessions."""
        # Create 3 completed sessions
        for i in range(3):
            session = TrainingSession(
                trainer_id=test_trainer.id,
                client_id=test_client_record.id,
                scheduled_at=datetime.now() - timedelta(days=i+1),
                duration_minutes=60,
                status="completed",
                is_paid=False,
            )
            db_session.add(session)
        await db_session.flush()

        response = await client.get(
            f"/clients/{test_client_record.id}/payment-balance"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_sessions"] == 3
        assert data["paid_sessions"] == 0
        assert data["unpaid_sessions"] == 3
        assert data["has_positive_balance"] is False

    async def test_register_payment_marks_sessions_paid(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_trainer: Trainer,
        test_client_record: Client,
    ):
        """Test that registering payment marks oldest unpaid sessions as paid."""
        # Create 5 unpaid sessions with different dates
        sessions = []
        for i in range(5):
            session = TrainingSession(
                trainer_id=test_trainer.id,
                client_id=test_client_record.id,
                scheduled_at=datetime.now() - timedelta(days=10-i),  # Oldest first
                duration_minutes=60,
                status="completed",
                is_paid=False,
            )
            db_session.add(session)
            sessions.append(session)
        await db_session.flush()

        # Register payment for 3 sessions
        response = await client.post(
            f"/clients/{test_client_record.id}/payments",
            json={
                "sessions_paid": 3,
                "amount_cop": 150000,
                "notes": "Pago en efectivo",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["sessions_paid"] == 3
        assert data["amount_cop"] == 150000

        # Check balance - should have 3 paid, 2 unpaid
        balance_response = await client.get(
            f"/clients/{test_client_record.id}/payment-balance"
        )
        balance = balance_response.json()
        assert balance["paid_sessions"] == 3
        assert balance["unpaid_sessions"] == 2

    async def test_register_prepaid_sessions(
        self,
        client: AsyncClient,
        test_client_record: Client,
    ):
        """Test registering payment for more sessions than currently exist."""
        # Register payment for 10 sessions when there are none
        response = await client.post(
            f"/clients/{test_client_record.id}/payments",
            json={
                "sessions_paid": 10,
                "amount_cop": 500000,
            },
        )

        assert response.status_code == 201

        # Check balance - should show prepaid sessions
        balance_response = await client.get(
            f"/clients/{test_client_record.id}/payment-balance"
        )
        balance = balance_response.json()
        assert balance["prepaid_sessions"] == 10
        assert balance["has_positive_balance"] is True

    async def test_get_client_sessions(
        self,
        client: AsyncClient,
        test_client_record: Client,
        test_session: TrainingSession,
    ):
        """Test getting all sessions for a specific client."""
        response = await client.get(
            f"/clients/{test_client_record.id}/sessions"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(s["id"] == test_session.id for s in data)

    async def test_payment_balance_not_found(self, client: AsyncClient):
        """Test 404 for non-existent client payment balance."""
        response = await client.get(
            "/clients/999999/payment-balance"
        )
        assert response.status_code == 404
