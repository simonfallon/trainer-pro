"""
Base Worker Abstraction

Abstract interface for background job processing that can be implemented
with various backends (Celery, Dramatiq, RQ, etc.) in the future.

This provides a clean abstraction for:
- Event-driven automation triggers
- Scheduled tasks
- Agent skill execution
- Integration workflows (calendar sync, WhatsApp, etc.)
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any


class WorkerStatus(str, Enum):
    """Status of a worker job."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class JobResult:
    """Result of a worker job execution."""
    status: WorkerStatus
    data: dict | None = None
    error: str | None = None


class BaseWorker(ABC):
    """
    Abstract base class for background workers.
    
    Implement this class to create new automation skills.
    Workers are registered with the WorkerRegistry and can be
    triggered by events or scheduled jobs.
    
    Example:
        class CalendarSyncWorker(BaseWorker):
            name = "calendar_sync"
            
            async def execute(self, payload: dict) -> JobResult:
                # Sync calendar logic here
                return JobResult(status=WorkerStatus.COMPLETED, data={...})
    """

    name: str = "base_worker"
    description: str = "Base worker description"

    @abstractmethod
    async def execute(self, payload: dict[str, Any]) -> JobResult:
        """
        Execute the worker with the given payload.
        
        Args:
            payload: Dictionary containing job-specific data
            
        Returns:
            JobResult with status and optional data/error
        """
        pass

    async def on_success(self, result: JobResult) -> None:
        """Hook called after successful execution."""
        pass

    async def on_failure(self, result: JobResult) -> None:
        """Hook called after failed execution."""
        pass


class WorkerRegistry:
    """
    Registry for managing worker instances.
    
    Provides a central location for registering, discovering,
    and dispatching work to background workers.
    """

    def __init__(self):
        self._workers: dict[str, BaseWorker] = {}
        self._event_handlers: dict[str, list[str]] = {}

    def register(self, worker: BaseWorker) -> None:
        """Register a worker instance."""
        self._workers[worker.name] = worker

    def unregister(self, worker_name: str) -> None:
        """Unregister a worker by name."""
        if worker_name in self._workers:
            del self._workers[worker_name]

    def get(self, worker_name: str) -> BaseWorker | None:
        """Get a worker by name."""
        return self._workers.get(worker_name)

    def list_workers(self) -> list[str]:
        """List all registered worker names."""
        return list(self._workers.keys())

    def subscribe(self, event: str, worker_name: str) -> None:
        """Subscribe a worker to an event."""
        if event not in self._event_handlers:
            self._event_handlers[event] = []
        if worker_name not in self._event_handlers[event]:
            self._event_handlers[event].append(worker_name)

    def unsubscribe(self, event: str, worker_name: str) -> None:
        """Unsubscribe a worker from an event."""
        if event in self._event_handlers:
            if worker_name in self._event_handlers[event]:
                self._event_handlers[event].remove(worker_name)

    async def dispatch(self, event: str, payload: dict[str, Any]) -> list[JobResult]:
        """
        Dispatch an event to all subscribed workers.
        
        In a production setup, this would queue jobs to a message broker.
        Currently executes workers directly for simplicity.
        
        Args:
            event: Event name to dispatch
            payload: Data to pass to workers
            
        Returns:
            List of JobResults from all handlers
        """
        results = []
        worker_names = self._event_handlers.get(event, [])

        for worker_name in worker_names:
            worker = self.get(worker_name)
            if worker:
                try:
                    result = await worker.execute(payload)
                    if result.status == WorkerStatus.COMPLETED:
                        await worker.on_success(result)
                    else:
                        await worker.on_failure(result)
                    results.append(result)
                except Exception as e:
                    result = JobResult(
                        status=WorkerStatus.FAILED,
                        error=str(e),
                    )
                    await worker.on_failure(result)
                    results.append(result)

        return results

    async def execute_worker(
        self,
        worker_name: str,
        payload: dict[str, Any],
    ) -> JobResult:
        """
        Execute a specific worker by name.
        
        Args:
            worker_name: Name of the worker to execute
            payload: Data to pass to the worker
            
        Returns:
            JobResult from the worker
            
        Raises:
            ValueError: If worker is not found
        """
        worker = self.get(worker_name)
        if not worker:
            raise ValueError(f"Worker '{worker_name}' not found")

        try:
            result = await worker.execute(payload)
            if result.status == WorkerStatus.COMPLETED:
                await worker.on_success(result)
            else:
                await worker.on_failure(result)
            return result
        except Exception as e:
            result = JobResult(
                status=WorkerStatus.FAILED,
                error=str(e),
            )
            await worker.on_failure(result)
            return result


# Global worker registry instance
worker_registry = WorkerRegistry()
