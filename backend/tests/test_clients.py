"""
Client API Integration Tests
"""
import pytest
from httpx import AsyncClient
from datetime import datetime

from app.models import Trainer, Client


class TestClientEndpoints:
    """Test client CRUD and profile operations."""
    
    async def test_create_client(self, client: AsyncClient, test_trainer: Trainer):
        """Test creating a new client with profile fields."""
        response = await client.post(
            "/clients",
            json={
                "trainer_id": str(test_trainer.id),
                "name": "New Client",
                "phone": "+57 300 111 2222",
                "email": "newclient@test.com",
                "birth_date": "1995-03-20T00:00:00Z",
                "gender": "F",
                "height_cm": 165,
                "weight_kg": 60.0,
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
    
    async def test_get_client(self, client: AsyncClient, test_client_record: Client):
        """Test retrieving a client by ID."""
        response = await client.get(f"/clients/{test_client_record.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_client_record.id)
        assert data["name"] == test_client_record.name
    
    async def test_get_client_not_found(self, client: AsyncClient):
        """Test 404 for non-existent client."""
        from uuid import uuid4
        response = await client.get(f"/clients/{uuid4()}")
        
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
    
    async def test_list_clients(self, client: AsyncClient, test_trainer: Trainer, test_client_record: Client):
        """Test listing clients for a trainer."""
        response = await client.get(
            "/clients",
            params={"trainer_id": str(test_trainer.id)},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    async def test_delete_client_soft_delete(self, client: AsyncClient, test_client_record: Client, test_trainer: Trainer):
        """Test soft delete of a client."""
        response = await client.delete(f"/clients/{test_client_record.id}")
        assert response.status_code == 204
        
        # Verify soft deleted - should not appear in list
        list_response = await client.get(
            "/clients",
            params={"trainer_id": str(test_trainer.id)},
        )
        clients = list_response.json()
        client_ids = [c["id"] for c in clients]
        assert str(test_client_record.id) not in client_ids
