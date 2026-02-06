"""
Integration tests for Exercise Sets API
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_exercise_set_for_session(client: AsyncClient, test_session, test_app):
    """Test creating an exercise set for an individual session."""
    # Create some exercise templates first
    template1_data = {
        "trainer_app_id": test_app.id,
        "name": "Sentadillas",
        "discipline_type": "physio",
        "field_schema": {
            "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
            "peso": {"type": "float", "label": "Peso (kg)", "required": False},
        },
    }
    template1_resp = await client.post("/exercise-templates", json=template1_data)
    assert template1_resp.status_code == 201
    template1 = template1_resp.json()
    
    # Create exercise set with exercises
    set_data = {
        "name": "Circuito de Piernas",
        "series": 3,
        "exercises": [
            {
                "exercise_template_id": template1["id"],
                "data": {"repeticiones": 10, "peso": 50.0},
                "order_index": 0,
            },
            {
                "custom_name": "Estocadas",
                "data": {"repeticiones": 12},
                "order_index": 1,
            },
        ],
    }
    
    response = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
    assert response.status_code == 201
    
    exercise_set = response.json()
    assert exercise_set["name"] == "Circuito de Piernas"
    assert exercise_set["series"] == 3
    assert exercise_set["session_id"] == test_session.id
    assert exercise_set["session_group_id"] is None
    assert len(exercise_set["exercises"]) == 2
    
    # Verify exercises are in correct order
    assert exercise_set["exercises"][0]["exercise_template_id"] == template1["id"]
    assert exercise_set["exercises"][0]["data"]["repeticiones"] == 10
    assert exercise_set["exercises"][1]["custom_name"] == "Estocadas"


@pytest.mark.asyncio
async def test_create_exercise_set_for_group(client: AsyncClient, test_session_group, test_app):
    """Test creating an exercise set for a session group."""
    set_data = {
        "name": "Circuito Grupal",
        "series": 4,
        "exercises": [
            {
                "custom_name": "Burpees",
                "data": {"repeticiones": 15},
                "order_index": 0,
            },
        ],
    }
    
    response = await client.post(f"/exercise-sets/session-groups/{test_session_group.id}", json=set_data)
    assert response.status_code == 201
    
    exercise_set = response.json()
    assert exercise_set["name"] == "Circuito Grupal"
    assert exercise_set["series"] == 4
    assert exercise_set["session_id"] is None
    assert exercise_set["session_group_id"] == test_session_group.id


@pytest.mark.asyncio
async def test_list_exercise_sets_for_session(client: AsyncClient, test_session, test_app):
    """Test listing exercise sets for a session."""
    # Create two exercise sets
    for i in range(2):
        set_data = {
            "name": f"Circuito {i + 1}",
            "series": 3,
            "exercises": [
                {
                    "custom_name": f"Ejercicio {i + 1}",
                    "data": {"repeticiones": 10},
                    "order_index": 0,
                },
            ],
        }
        resp = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
        assert resp.status_code == 201
    
    # List all sets for the session
    response = await client.get(f"/exercise-sets/sessions/{test_session.id}/sets")
    assert response.status_code == 200
    
    sets = response.json()
    assert len(sets) == 2
    assert sets[0]["name"] == "Circuito 1"
    assert sets[1]["name"] == "Circuito 2"


@pytest.mark.asyncio
async def test_get_exercise_set(client: AsyncClient, test_session):
    """Test getting a specific exercise set."""
    # Create a set
    set_data = {
        "name": "Test Set",
        "series": 2,
        "exercises": [
            {
                "custom_name": "Test Exercise",
                "data": {"repeticiones": 5},
                "order_index": 0,
            },
        ],
    }
    create_resp = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
    assert create_resp.status_code == 201
    set_id = create_resp.json()["id"]
    
    # Get the set
    response = await client.get(f"/exercise-sets/{set_id}")
    assert response.status_code == 200
    
    exercise_set = response.json()
    assert exercise_set["id"] == set_id
    assert exercise_set["name"] == "Test Set"
    assert len(exercise_set["exercises"]) == 1


@pytest.mark.asyncio
async def test_update_exercise_set_metadata(client: AsyncClient, test_session):
    """Test updating exercise set name and series."""
    # Create a set
    set_data = {
        "name": "Original Name",
        "series": 2,
        "exercises": [],
    }
    create_resp = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
    set_id = create_resp.json()["id"]
    
    # Update metadata
    update_data = {
        "name": "Updated Name",
        "series": 5,
    }
    response = await client.put(f"/exercise-sets/{set_id}", json=update_data)
    assert response.status_code == 200
    
    updated_set = response.json()
    assert updated_set["name"] == "Updated Name"
    assert updated_set["series"] == 5


@pytest.mark.asyncio
async def test_delete_exercise_set(client: AsyncClient, test_session):
    """Test deleting an exercise set."""
    # Create a set
    set_data = {
        "name": "To Delete",
        "series": 1,
        "exercises": [
            {
                "custom_name": "Exercise",
                "data": {},
                "order_index": 0,
            },
        ],
    }
    create_resp = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
    set_id = create_resp.json()["id"]
    
    # Delete the set
    response = await client.delete(f"/exercise-sets/{set_id}")
    assert response.status_code == 204
    
    # Verify it's gone
    get_resp = await client.get(f"/exercise-sets/{set_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_reorder_exercises_in_set(client: AsyncClient, test_session):
    """Test reordering exercises within a set."""
    # Create a set with 3 exercises
    set_data = {
        "name": "Reorder Test",
        "series": 1,
        "exercises": [
            {"custom_name": "Exercise A", "data": {}, "order_index": 0},
            {"custom_name": "Exercise B", "data": {}, "order_index": 1},
            {"custom_name": "Exercise C", "data": {}, "order_index": 2},
        ],
    }
    create_resp = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
    exercise_set = create_resp.json()
    set_id = exercise_set["id"]
    
    # Get exercise IDs
    exercise_ids = [ex["id"] for ex in exercise_set["exercises"]]
    
    # Reorder: C, A, B
    new_order = [exercise_ids[2], exercise_ids[0], exercise_ids[1]]
    response = await client.put(f"/exercise-sets/{set_id}/reorder", json=new_order)
    assert response.status_code == 200
    
    reordered = response.json()
    assert len(reordered) == 3
    assert reordered[0]["custom_name"] == "Exercise C"
    assert reordered[1]["custom_name"] == "Exercise A"
    assert reordered[2]["custom_name"] == "Exercise B"


@pytest.mark.asyncio
async def test_exercise_set_xor_constraint(client: AsyncClient, test_session, test_session_group):
    """Test that exercise sets enforce session XOR session_group constraint."""
    # This is enforced at the database level via CHECK constraint
    # The API should only allow creating sets via the correct endpoints
    
    # Create set for session - should work
    set_data = {
        "name": "Session Set",
        "series": 1,
        "exercises": [],
    }
    resp1 = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
    assert resp1.status_code == 201
    assert resp1.json()["session_id"] == test_session.id
    assert resp1.json()["session_group_id"] is None
    
    # Create set for group - should work
    resp2 = await client.post(f"/exercise-sets/session-groups/{test_session_group.id}", json=set_data)
    assert resp2.status_code == 201
    assert resp2.json()["session_id"] is None
    assert resp2.json()["session_group_id"] == test_session_group.id


@pytest.mark.asyncio
async def test_template_usage_count_increment(client: AsyncClient, test_session, test_app):
    """Test that using a template in a set increments its usage count."""
    # Create template
    template_data = {
        "trainer_app_id": test_app.id,
        "name": "Test Template",
        "discipline_type": "physio",
        "field_schema": {"reps": {"type": "integer", "label": "Reps", "required": True}},
    }
    template_resp = await client.post("/exercise-templates", json=template_data)
    template = template_resp.json()
    assert template["usage_count"] == 0
    
    # Create set using the template
    set_data = {
        "name": "Usage Test",
        "series": 1,
        "exercises": [
            {
                "exercise_template_id": template["id"],
                "data": {"reps": 10},
                "order_index": 0,
            },
        ],
    }
    await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
    
    # Check template usage count
    template_get_resp = await client.get(f"/exercise-templates/{template['id']}")
    updated_template = template_get_resp.json()
    assert updated_template["usage_count"] == 1


@pytest.mark.asyncio
async def test_exercise_set_cascade_delete(client: AsyncClient, test_session):
    """Test that deleting a set also deletes its exercises."""
    # Create a set with exercises
    set_data = {
        "name": "Cascade Test",
        "series": 1,
        "exercises": [
            {"custom_name": "Ex 1", "data": {}, "order_index": 0},
            {"custom_name": "Ex 2", "data": {}, "order_index": 1},
        ],
    }
    create_resp = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
    exercise_set = create_resp.json()
    set_id = exercise_set["id"]
    exercise_ids = [ex["id"] for ex in exercise_set["exercises"]]
    
    # Delete the set
    await client.delete(f"/exercise-sets/{set_id}")
    
    # Verify exercises are also deleted
    # (They should not appear in session exercises list)
    session_exercises_resp = await client.get(f"/sessions/{test_session.id}/exercises")
    assert session_exercises_resp.status_code == 200
    session_exercises = session_exercises_resp.json()
    
    for exercise_id in exercise_ids:
        assert not any(ex["id"] == exercise_id for ex in session_exercises)


@pytest.mark.asyncio
async def test_create_set_with_nonexistent_session(client: AsyncClient):
    """Test creating a set for a non-existent session returns 404."""
    set_data = {
        "name": "Invalid",
        "series": 1,
        "exercises": [],
    }
    response = await client.post("/exercise-sets/sessions/99999", json=set_data)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_order_index_auto_increment(client: AsyncClient, test_session):
    """Test that order_index is automatically assigned when creating multiple sets."""
    # Create three sets
    for i in range(3):
        set_data = {
            "name": f"Set {i}",
            "series": 1,
            "exercises": [],
        }
        resp = await client.post(f"/exercise-sets/sessions/{test_session.id}", json=set_data)
        assert resp.status_code == 201
    
    # List and verify order
    list_resp = await client.get(f"/exercise-sets/sessions/{test_session.id}/sets")
    sets = list_resp.json()
    
    assert len(sets) == 3
    for i, exercise_set in enumerate(sets):
        assert exercise_set["order_index"] == i
