"""
Tests for active session endpoints
"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.asyncio
async def test_start_multi_client_session(client: AsyncClient, test_trainer, test_app):
    """Test starting a session with multiple clients."""
    # Create 3 test clients
    client_data = []
    for i in range(3):
        response = await client.post(
            "/clients",
            json={
                "trainer_id": test_trainer.id,
                "name": f"Test Client {i+1}",
                "phone": f"555-000{i}",
            },
        )
        assert response.status_code == 201
        client_data.append(response.json())

    # Start an ad-hoc session with all 3 clients
    session_response = await client.post(
        "/sessions/active/start",
        json={
            "trainer_id": test_trainer.id,
            "client_ids": [c["id"] for c in client_data],
            "duration_minutes": 60,
            "notes": "Multi-client test session",
        },
    )
    assert session_response.status_code == 200
    session_data = session_response.json()

    # Should return a SessionGroup
    assert "sessions" in session_data, "Response should be a SessionGroup with sessions"
    assert len(session_data["sessions"]) == 3, f"Should have 3 sessions, got {len(session_data.get('sessions', []))}"

    # All sessions should be in_progress
    for session in session_data["sessions"]:
        assert session["status"] == "in_progress"
        assert session["client_id"] in [c["id"] for c in client_data]

    return session_data


@pytest.mark.asyncio
async def test_get_active_session_multi_client(client: AsyncClient, test_trainer, test_app):
    """Test getting an active session with multiple clients."""
    # Create 3 test clients
    client_data = []
    for i in range(3):
        response = await client.post(
            "/clients",
            json={
                "trainer_id": test_trainer.id,
                "name": f"Test Client {i+1}",
                "phone": f"555-000{i}",
            },
        )
        assert response.status_code == 201
        client_data.append(response.json())

    # Start an ad-hoc session
    await client.post(
        "/sessions/active/start",
        json={
            "trainer_id": test_trainer.id,
            "client_ids": [c["id"] for c in client_data],
            "duration_minutes": 60,
        },
    )

    # Get the active session
    response = await client.get(f"/sessions/active?trainer_id={test_trainer.id}")
    assert response.status_code == 200
    data = response.json()

    # Should return a SessionGroup with sessions
    assert "sessions" in data, "Response should include sessions array"
    assert len(data["sessions"]) == 3, f"Should have 3 sessions, got {len(data.get('sessions', []))}"

    # Each session should have client_id
    client_ids = [s["client_id"] for s in data["sessions"]]
    assert len(client_ids) == 3
    assert all(cid in [c["id"] for c in client_data] for cid in client_ids)


@pytest.mark.asyncio
async def test_get_active_session_single_client(client: AsyncClient, test_trainer, test_app):
    """Test getting an active session with a single client."""
    # Create a test client
    response = await client.post(
        "/clients",
        json={
            "trainer_id": test_trainer.id,
            "name": "Solo Client",
            "phone": "555-0000",
        },
    )
    assert response.status_code == 201
    client_data = response.json()

    # Start an ad-hoc session with one client
    await client.post(
        "/sessions/active/start",
        json={
            "trainer_id": test_trainer.id,
            "client_ids": [client_data["id"]],
            "duration_minutes": 60,
        },
    )

    # Get the active session
    response = await client.get(f"/sessions/active?trainer_id={test_trainer.id}")
    assert response.status_code == 200
    data = response.json()

    # Should return a single SessionResponse (not a group)
    assert "client_id" in data, "Response should be a single session with client_id"
    assert "sessions" not in data, "Single client sessions should not have sessions array"
    assert data["client_id"] == client_data["id"]
    assert data["status"] == "in_progress"


@pytest.mark.asyncio
async def test_no_active_session(client: AsyncClient, test_trainer):
    """Test getting active session when none exists."""
    response = await client.get(f"/sessions/active?trainer_id={test_trainer.id}")
    assert response.status_code == 200
    # Should return null/None
    assert response.json() is None or response.text == "null"
