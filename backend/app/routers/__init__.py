"""
API Routers Package
"""

from app.routers import (
    apps,
    auth,
    clients,
    dev_auth,
    exercise_templates,
    locations,
    session_exercises,
    sessions,
    trainers,
    uploads,
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
