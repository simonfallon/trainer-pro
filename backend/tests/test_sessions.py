"""
Session API Integration Tests
"""

from datetime import datetime, timedelta

from httpx import AsyncClient

from app.models import Client, Trainer, TrainingSession


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
                "trainer_id": test_trainer.id,
                "client_id": test_client_record.id,
                "scheduled_at": scheduled_at,
                "duration_minutes": 60,
                "notes": "Test session",
                "session_doc": "Workout notes here",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["client_id"] == test_client_record.id
        assert data["duration_minutes"] == 60
        assert data["session_doc"] == "Workout notes here"
        assert data["is_paid"] is False

    async def test_get_session(self, client: AsyncClient, test_session: TrainingSession):
        """Test retrieving a session by ID."""
        response = await client.get(f"/sessions/{test_session.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_session.id

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

    async def test_delete_session_group_cancels_all_sessions(
        self,
        client: AsyncClient,
        test_trainer: Trainer,
        test_client_record: Client,
    ):
        """Test that deleting a session group cancels all sessions within it."""
        from datetime import datetime, timedelta

        other_client_data = {
            "trainer_id": test_trainer.id,
            "name": "Second Client",
            "phone": "5555555556",
        }
        resp = await client.post("/clients", json=other_client_data)
        other_client_id = resp.json()["id"]

        group_data = {
            "trainer_id": test_trainer.id,
            "client_ids": [test_client_record.id, other_client_id],
            "scheduled_at": (datetime.now() + timedelta(days=2)).isoformat(),
            "duration_minutes": 60,
        }
        resp = await client.post("/sessions/group", json=group_data)
        assert resp.status_code == 201
        group = resp.json()
        group_id = group["id"]

        assert len(group["sessions"]) == 2
        session_ids = [s["id"] for s in group["sessions"]]

        delete_resp = await client.delete(f"/sessions/groups/{group_id}")
        assert delete_resp.status_code == 204

        for sid in session_ids:
            get_resp = await client.get(f"/sessions/{sid}")
            assert get_resp.status_code == 200
            assert get_resp.json()["status"] == "cancelled"

    async def test_list_sessions_filter_by_client(
        self,
        client: AsyncClient,
        test_trainer: Trainer,
        test_client_record: Client,
        test_session: TrainingSession,
    ):
        """Test filtering sessions by client."""
        # Create another client and session
        other_client_data = {
            "trainer_id": test_trainer.id,
            "name": "Other Client",
            "phone": "5555555555",
        }
        resp = await client.post("/clients", json=other_client_data)
        other_client_id = resp.json()["id"]

        other_session_data = {
            "trainer_id": test_trainer.id,
            "client_id": other_client_id,
            "scheduled_at": (datetime.now() + timedelta(days=2)).isoformat(),
            "duration_minutes": 60,
            "notes": "Other session",
        }
        await client.post("/sessions", json=other_session_data)

        # List all sessions
        response = await client.get(f"/sessions?trainer_id={test_trainer.id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

        # Filter by original client
        response = await client.get(
            f"/sessions?trainer_id={test_trainer.id}&client_id={test_client_record.id}"
        )
        assert response.status_code == 200
        data = response.json()
        # Should only have sessions for this client
        assert all(s["client_id"] == test_client_record.id for s in data)
        # Should contain our test_session
        assert any(s["id"] == test_session.id for s in data)

        # Filter by other client
        response = await client.get(
            f"/sessions?trainer_id={test_trainer.id}&client_id={other_client_id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert all(s["client_id"] == other_client_id for s in data)

    async def test_active_session_group_priority(
        self,
        client: AsyncClient,
        test_trainer: Trainer,
        test_client_record: Client,
        test_session: TrainingSession,
    ):
        """Test that get_active_session correctly returns the most recently started session, bypassing old individuals if a new group was started."""
        # 1. Start an old individual session and leave it in progress
        from datetime import UTC, datetime, timedelta

        old_time = (datetime.now(UTC) - timedelta(hours=1)).isoformat()
        await client.put(
            f"/sessions/{test_session.id}",
            json={"status": "in_progress", "started_at": old_time},
        )

        # 2. Add another client
        other_client_data = {
            "trainer_id": test_trainer.id,
            "name": "Other Client",
            "phone": "5555555555",
        }
        resp = await client.post("/clients", json=other_client_data)
        other_client_id = resp.json()["id"]

        # 3. Create a new active group session containing both clients
        start_resp = await client.post(
            "/sessions/active/start",
            json={
                "client_ids": [test_client_record.id, other_client_id],
                "duration_minutes": 60,
                "notes": "Group session!",
            },
        )
        assert start_resp.status_code == 201

        # 4. Fetch the active session, it should be the new group session (which has 'sessions')
        active_resp = await client.get("/sessions/active")
        assert active_resp.status_code == 200
        active_data = active_resp.json()

        assert "sessions" in active_data
        assert len(active_data["sessions"]) == 2
        assert active_data["notes"] == "Group session!"
