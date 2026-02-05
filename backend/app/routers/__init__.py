"""
API Routers Package
"""
from app.routers import (
    trainers,
    apps,
    locations,
    clients,
    sessions,
    uploads,
    auth,
    dev_auth,
    exercise_templates,
    session_exercises,
)

__all__ = [
    "trainers",
    "apps",
    "locations",
    "clients",
    "sessions",
    "uploads",
    "auth",
    "dev_auth",
    "exercise_templates",
    "session_exercises",
]
