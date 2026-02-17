"""
Exercise Template API Integration Tests
"""

from httpx import AsyncClient

from app.models import ExerciseTemplate, TrainerApp


class TestExerciseTemplateEndpoints:
    """Test exercise template CRUD and autocomplete operations."""

    async def test_create_exercise_template(self, client: AsyncClient, test_app: TrainerApp):
        """Test creating a new exercise template."""
        response = await client.post(
            "/exercise-templates",
            json={
                "trainer_app_id": test_app.id,
                "name": "Press de banca",
                "discipline_type": "physio",
                "field_schema": {
                    "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
                    "series": {"type": "integer", "label": "Series", "required": True},
                    "peso": {"type": "float", "label": "Peso (kg)", "required": False},
                },
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Press de banca"
        assert data["discipline_type"] == "physio"
        assert data["usage_count"] == 0
        assert "repeticiones" in data["field_schema"]

    async def test_create_bmx_template(self, client: AsyncClient, test_app: TrainerApp):
        """Test creating a BMX exercise template."""
        response = await client.post(
            "/exercise-templates",
            json={
                "trainer_app_id": test_app.id,
                "name": "Entrenamiento de pista",
                "discipline_type": "bmx",
                "field_schema": {
                    "runs": {"type": "integer", "label": "Runs", "required": True},
                    "duracion_total": {
                        "type": "duration",
                        "label": "Duración Total",
                        "required": True,
                    },
                },
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Entrenamiento de pista"
        assert data["discipline_type"] == "bmx"

    async def test_get_exercise_template(
        self, client: AsyncClient, test_exercise_template: ExerciseTemplate
    ):
        """Test retrieving an exercise template by ID."""
        response = await client.get(f"/exercise-templates/{test_exercise_template.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_exercise_template.id
        assert data["name"] == test_exercise_template.name

    async def test_get_exercise_template_not_found(self, client: AsyncClient):
        """Test 404 for non-existent template."""
        response = await client.get("/exercise-templates/999999")

        assert response.status_code == 404

    async def test_list_exercise_templates(
        self, client: AsyncClient, test_app: TrainerApp, test_exercise_template: ExerciseTemplate
    ):
        """Test listing all templates for a trainer app."""
        response = await client.get(
            "/exercise-templates",
            params={"trainer_app_id": test_app.id},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(t["id"] == test_exercise_template.id for t in data)

    async def test_list_exercise_templates_by_discipline(
        self,
        client: AsyncClient,
        test_app: TrainerApp,
        test_exercise_template: ExerciseTemplate,
        test_bmx_template: ExerciseTemplate,
    ):
        """Test filtering templates by discipline type."""
        # Get only physio templates
        response = await client.get(
            "/exercise-templates",
            params={"trainer_app_id": test_app.id, "discipline_type": "physio"},
        )

        assert response.status_code == 200
        data = response.json()
        assert all(t["discipline_type"] == "physio" for t in data)
        assert any(t["id"] == test_exercise_template.id for t in data)
        assert not any(t["id"] == test_bmx_template.id for t in data)

    async def test_update_exercise_template(
        self, client: AsyncClient, test_exercise_template: ExerciseTemplate
    ):
        """Test updating an exercise template."""
        response = await client.put(
            f"/exercise-templates/{test_exercise_template.id}",
            json={
                "name": "Sentadillas modificadas",
                "field_schema": {
                    "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
                    "series": {"type": "integer", "label": "Series", "required": True},
                    "peso": {"type": "float", "label": "Peso (kg)", "required": True},
                    "variaciones": {"type": "text", "label": "Variaciones", "required": False},
                },
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Sentadillas modificadas"
        assert "variaciones" in data["field_schema"]

    async def test_delete_exercise_template(
        self, client: AsyncClient, test_exercise_template: ExerciseTemplate
    ):
        """Test deleting an exercise template."""
        response = await client.delete(f"/exercise-templates/{test_exercise_template.id}")
        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(f"/exercise-templates/{test_exercise_template.id}")
        assert get_response.status_code == 404

    async def test_autocomplete_exercise_templates(
        self, client: AsyncClient, test_app: TrainerApp, test_exercise_template: ExerciseTemplate
    ):
        """Test autocomplete search by exact name prefix."""
        response = await client.get(
            "/exercise-templates/autocomplete",
            params={"trainer_app_id": test_app.id, "q": "Sent"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(t["name"] == "Sentadillas" for t in data)

    async def test_autocomplete_fuzzy_matching(
        self, client: AsyncClient, test_app: TrainerApp, test_exercise_template: ExerciseTemplate
    ):
        """Test autocomplete with typos/variations (fuzzy matching)."""
        # Test partial match - "sentad" should match "Sentadillas"
        response = await client.get(
            "/exercise-templates/autocomplete",
            params={"trainer_app_id": test_app.id, "q": "sentad"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(t["name"] == "Sentadillas" for t in data)

    async def test_autocomplete_partial_match(self, client: AsyncClient, test_app: TrainerApp):
        """Test autocomplete with partial words."""
        # Create a template with multiple words
        await client.post(
            "/exercise-templates",
            json={
                "trainer_app_id": test_app.id,
                "name": "Press de banca",
                "discipline_type": "physio",
                "field_schema": {},
            },
        )

        # Search for "press" should match "Press de banca"
        response = await client.get(
            "/exercise-templates/autocomplete",
            params={"trainer_app_id": test_app.id, "q": "press"},
        )

        assert response.status_code == 200
        data = response.json()
        assert any(t["name"] == "Press de banca" for t in data)

        # Search for "banca" should also match
        response = await client.get(
            "/exercise-templates/autocomplete",
            params={"trainer_app_id": test_app.id, "q": "banca"},
        )

        assert response.status_code == 200
        data = response.json()
        assert any(t["name"] == "Press de banca" for t in data)

    async def test_autocomplete_case_insensitive(
        self, client: AsyncClient, test_app: TrainerApp, test_exercise_template: ExerciseTemplate
    ):
        """Test autocomplete is case-insensitive."""
        # Test uppercase
        response = await client.get(
            "/exercise-templates/autocomplete",
            params={"trainer_app_id": test_app.id, "q": "SENT"},
        )

        assert response.status_code == 200
        data = response.json()
        assert any(t["name"] == "Sentadillas" for t in data)

        # Test lowercase
        response = await client.get(
            "/exercise-templates/autocomplete",
            params={"trainer_app_id": test_app.id, "q": "sent"},
        )

        assert response.status_code == 200
        data = response.json()
        assert any(t["name"] == "Sentadillas" for t in data)

    async def test_autocomplete_empty_query(
        self, client: AsyncClient, test_app: TrainerApp, test_exercise_template: ExerciseTemplate
    ):
        """Test autocomplete with empty query returns all templates."""
        response = await client.get(
            "/exercise-templates/autocomplete",
            params={"trainer_app_id": test_app.id, "q": ""},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    async def test_autocomplete_with_discipline_filter(
        self,
        client: AsyncClient,
        test_app: TrainerApp,
        test_exercise_template: ExerciseTemplate,
        test_bmx_template: ExerciseTemplate,
    ):
        """Test autocomplete with discipline type filter."""
        response = await client.get(
            "/exercise-templates/autocomplete",
            params={"trainer_app_id": test_app.id, "q": "s", "discipline_type": "bmx"},
        )

        assert response.status_code == 200
        data = response.json()
        # Should only return BMX templates
        assert all(t["discipline_type"] == "bmx" for t in data)
        assert any(t["name"] == "Saltos técnicos" for t in data)
        assert not any(t["name"] == "Sentadillas" for t in data)
