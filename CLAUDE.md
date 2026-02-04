# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trainer-Pro is a multi-discipline trainer management platform for professional trainers (fitness, running, BMX, physiotherapy, etc.). The application uses a FastAPI backend with PostgreSQL and a Next.js frontend.

## Language Requirement
- **CRITICAL**: The frontend user interface (labels, buttons, messages, themes, etc.) MUST be in **Spanish** (specifically Colombian Spanish localized).
- All new frontend features or text additions must adhere to this requirement.

## Development Commands

### Database Setup
```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Check database health
docker exec trainer-pro-db pg_isready -U trainer -d trainer_pro
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies (choose one)
pip install -r requirements.txt
# OR use Poetry
poetry install

# Run database migrations
alembic upgrade head

# Create a new migration after model changes
alembic revision --autogenerate -m "description"

# Start development server
uvicorn app.main:app --reload --port 8000

# API documentation available at:
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev     # Development server (http://localhost:3000)
npm run build   # Production build
npm run start   # Production server
npm run lint    # Run ESLint
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
  - Has many **Locations**: Training venues
  - Has many **Clients**: Athletes/patients being trained
  - Has many **TrainingSessions**: Scheduled training sessions

All primary keys use UUIDs. All models have `created_at` and `updated_at` timestamps with timezone awareness.

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

## Important Patterns

### Database Migrations
- Always create migrations after modifying models: `alembic revision --autogenerate -m "description"`
- Review generated migrations before applying
- Run migrations before starting the server: `alembic upgrade head`

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
