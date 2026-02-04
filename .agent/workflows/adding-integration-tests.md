---
description: How to add and run backend integration tests
---

# Adding Integration Tests to Backend

Integration tests validate API behavior using a real PostgreSQL database (`trainer_pro_test`).

## Prerequisites

1. **Create Test DB**: `docker exec -it trainer-pro-db psql -U trainer -c "CREATE DATABASE trainer_pro_test;"`
2. **Install Deps**: `cd backend && poetry install`

## Directory Structure
`backend/tests/` contains `test_*.py` files and `conftest.py` (fixtures).

## Quick Reference: Running Tests

```bash
cd backend
poetry run pytest                               # Run all
poetry run pytest tests/test_clients.py         # Run specific file
poetry run pytest tests/file.py::Class::method  # Run specific test
poetry run pytest -s -v                         # Verbose + stdout
poetry run pytest -x --lf                       # Stop on fail, run last failed
```

## Adding a New Test

Create `backend/tests/test_<feature>.py`. Example:

```python
import pytest
from httpx import AsyncClient
from app.models import Trainer

class TestFeatureEndpoints:
    async def test_create_item(self, client: AsyncClient, test_trainer: Trainer):
        response = await client.post("/items", json={"name": "Test"})
        assert response.status_code == 201
        assert response.json()["name"] == "Test"

    async def test_get_item(self, client: AsyncClient):
        # ... logic ...
        pass
```

## Common Fixtures (`conftest.py`)

| Fixture | Type | Description |
|---------|------|-------------|
| `db_session` | `AsyncSession` | Database session (auto-rollback after test) |
| `client` | `AsyncClient` | HTTP client for making API requests |
| `test_trainer` | `Trainer` | A pre-created trainer record |
| `test_client_record` | `Client` | A pre-created client record |
| `test_session` | `TrainingSession` | A pre-created training session |

## Best Practices

1.  **Test Behavior**: Verify API response and database state, not internal methods.
2.  **Use Real DB**: No mocks. Tests run in transactions that rollback automatically.
3.  **Isolation**: Each test is independent. `db_session` handles cleanup.
4.  **Descriptive Names**: `test_create_client_returns_201` is better than `test_client`.
5.  **Clear Assertions**: `assert response.status_code == 201` is better than `assert response`.
6.  **Edge Cases**: Test 404s, 422s, and invalid inputs.

## Debugging

- **Interactive**: Add `breakpoint()` in code and run with `-s`.
- **View Data**: Comment out `drop_all` in `conftest.py` temporarily to inspect DB after run.

## Checklist
- [ ] Create `test_<feature>.py` with `Test<Feature>Endpoints` class
- [ ] Use fixtures (`client`, `test_trainer`, etc.)
- [ ] Test happy path + error cases (404, 422)
- [ ] Validate db persistence and response structure
- [ ] Run `poetry run pytest tests/test_<feature>.py -v`
