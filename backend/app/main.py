"""
Trainer-Pro FastAPI Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import trainers, apps, locations, clients, sessions, exercise_templates, session_exercises, exercise_sets

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(trainers.router, prefix="/trainers", tags=["trainers"])
app.include_router(apps.router, prefix="/apps", tags=["apps"])
app.include_router(locations.router, prefix="/locations", tags=["locations"])
app.include_router(clients.router, prefix="/clients", tags=["clients"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(exercise_templates.router, prefix="/exercise-templates", tags=["exercise-templates"])
app.include_router(session_exercises.router, tags=["session-exercises"])
app.include_router(exercise_sets.router, prefix="/exercise-sets", tags=["exercise-sets"])

from app.routers import auth
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# Dev auth bypass (only active when DEV_AUTH_BYPASS=true)
if settings.dev_auth_bypass:
    from app.routers import dev_auth
    app.include_router(dev_auth.router, tags=["dev"])

# Import uploads router (lazy import to avoid circular dep if needed, or just import at top)
from app.routers import uploads
app.include_router(uploads.router, prefix="/uploads", tags=["uploads"])

# Mount static files
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.api_version}
