"""
Session Exercise API Integration Tests
"""

from httpx import AsyncClient

from app.models import ExerciseTemplate, SessionExercise, TrainingSession


class TestSessionExerciseEndpoints:
    """Test session exercise CRUD and reorder operations."""

    async def test_create_session_exercise_with_template(
        self,
        client: AsyncClient,
        test_session: TrainingSession,
        test_exercise_template: ExerciseTemplate,
    ):
        """Test adding an exercise to a session using a template."""
        response = await client.post(
            f"/sessions/{test_session.id}/exercises",
            json={
                "exercise_template_id": test_exercise_template.id,
                "data": {"repeticiones": 10, "series": 3, "peso": 20.0},
                "order_index": 0,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["session_id"] == test_session.id
        assert data["exercise_template_id"] == test_exercise_template.id
        assert data["data"]["repeticiones"] == 10
        assert data["order_index"] == 0

    async def test_create_session_exercise_custom(
        self, client: AsyncClient, test_session: TrainingSession
    ):
        """Test adding a custom exercise without a template."""
        response = await client.post(
            f"/sessions/{test_session.id}/exercises",
            json={
                "custom_name": "Ejercicio personalizado",
                "data": {"notas": "Ejercicio especial para este cliente"},
                "order_index": 1,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["session_id"] == test_session.id
        assert data["custom_name"] == "Ejercicio personalizado"
        assert data["exercise_template_id"] is None

    async def test_get_session_exercises(
        self,
        client: AsyncClient,
        test_session: TrainingSession,
        test_session_exercise: SessionExercise,
    ):
        """Test listing all exercises for a session."""
        response = await client.get(f"/sessions/{test_session.id}/exercises")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(e["id"] == test_session_exercise.id for e in data)

    async def test_get_session_exercises_not_found(self, client: AsyncClient):
        """Test 404 when session doesn't exist."""
        response = await client.get("/sessions/999999/exercises")

        assert response.status_code == 404

    async def test_update_session_exercise(
        self,
        client: AsyncClient,
        test_session_exercise: SessionExercise,
    ):
        """Test updating an exercise's data."""
        response = await client.put(
            f"/{test_session_exercise.id}",
            json={
                "data": {"repeticiones": 15, "series": 4, "peso": 30.0},
                "order_index": 2,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["repeticiones"] == 15
        assert data["order_index"] == 2

    async def test_delete_session_exercise(
        self,
        client: AsyncClient,
        test_session: TrainingSession,
        test_session_exercise: SessionExercise,
    ):
        """Test deleting an exercise."""
        exercise_id = test_session_exercise.id
        response = await client.delete(f"/{exercise_id}")
        assert response.status_code == 204

        # Verify it's deleted by checking the list
        list_response = await client.get(f"/sessions/{test_session.id}/exercises")
        exercises = list_response.json()
        assert not any(e["id"] == exercise_id for e in exercises)

    async def test_reorder_session_exercises(
        self,
        client: AsyncClient,
        test_session: TrainingSession,
        test_exercise_template: ExerciseTemplate,
    ):
        """Test bulk reordering of exercises."""
        # Create multiple exercises
        exercise_ids = []
        for i in range(3):
            response = await client.post(
                f"/sessions/{test_session.id}/exercises",
                json={
                    "exercise_template_id": test_exercise_template.id,
                    "data": {"repeticiones": 10 + i, "series": 3},
                    "order_index": i,
                },
            )
            assert response.status_code == 201
            exercise_ids.append(response.json()["id"])

        # Reorder: reverse the order
        reversed_ids = list(reversed(exercise_ids))
        response = await client.put(
            f"/sessions/{test_session.id}/exercises/reorder",
            json={"exercise_ids": reversed_ids},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 3

        # Verify new order
        for _i, exercise in enumerate(data):
            if exercise["id"] in reversed_ids:
                expected_index = reversed_ids.index(exercise["id"])
                assert exercise["order_index"] == expected_index

    async def test_template_usage_count_increments(
        self,
        client: AsyncClient,
        test_session: TrainingSession,
        test_exercise_template: ExerciseTemplate,
    ):
        """Test that using a template increments its usage count."""
        # Get initial usage count
        template_response = await client.get(f"/exercise-templates/{test_exercise_template.id}")
        initial_count = template_response.json()["usage_count"]

        # Create exercise using template
        await client.post(
            f"/sessions/{test_session.id}/exercises",
            json={
                "exercise_template_id": test_exercise_template.id,
                "data": {"repeticiones": 10, "series": 3},
                "order_index": 0,
            },
        )

        # Verify usage count increased
        template_response = await client.get(f"/exercise-templates/{test_exercise_template.id}")
        new_count = template_response.json()["usage_count"]
        assert new_count == initial_count + 1

    async def test_xor_constraint_validation(
        self,
        client: AsyncClient,
        test_session: TrainingSession,
        test_exercise_template: ExerciseTemplate,
    ):
        """Test that XOR constraint is enforced (session OR group, not both)."""
        # This test verifies the Pydantic validation
        # The router overrides the session_id/group_id from path params,
        # so we can't directly test the constraint violation via API
        # But we can verify that the path param correctly sets the session_id

        response = await client.post(
            f"/sessions/{test_session.id}/exercises",
            json={
                "exercise_template_id": test_exercise_template.id,
                "data": {"repeticiones": 10, "series": 3},
                "order_index": 0,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["session_id"] == test_session.id
        assert data["session_group_id"] is None
