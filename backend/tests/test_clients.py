"""
Client API Integration Tests
"""

from datetime import datetime, timedelta

from httpx import AsyncClient

from app.models import Client, Location, SessionExercise, Trainer, TrainingSession


class TestClientEndpoints:
    """Test client CRUD and profile operations."""

    async def test_create_client(self, client: AsyncClient, test_trainer: Trainer, db_session):
        """Test creating a new client with profile fields and location."""
        # Create a location
        location = Location(
            trainer_id=test_trainer.id,
            name="Create Client Location",
            type="gym",
        )
        db_session.add(location)
        await db_session.flush()

        response = await client.post(
            "/clients",
            json={
                "trainer_id": test_trainer.id,
                "name": "New Client",
                "phone": "+57 300 111 2222",
                "email": "newclient@test.com",
                "birth_date": "1995-03-20T00:00:00Z",
                "gender": "F",
                "height_cm": 165,
                "weight_kg": 60.0,
                "default_location_id": location.id,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Client"
        assert data["phone"] == "+57 300 111 2222"
        assert data["gender"] == "F"
        assert data["height_cm"] == 165
        assert data["weight_kg"] == 60.0
        assert data["age"] is not None  # Computed field
        assert data["default_location"] is not None
        assert data["default_location"]["id"] == location.id
        assert data["default_location"]["name"] == "Create Client Location"

    async def test_get_client(self, client: AsyncClient, test_client_record: Client):
        """Test retrieving a client by ID."""
        response = await client.get(f"/clients/{test_client_record.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_client_record.id
        assert data["name"] == test_client_record.name

    async def test_get_client_with_location(
        self, client: AsyncClient, db_session, test_trainer: Trainer
    ):
        """Test retrieving a client with a default location."""
        # Create location
        location = Location(
            trainer_id=test_trainer.id,
            name="Test Location",
            type="gym",
        )
        db_session.add(location)
        await db_session.flush()

        # Create client with location
        db_client = Client(
            trainer_id=test_trainer.id,
            name="Client With Location",
            phone="123",
            default_location_id=location.id,
        )
        db_session.add(db_client)
        await db_session.flush()

        response = await client.get(f"/clients/{db_client.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["default_location"] is not None
        assert data["default_location"]["id"] == location.id
        assert data["default_location"]["name"] == "Test Location"

    async def test_get_client_not_found(self, client: AsyncClient):
        """Test 404 for non-existent client."""
        response = await client.get("/clients/999999")

        assert response.status_code == 404

    async def test_update_client_profile(self, client: AsyncClient, test_client_record: Client):
        """Test updating client profile fields."""
        response = await client.put(
            f"/clients/{test_client_record.id}",
            json={
                "weight_kg": 80.0,
                "height_cm": 182,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["weight_kg"] == 80.0
        assert data["height_cm"] == 182

    async def test_list_clients(
        self, client: AsyncClient, test_trainer: Trainer, test_client_record: Client
    ):
        """Test listing clients for a trainer."""
        response = await client.get(
            "/clients",
            params={"trainer_id": test_trainer.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    async def test_delete_client_soft_delete(
        self, client: AsyncClient, test_client_record: Client, test_trainer: Trainer
    ):
        """Test soft delete of a client."""
        response = await client.delete(f"/clients/{test_client_record.id}")
        assert response.status_code == 204

        # Verify soft deleted - should not appear in list
        list_response = await client.get(
            "/clients",
            params={"trainer_id": test_trainer.id},
        )
        clients = list_response.json()
        client_ids = [c["id"] for c in clients]
        assert test_client_record.id not in client_ids


class TestLapTimesByLocation:
    """Test lap times aggregation by location."""

    async def test_lap_times_grouped_by_session(
        self, client: AsyncClient, db_session, test_trainer: Trainer, test_client_record: Client
    ):
        """Test that lap times are grouped by session with correct statistics."""
        # Create a location
        location = Location(
            trainer_id=test_trainer.id,
            name="Test BMX Track",
            address_line1="Test Address",
            latitude=4.6097,
            longitude=-74.0817,
        )
        db_session.add(location)
        await db_session.flush()

        # Create two sessions at the same location
        session1 = TrainingSession(
            trainer_id=test_trainer.id,
            client_id=test_client_record.id,
            location_id=location.id,
            scheduled_at=datetime.now() - timedelta(days=2),
            duration_minutes=60,
            status="completed",
            is_paid=False,
        )
        session2 = TrainingSession(
            trainer_id=test_trainer.id,
            client_id=test_client_record.id,
            location_id=location.id,
            scheduled_at=datetime.now() - timedelta(days=1),
            duration_minutes=60,
            status="completed",
            is_paid=False,
        )
        db_session.add_all([session1, session2])
        await db_session.flush()

        # Add lap times to session 1
        exercise1 = SessionExercise(
            session_id=session1.id,
            custom_name="Toma de Tiempo BMX",
            data={"lap_times_ms": [45000, 43000, 44000]},  # 45s, 43s, 44s
            order_index=0,
        )
        # Add lap times to session 2
        exercise2 = SessionExercise(
            session_id=session2.id,
            custom_name="Toma de Tiempo BMX",
            data={"lap_times_ms": [42000, 41000]},  # 42s, 41s
            order_index=0,
        )
        db_session.add_all([exercise1, exercise2])
        await db_session.flush()

        # Fetch lap times
        response = await client.get(f"/clients/{test_client_record.id}/lap-times-by-location")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1  # One location

        location_data = data[0]
        assert location_data["location_name"] == "Test BMX Track"
        assert location_data["total_laps"] == 5  # 3 + 2
        assert location_data["best_time_ms"] == 41000  # Best across all sessions
        assert location_data["average_time_ms"] == 43000  # (45+43+44+42+41)/5

        # Check sessions are grouped correctly
        sessions = location_data["sessions"]
        assert len(sessions) == 2

        # Sessions should be sorted newest first
        assert sessions[0]["session_id"] == session2.id
        assert sessions[1]["session_id"] == session1.id

        # Check session 2 stats (newer)
        session2_data = sessions[0]
        assert session2_data["total_laps"] == 2
        assert session2_data["best_time_ms"] == 41000
        assert session2_data["average_time_ms"] == 41500  # (42+41)/2
        assert session2_data["lap_times_ms"] == [42000, 41000]

        # Check session 1 stats (older)
        session1_data = sessions[1]
        assert session1_data["total_laps"] == 3
        assert session1_data["best_time_ms"] == 43000
        assert session1_data["average_time_ms"] == 44000  # (45+43+44)/3
        assert session1_data["lap_times_ms"] == [45000, 43000, 44000]

    async def test_lap_times_single_session(
        self, client: AsyncClient, db_session, test_trainer: Trainer, test_client_record: Client
    ):
        """Test lap times with a single session."""
        location = Location(
            trainer_id=test_trainer.id,
            name="Single Session Track",
            address_line1="Test Address",
        )
        db_session.add(location)
        await db_session.flush()

        session = TrainingSession(
            trainer_id=test_trainer.id,
            client_id=test_client_record.id,
            location_id=location.id,
            scheduled_at=datetime.now(),
            duration_minutes=60,
            status="completed",
            is_paid=False,
        )
        db_session.add(session)
        await db_session.flush()

        exercise = SessionExercise(
            session_id=session.id,
            custom_name="Toma de Tiempo BMX",
            data={"lap_times_ms": [50000]},
            order_index=0,
        )
        db_session.add(exercise)
        await db_session.flush()

        response = await client.get(f"/clients/{test_client_record.id}/lap-times-by-location")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

        location_data = data[0]
        assert location_data["total_laps"] == 1
        assert len(location_data["sessions"]) == 1

    async def test_lap_times_no_data(self, client: AsyncClient, test_client_record: Client):
        """Test lap times endpoint with no lap time data."""
        response = await client.get(f"/clients/{test_client_record.id}/lap-times-by-location")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 0  # No locations with lap times
