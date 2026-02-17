# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trainer-Pro is a multi-discipline trainer management platform for professional trainers (fitness, running, BMX, physiotherapy, etc.). The application uses a FastAPI backend with PostgreSQL and a Next.js frontend.

## Language Requirement
- **CRITICAL**: The frontend user interface (labels, buttons, messages, themes, etc.) MUST be in **Spanish** (specifically Colombian Spanish localized).
- All new frontend features or text additions must adhere to this requirement.

## Development Commands

### Quick Start (Makefile)
A root `Makefile` provides shortcuts for all common tasks:
```bash
make help             # List all available commands
make install          # Install backend (Poetry) + frontend (npm) deps
make db-up            # Start PostgreSQL container
make migrate          # Run Alembic migrations
make seed             # Seed test data
make backend          # Start backend dev server (:8000)
make frontend         # Start frontend dev server (:3000)
make test-backend     # Run pytest
make test-frontend    # Run vitest
make lint             # Lint + format all code (ruff + prettier)
```

### Database Setup
```bash
docker-compose up -d postgres
docker exec trainer-pro-db pg_isready -U trainer -d trainer_pro
```

### Backend (FastAPI + Poetry)
```bash
cd backend
poetry install                          # Install dependencies (venv at .venv/)
poetry run alembic upgrade head         # Run migrations
poetry run alembic revision --autogenerate -m "description"  # New migration
poetry run uvicorn app.main:app --reload --port 8000         # Dev server

# API docs: http://localhost:8000/docs (Swagger) | /redoc (ReDoc)
```

### Frontend (Next.js + npm)
```bash
cd frontend
npm install
npm run dev       # Dev server (http://localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npm run format    # Prettier
```

### Testing
```bash
# Backend (pytest, requires PostgreSQL test DB)
cd backend && poetry run pytest -v
# Override test DB: TEST_DATABASE_URL=<url> poetry run pytest

# Frontend (Vitest)
cd frontend && npm test
```

### Code Quality
```bash
# Backend - ruff (linting + formatting)
cd backend
poetry run ruff check .          # Lint
poetry run ruff check --fix .    # Lint + auto-fix
poetry run ruff format .         # Format

# Frontend - prettier
cd frontend
npm run format         # Format all files
npm run format:check   # Check formatting (CI)
```

## Architecture

### Backend Structure
- **FastAPI Application**: Async Python web framework with automatic OpenAPI documentation
- **SQLAlchemy ORM**: Async database access using `asyncpg` driver
- **Alembic**: Database migrations management
- **Router-based API**: Modular endpoint organization by resource type

Key directories:
- `app/routers/`: API endpoint definitions (trainers, clients, sessions, locations, apps, uploads)
- `app/models/`: SQLAlchemy database models with relationships
- `app/schemas/`: Pydantic schemas for request/response validation
- `app/workers/`: Background task processing (base infrastructure)
- `alembic/versions/`: Database migration files

### Frontend Structure
- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **SWR**: Data fetching and caching library for API calls

Key directories:
- `src/app/`: Next.js App Router pages and layouts
- `src/components/`: Reusable React components
- `src/lib/`: Utility functions and helpers
- `src/types/`: TypeScript type definitions
- `src/themes/`: Application styling and themes

### Data Model
The application follows a hierarchical structure:
- **Trainer**: The main user entity (professional trainer)
  - Has many **TrainerApps**: Different disciplines/apps (e.g., BMX, Running, Physio)
    - Each TrainerApp has many **ExerciseTemplates**: Reusable exercise definitions with flexible field schemas
  - Has many **Locations**: Training venues
  - Has many **Clients**: Athletes/patients being trained
  - Has many **TrainingSessions**: Scheduled training sessions (individual or group)
    - Each session has many **SessionExercises**: Actual exercises performed, linked to templates or ad-hoc
    - Sessions can have **Payments**: Track payment status and amounts
  - Has many **SessionGroups**: Group training sessions with multiple clients

**Exercise System Pattern**:
- **ExerciseTemplate**: Defines reusable exercises per discipline with custom `field_schema` (JSONB)
  - Example physio schema: `{"repeticiones": "int", "series": "int", "peso": "float"}`
  - Example BMX schema: `{"runs": "int", "duracion_total": "duration"}`
- **SessionExercise**: Actual exercise instances with flexible `data` field (JSONB) matching the template schema
  - Can be template-based or ad-hoc (custom_name without template)
  - Has XOR constraint: must belong to either `session_id` OR `session_group_id`, not both

All primary keys use UUIDs or auto-incrementing integers (depending on the model). All models have `created_at` and `updated_at` timestamps with timezone awareness.

### Database Session Pattern
The backend uses async SQLAlchemy sessions with automatic transaction management:
- Sessions are provided via `get_db()` dependency injection
- Auto-commit on success, auto-rollback on exception
- All database operations should use `async/await`

### CORS Configuration
Backend CORS is configured via environment variables. Default allows `http://localhost:3000` for local development.

