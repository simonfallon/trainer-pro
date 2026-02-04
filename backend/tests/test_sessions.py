"""
Session API Integration Tests
"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta

from app.models import Trainer, Client, TrainingSession


class TestSessionEndpoints:
    """Test session CRUD and payment operations."""
    
    async def test_create_session(
        self,
        client: AsyncClient,
        test_trainer: Trainer,
        test_client_record: Client,
    ):
        """Test creating a new training session."""
        scheduled_at = (datetime.now() + timedelta(days=1)).isoformat()
        
        response = await client.post(
            "/sessions",
            json={
                "trainer_id": str(test_trainer.id),
                "client_id": str(test_client_record.id),
                "scheduled_at": scheduled_at,
                "duration_minutes": 60,
                "notes": "Test session",
                "session_doc": "Workout notes here",
            },
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["client_id"] == str(test_client_record.id)
        assert data["duration_minutes"] == 60
        assert data["session_doc"] == "Workout notes here"
        assert data["is_paid"] is False
    
    async def test_get_session(self, client: AsyncClient, test_session: TrainingSession):
        """Test retrieving a session by ID."""
        response = await client.get(f"/sessions/{test_session.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_session.id)
    
    async def test_update_session_doc(self, client: AsyncClient, test_session: TrainingSession):
        """Test updating session documentation."""
        response = await client.put(
            f"/sessions/{test_session.id}",
            json={
                "session_doc": "Updated workout: 3x10 squats, 3x10 deadlifts",
            },
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["session_doc"] == "Updated workout: 3x10 squats, 3x10 deadlifts"
    
    async def test_toggle_session_payment(self, client: AsyncClient, test_session: TrainingSession):
        """Test toggling session payment status."""
        # Initially not paid
        assert test_session.is_paid is False
        
        # Toggle to paid
        response = await client.patch(f"/sessions/{test_session.id}/payment")
        assert response.status_code == 200
        data = response.json()
        assert data["is_paid"] is True
        assert data["paid_at"] is not None
        
        # Toggle back to unpaid
        response = await client.patch(f"/sessions/{test_session.id}/payment")
        assert response.status_code == 200
        data = response.json()
        assert data["is_paid"] is False
        assert data["paid_at"] is None
    
    async def test_update_session_status(self, client: AsyncClient, test_session: TrainingSession):
        """Test updating session status."""
        response = await client.put(
            f"/sessions/{test_session.id}",
            json={"status": "completed"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
    
    async def test_delete_session_cancels(self, client: AsyncClient, test_session: TrainingSession):
        """Test that deleting a session cancels it."""
        response = await client.delete(f"/sessions/{test_session.id}")
        assert response.status_code == 204
        
        # Verify session is cancelled
        get_response = await client.get(f"/sessions/{test_session.id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["status"] == "cancelled"
