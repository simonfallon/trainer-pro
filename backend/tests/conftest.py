"""
Test Configuration and Fixtures

This module provides shared fixtures for integration tests that interact
with a real PostgreSQL test database. Tests run within transactions that
are rolled back after each test to maintain test isolation.
"""
import os
import asyncio
from typing import AsyncGenerator
from datetime import datetime

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Set test environment before importing app modules
os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://trainer:trainer_dev@localhost:5432/trainer_pro_test"
)

from app.main import app
from app.database import Base, get_db
from app.models import Trainer, Client, TrainingSession, Payment, TrainerApp, ExerciseTemplate, SessionExercise


# Create test engine
test_engine = create_async_engine(
    os.environ["DATABASE_URL"],
    echo=False,
    pool_pre_ping=True,
)

test_session_maker = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def setup_database():
    """Create all tables at the start of the test session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Optionally drop tables after all tests (comment out to keep data for debugging)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def db_session(setup_database) -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a database session for each test.
    Each test runs within a transaction that is rolled back after the test.
    """
    async with test_session_maker() as session:
        # Start a savepoint that we can rollback to
        async with session.begin():
            yield session
            # Rollback to clean up test data
            await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async HTTP client for testing API endpoints.
    Uses the test database session.
    """
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


# ============== Factory Fixtures ==============

@pytest.fixture
async def test_trainer(db_session: AsyncSession) -> Trainer:
    """Create a test trainer."""
    trainer = Trainer(
        name="Test Trainer",
        email="test_trainer@test.com",
        phone="+57 300 123 4567",
    )
    db_session.add(trainer)
    await db_session.flush()
    return trainer


@pytest.fixture
async def test_client_record(db_session: AsyncSession, test_trainer: Trainer) -> Client:
    """Create a test client."""
    client = Client(
        trainer_id=test_trainer.id,
        name="Test Client",
        phone="+57 300 987 6543",
        email="test_client@test.com",
        birth_date=datetime(1990, 5, 15),
        gender="M",
        height_cm=180,
        weight_kg=75.5,
    )
    db_session.add(client)
    await db_session.flush()
    return client


@pytest.fixture
async def test_session(
    db_session: AsyncSession,
    test_trainer: Trainer,
    test_client_record: Client,
) -> TrainingSession:
    """Create a test training session."""
    session = TrainingSession(
        trainer_id=test_trainer.id,
        client_id=test_client_record.id,
        scheduled_at=datetime.now(),
        duration_minutes=60,
        status="scheduled",
        is_paid=False,
    )
    db_session.add(session)
    await db_session.flush()
    return session


@pytest.fixture
async def test_app(db_session: AsyncSession, test_trainer: Trainer) -> TrainerApp:
    """Create a test trainer app."""
    app = TrainerApp(
        trainer_id=test_trainer.id,
        name="Test BMX App",
        theme_id="bmx",
        theme_config={"colors": {"primary": "#2563eb"}},
    )
    db_session.add(app)
    await db_session.flush()
    return app


@pytest.fixture
async def test_exercise_template(db_session: AsyncSession, test_app: TrainerApp) -> ExerciseTemplate:
    """Create a test physio exercise template."""
    template = ExerciseTemplate(
        trainer_app_id=test_app.id,
        name="Sentadillas",
        discipline_type="physio",
        field_schema={
            "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
            "series": {"type": "integer", "label": "Series", "required": True},
            "peso": {"type": "float", "label": "Peso (kg)", "required": False},
        },
    )
    db_session.add(template)
    await db_session.flush()
    return template


@pytest.fixture
async def test_bmx_template(db_session: AsyncSession, test_app: TrainerApp) -> ExerciseTemplate:
    """Create a test BMX exercise template."""
    template = ExerciseTemplate(
        trainer_app_id=test_app.id,
        name="Saltos técnicos",
        discipline_type="bmx",
        field_schema={
            "runs": {"type": "integer", "label": "Runs", "required": True},
            "duracion_total": {"type": "duration", "label": "Duración Total", "required": True},
        },
    )
    db_session.add(template)
    await db_session.flush()
    return template


@pytest.fixture
async def test_session_exercise(
    db_session: AsyncSession,
    test_session: TrainingSession,
    test_exercise_template: ExerciseTemplate,
) -> SessionExercise:
    """Create a test session exercise."""
    exercise = SessionExercise(
        session_id=test_session.id,
        exercise_template_id=test_exercise_template.id,
        data={"repeticiones": 12, "series": 3, "peso": 25.5},
        order_index=0,
    )
    db_session.add(exercise)
    await db_session.flush()
    return exercise
