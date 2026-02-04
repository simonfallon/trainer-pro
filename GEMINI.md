# GEMINI.md

This file provides guidance to Antigravity when working with code in this repository.

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
# Use poetry for dependency management
poetry install

# Run database migrations
poetry run alembic upgrade head

# Create a new migration after model changes
poetry run alembic revision --autogenerate -m "description"

# Start development server
poetry run uvicorn app.main:app --reload --port 8000
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
- **TrainerApps**: Different disciplines/apps (e.g., BMX, Running, Physio)
- **Locations**: Training venues
- **Clients**: Athletes/patients being trained
- **TrainingSessions**: Scheduled training sessions

### IMPORTANT: Frontend Language
- All user-facing text in the frontend must be in **Spanish**.

## Environment Configuration
Backend requires a `.env` file (see `.env.example`).

## Important Patterns

### Database Migrations
- Always create migrations after modifying models: `poetry run alembic revision --autogenerate -m "description"`
- Review generated migrations before applying
- Run migrations before starting the server: `poetry run alembic upgrade head`

### File Uploads
- Files stored in `backend/uploads/`
- Static file serving at `/uploads`
- Proxy configured in `next.config.js`

## Agent Workflows

The `.agent/workflows/` directory contains predefined workflows for common development tasks. These workflows provide step-by-step instructions and can be invoked using slash commands:

### Available Workflows

1. **`/adding-integration-tests`** - How to add and run backend integration tests
   - Use when: Adding new API endpoints or modifying existing ones
   - Includes: Test structure, fixtures, assertions, and running tests

2. **`/e2e-test`** - Run E2E tests with dev auth bypass
   - Use when: Testing the full application flow without Google OAuth
   - Includes: Dev login, client list/detail testing, payment flows
   - Note: Requires `DEV_AUTH_BYPASS=true` in backend/.env

3. **`/run-tests`** - Run frontend unit tests using agent-friendly configuration
   - Use when: Running or debugging frontend tests
   - Includes: Test execution commands and configuration

### Using Workflows

Simply mention the workflow in your prompt (e.g., "Run the E2E tests using /e2e-test") and Antigravity will automatically follow the documented steps. Workflows with `// turbo` annotations will auto-run safe commands without requiring approval.
