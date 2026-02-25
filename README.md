# Trainer Pro

A full-stack management platform for professional trainers across multiple disciplines — BMX, physiotherapy, fitness, running, and more. Built with **FastAPI** + **Next.js**, with a Spanish (Colombian) UI.

![Dashboard](docs/screenshots/screenshot-dashboard.png)

---

## Features

- **Multi-discipline support** — each trainer can run separate apps per discipline, each with its own theme, client roster, and exercise library
- **Client management** — contact info, personal stats, session history, lap times, payment tracking
- **Flexible exercise system** — define custom exercise templates with discipline-specific fields (e.g. physio: `repeticiones / series / peso`; BMX: `runs / duración`)
- **Session tracking** — schedule, run, and log training sessions with per-exercise data
- **Payment tracking** — mark sessions as paid, track balances per client in COP
- **Weekly calendar view** — see all scheduled sessions across clients
- **Custom themes** — per-app color themes, including extraction from uploaded logos
- **Google OAuth** authentication with JWT sessions
- **Google Maps** integration for location management and venue search
- **Google Calendar** integration *(coming soon)* — sync training sessions to clients' calendars
- **WhatsApp automations** *(planned)* — automated session reminders and client notifications

---

## Screenshots

| Login | BMX Dashboard |
|---|---|
| ![Login](docs/screenshots/screenshot-login.png) | ![Dashboard](docs/screenshots/screenshot-dashboard.png) |

| Physio Dashboard (different theme) | Client List |
|---|---|
| ![Physio](docs/screenshots/screenshot-physio-dashboard.png) | ![Clients](docs/screenshots/screenshot-clients.png) |

| Client Detail | Session Detail |
|---|---|
| ![Client Detail](docs/screenshots/screenshot-client-detail.png) | ![Session Detail](docs/screenshots/screenshot-session-detail.png) |

| Calendar | Exercise Templates |
|---|---|
| ![Calendar](docs/screenshots/screenshot-calendar.png) | ![Exercises](docs/screenshots/screenshot-exercises.png) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 18, TypeScript |
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL 16 + asyncpg |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Auth | Google OAuth 2.0 + JWT (httpOnly cookie) |
| Maps | Google Maps API (location search & display) |
| Calendar | Google Calendar API *(coming soon)* |
| Messaging | WhatsApp Business API *(planned)* |
| Data fetching | SWR |
| Testing (backend) | Pytest + pytest-asyncio |
| Testing (frontend) | Vitest + React Testing Library |
| Linting | Ruff (backend), ESLint + Prettier (frontend) |

---

## Project Structure

```
trainer-pro/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── routers/          # API endpoints (clients, sessions, exercises, auth…)
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   └── auth_utils.py     # JWT helpers
│   ├── alembic/              # Database migrations
│   └── tests/                # Integration tests (real PostgreSQL)
├── frontend/                 # Next.js application
│   └── src/
│       ├── app/              # App Router pages
│       ├── components/       # Reusable React components
│       ├── lib/              # API client, utilities, Spanish labels
│       └── types/            # TypeScript types matching backend schemas
└── docker-compose.yml        # PostgreSQL container
```

---

## Quick Start

### Prerequisites

- Node.js 20+, Python 3.12+, Docker

### 1. Start the database

```bash
docker-compose up -d postgres
```

### 2. Backend

```bash
cd backend
poetry install
cp .env.example .env          # fill in GOOGLE_CLIENT_ID/SECRET + JWT_SECRET_KEY
poetry run alembic upgrade head
poetry run python scripts/seed_data.py   # optional: seed demo data
poetry run uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # fill in NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Makefile shortcuts

```bash
make help          # list all commands
make install       # install all deps
make db-up         # start postgres
make migrate       # run alembic migrations
make seed          # seed demo data
make backend       # start API server
make frontend      # start Next.js dev server
make test-backend  # run pytest
make test-frontend # run vitest
make lint          # ruff + prettier
```

---

## Development Auth Bypass

For local development without setting up Google OAuth:

```bash
# backend/.env
DEV_AUTH_BYPASS=true
DEV_TRAINER_ID=1

# frontend/.env.local
NEXT_PUBLIC_DEV_AUTH_BYPASS=true
```

The login page will show quick-access buttons for the seeded BMX and Physio trainers.

---

## Data Model

```
Trainer
└── TrainerApp (one per discipline)
    ├── ExerciseTemplate[]  (reusable exercises with custom field schemas)
    ├── Location[]
    ├── Client[]
    │   └── TrainingSession[]
    │       ├── SessionExercise[]
    │       └── Payment
    └── SessionGroup[]      (group sessions, multiple clients)
```

---

## API

Interactive docs available at [http://localhost:8000/docs](http://localhost:8000/docs) when the backend is running.

Key endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/auth/google/url` | Start Google OAuth flow |
| `POST` | `/auth/google/exchange` | Exchange code for session cookie |
| `GET` | `/auth/me` | Get authenticated trainer |
| `POST` | `/auth/logout` | Clear session |
| `GET/POST` | `/clients/` | List / create clients |
| `GET/POST` | `/sessions/` | List / create sessions |
| `GET/POST` | `/exercise-templates/` | List / create exercise templates |
| `GET/POST` | `/apps/` | List / create trainer apps |
| `GET/POST` | `/locations/` | List / create locations |

---

## Environment Variables

**Backend** (`backend/.env`):

```env
DATABASE_URL=postgresql+asyncpg://trainer:trainer_dev@localhost:5432/trainer_pro
JWT_SECRET_KEY=<random 64-char string>
JWT_ALGORITHM=HS256
JWT_EXPIRE_HOURS=168
GOOGLE_CLIENT_ID=<your client id>
GOOGLE_CLIENT_SECRET=<your client secret>
CORS_ORIGINS=http://localhost:3000
DEV_AUTH_BYPASS=false
```

**Frontend** (`frontend/.env.local`):

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your maps api key>
```

---

## License

MIT
