"""
Background Workers Package

Abstract interface for background job processing.
Currently stubbed for future integration with Celery, Dramatiq, or similar.
"""
from app.workers.base import BaseWorker, WorkerRegistry, worker_registry

__all__ = ["BaseWorker", "WorkerRegistry", "worker_registry"]
