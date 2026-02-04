# Trainer-Pro

A multi-discipline trainer management platform for professional trainers (fitness, running, BMX, physiotherapy, etc.).

## Project Structure

```
trainer-pro/
├── frontend/     # Next.js React application
├── backend/      # Python FastAPI application
└── docker-compose.yml
```

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 16+
- Docker (optional, for local database)

### Database Setup

```bash
# Start PostgreSQL with Docker
docker-compose up -d postgres

# Or configure your own PostgreSQL and update backend/.env
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Python, FastAPI, SQLAlchemy
- **Database**: PostgreSQL
- **Deployment**: Vercel (frontend), AWS (backend)

## License

Proprietary - All rights reserved