## Environment Configuration

Backend requires a `.env` file (see `.env.example`):
- `DATABASE_URL`: PostgreSQL connection string (uses asyncpg driver)
- `DEBUG`: Enable debug mode and SQL query logging
- `CORS_ORIGINS`: Comma-separated list of allowed origins

## Authentication

### Google OAuth 2.0
- Production authentication uses Google OAuth with scopes for email, profile, and Google Calendar
- Authorization flow: GET `/auth/google/url` → user authorizes → POST `/auth/google/exchange` with code
- Tokens (access + refresh) stored in Trainer model for future Google Calendar integration
- Configuration requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend/.env

### Dev Auth Bypass (Development Only)
- **CRITICAL**: Only for local development and E2E testing, NEVER in production
- Enable with `DEV_AUTH_BYPASS=true` and `DEV_TRAINER_ID=<uuid>` in backend/.env
- Frontend: Set `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` in frontend/.env.local
- Endpoints:
  - `POST /auth/dev/login`: Login as configured dev trainer
  - `POST /auth/dev/login/{discipline}`: Login as specific discipline trainer (bmx/physio)
- Seed test data: `cd backend && poetry run python scripts/seed_data.py`

## Important Patterns

### Database Migrations
- **Standard Workflow**: Use Alembic migrations for all schema changes
- **Creating Migrations**:
  1. Modify models in `app/models/`
  2. Generate migration: `cd backend && poetry run alembic revision --autogenerate -m "description"`
  3. Review the generated migration file in `alembic/versions/`
  4. Apply migration: `poetry run alembic upgrade head`
- **Test Database**: Ensure test database has latest schema with `DATABASE_URL=postgresql+asyncpg://trainer:trainer_dev@localhost:5432/trainer_pro_test poetry run alembic upgrade head`
- **Seeding Data**: After migrations, seed test data with `poetry run python scripts/seed_data.py`

### File Uploads
- Upload endpoint: `/uploads`
- Files stored in `backend/uploads/` directory
- Static file serving mounted at `/uploads` path

### API Router Structure
Each router module (e.g., `trainers.py`, `clients.py`) follows this pattern:
- Define `router = APIRouter()`
- Use dependency injection for database sessions: `db: AsyncSession = Depends(get_db)`
- Return Pydantic schema objects for automatic validation and serialization

### Frontend API Integration
- API base URL should point to `http://localhost:8000` in development
- Use SWR for data fetching and caching
- TypeScript types should match backend Pydantic schemas

### Testing Patterns

**Backend Integration Tests**
- Use pytest with async support (`asyncio_mode = auto`)
- Tests run against real PostgreSQL test database (not mocked)
- Each test runs in a transaction that's rolled back after completion
- Shared fixtures in `conftest.py`:
  - `db_session`: Isolated database session per test
  - `client`: HTTP client for API testing
  - Factory fixtures: `test_trainer`, `test_client_record`, `test_session`, `test_app`, etc.
- Test database URL: Override with `TEST_DATABASE_URL` environment variable

**Frontend Unit Tests**
- Use Vitest with jsdom environment
- React Testing Library for component tests
- Custom TMPDIR configuration to avoid permission issues
- Path alias: `@/` maps to `src/`

## Agent Workflows

The `.agent/workflows/` directory contains predefined workflows for common development tasks. These workflows provide step-by-step instructions and can be invoked using slash commands:

### Available Workflows

1. **`/adding-integration-tests`** - How to add and run backend integration tests
   - Use when: Adding new API endpoints or modifying existing ones
   - Includes: Test structure, fixtures, assertions, and running tests
   - Location: `.agent/workflows/adding-integration-tests.md`

2. **`/e2e-test`** - Run E2E tests with dev auth bypass
   - Use when: Testing the full application flow without Google OAuth
   - Includes: Dev login, client list/detail testing, payment flows
   - Note: Requires `DEV_AUTH_BYPASS=true` in backend/.env
   - Location: `.agent/workflows/e2e-test.md`

3. **`/run-tests`** - Run frontend unit tests using agent-friendly configuration
   - Use when: Running or debugging frontend tests
   - Includes: Test execution commands and configuration
   - Location: `.agent/workflows/run-tests.md`

### Using Workflows

Simply mention the workflow in your prompt (e.g., "Run the E2E tests using /e2e-test") and the agent will automatically follow the documented steps. Workflows with `// turbo` annotations will auto-run safe commands without requiring approval.

### Dev Auth Bypass

For E2E testing without Google OAuth:
- Backend: Set `DEV_AUTH_BYPASS=true` and `DEV_TRAINER_ID=00000000-0000-0000-0000-000000000001` in `backend/.env`
- Frontend: Set `NEXT_PUBLIC_DEV_AUTH_BYPASS=true` in `frontend/.env.local`
- Seed test data: `cd backend && poetry run python scripts/seed_data.py`
- See `/e2e-test` workflow for complete testing instructions
