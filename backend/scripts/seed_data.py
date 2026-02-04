"""
Seed test data for development and E2E testing.

This script creates a fixed set of test data with predictable UUIDs
to enable consistent agent E2E testing.

IMPORTANT: This is for DEVELOPMENT ONLY.
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.database import async_session_maker
from app.models.trainer import Trainer
from app.models.app import TrainerApp
from app.models.location import Location
from app.models.client import Client
from app.models.session import TrainingSession
from app.models.payment import Payment


# Fixed UUIDs for consistent testing
TRAINER_ID = "00000000-0000-0000-0000-000000000001"
APP_ID = "00000000-0000-0000-0000-000000000002"
LOCATION_IDS = {
    "gym": "00000000-0000-0000-0000-000000000011",
    "track": "00000000-0000-0000-0000-000000000012",
    "home": "00000000-0000-0000-0000-000000000013",
}
CLIENT_IDS = {
    "client_a": "00000000-0000-0000-0000-000000000021",
    "client_b": "00000000-0000-0000-0000-000000000022",
    "client_c": "00000000-0000-0000-0000-000000000023",
    "client_d": "00000000-0000-0000-0000-000000000024",
}


async def seed_data():
    """Seed test data (idempotent - safe to run multiple times)."""
    async with async_session_maker() as db:
        print("🌱 Starting data seeding...")
        
        # 1. Create Trainer
        result = await db.execute(select(Trainer).where(Trainer.id == TRAINER_ID))
        trainer = result.scalar_one_or_none()
        
        if not trainer:
            print(f"  Creating test trainer (ID: {TRAINER_ID})...")
            trainer = Trainer(
                id=TRAINER_ID,
                name="Test Trainer",
                email="test@trainer.dev",
                phone="+57 300 123 4567",
                google_id="test_google_id",
            )
            db.add(trainer)
            await db.flush()
        else:
            print(f"  ✓ Trainer already exists (ID: {TRAINER_ID})")
        
        # 2. Create TrainerApp
        result = await db.execute(select(TrainerApp).where(TrainerApp.id == APP_ID))
        app = result.scalar_one_or_none()
        
        if not app:
            print(f"  Creating test app (ID: {APP_ID})...")
            app = TrainerApp(
                id=APP_ID,
                trainer_id=TRAINER_ID,
                name="Test Training App",
                theme_id="bmx",
                theme_config={
                    "colors": {
                        "primary": "#2563eb",
                        "secondary": "#64748b",
                        "background": "#ffffff",
                        "text": "#1e293b"
                    },
                    "fonts": {
                        "heading": "Inter",
                        "body": "Inter"
                    }
                }
            )
            db.add(app)
            await db.flush()
        else:
            print(f"  ✓ App already exists (ID: {APP_ID})")
        
        # 3. Create Locations
        locations_created = 0
        locations = [
            {
                "id": LOCATION_IDS["gym"],
                "name": "Pista Motocross Road Track Guarne",
                "type": "track",
                "address_line1": "Guarne, Antioquia",
                "city": "Guarne",
                "region": "Antioquia",
                "country": "Colombia",
                "latitude": 6.243704,
                "longitude": -75.4371669,
                "google_place_id": "ChIJp-f-Q0onRo4RjE1ExuY43Fc",
            },
            {
                "id": LOCATION_IDS["track"],
                "name": "Fisiofit Centro de Fisioterapia",
                "type": "gym",
                "address_line1": "Medellín, Antioquia",
                "city": "Medellín",
                "region": "Antioquia",
                "country": "Colombia",
                # Coordinates will be approximate - user can update via UI
                "latitude": 6.2476,
                "longitude": -75.5658,
            },
            {
                "id": LOCATION_IDS["home"],
                "name": "Tierra Clara Apartamentos",
                "type": "client_home",
                "address_line1": "Sabaneta, Antioquia",
                "city": "Sabaneta",
                "region": "Antioquia",
                "country": "Colombia",
                "latitude": 6.1927169,
                "longitude": -75.563297,
                "google_place_id": "ChIJbXLWBOGDRo4R3RcRdWiIYig",
            },
        ]
        
        for loc_data in locations:
            result = await db.execute(select(Location).where(Location.id == loc_data["id"]))
            if not result.scalar_one_or_none():
                location = Location(
                    trainer_id=TRAINER_ID,
                    **loc_data
                )
                db.add(location)
                locations_created += 1
        
        await db.flush()
        print(f"  Created {locations_created} location(s)" if locations_created > 0 else "  ✓ All locations exist")
        
        # 4. Create Clients
        clients_created = 0
        clients = [
            {
                "id": CLIENT_IDS["client_a"],
                "name": "Ana García",
                "phone": "+57 301 234 5678",
                "email": "ana@example.com",
                "notes": "Objetivo: Perder peso y mejorar resistencia",
                "birth_date": datetime(1990, 5, 15),
                "gender": "F",
                "height_cm": 165,
                "weight_kg": 68.5,
                "default_location_id": LOCATION_IDS["gym"],
            },
            {
                "id": CLIENT_IDS["client_b"],
                "name": "Carlos Rodríguez",
                "phone": "+57 302 345 6789",
                "email": "carlos@example.com",
                "birth_date": datetime(1985, 8, 22),
                "gender": "M",
                "height_cm": 178,
                "weight_kg": 82.0,
                "default_location_id": LOCATION_IDS["track"],
            },
            {
                "id": CLIENT_IDS["client_c"],
                "name": "María López",
                "phone": "+57 303 456 7890",
                "notes": "Preparación para maratón",
                "default_location_id": LOCATION_IDS["track"],
            },
            {
                "id": CLIENT_IDS["client_d"],
                "name": "Juan Pérez",
                "phone": "+57 304 567 8901",
                "email": "juan@example.com",
                "default_location_id": LOCATION_IDS["home"],
            },
        ]
        
        for client_data in clients:
            result = await db.execute(select(Client).where(Client.id == client_data["id"]))
            if not result.scalar_one_or_none():
                client = Client(
                    trainer_id=TRAINER_ID,
                    **client_data
                )
                db.add(client)
                clients_created += 1
        
        await db.flush()
        print(f"  Created {clients_created} client(s)" if clients_created > 0 else "  ✓ All clients exist")
        
        # 5. Create Training Sessions
        sessions_created = 0
        from sqlalchemy import delete
        
        # Cleanup existing sessions and payments for this trainer to avoid overlap/duplicates
        print("  Cleaning up existing sessions and payments...")
        await db.execute(delete(TrainingSession).where(TrainingSession.trainer_id == TRAINER_ID))
        await db.execute(delete(Payment).where(Payment.trainer_id == TRAINER_ID))
        await db.flush()

        # Base date: Today at 00:00:00
        now = datetime.now()
        today = datetime(now.year, now.month, now.day)
        
        sessions = [
            # Past sessions (completed, paid)
            {
                "client_id": CLIENT_IDS["client_a"],
                "location_id": LOCATION_IDS["gym"],
                "scheduled_at": today - timedelta(days=7) + timedelta(hours=8), # 08:00
                "duration_minutes": 60,
                "notes": "Sesión de fuerza",
                "status": "completed",
                "is_paid": True,
                "paid_at": today - timedelta(days=6),
                "session_doc": "Ejercicios: Sentadillas 3x10, Press de banca 3x10, Peso muerto 3x8. Cliente mostró buen progreso.",
            },
            {
                "client_id": CLIENT_IDS["client_a"],
                "location_id": LOCATION_IDS["gym"],
                "scheduled_at": today - timedelta(days=5) + timedelta(hours=10), # 10:00
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": True,
                "paid_at": today - timedelta(days=4),
                "session_doc": "Cardio intenso 30min + core. Excelente resistencia.",
            },
            # Recent unpaid sessions
            {
                "client_id": CLIENT_IDS["client_a"],
                "location_id": LOCATION_IDS["gym"],
                "scheduled_at": today - timedelta(days=3) + timedelta(hours=14), # 14:00
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": False,
                "session_doc": "Circuito funcional. Cliente reporta fatiga.",
            },
            {
                "client_id": CLIENT_IDS["client_b"],
                "location_id": LOCATION_IDS["track"],
                "scheduled_at": today - timedelta(days=6) + timedelta(hours=8), # 08:00
                "duration_minutes": 90,
                "status": "completed",
                "is_paid": False,
            },
            {
                "client_id": CLIENT_IDS["client_b"],
                "location_id": LOCATION_IDS["track"],
                "scheduled_at": today - timedelta(days=4) + timedelta(hours=10), # 10:00
                "duration_minutes": 90,
                "status": "completed",
                "is_paid": False,
            },
            # Upcoming sessions
            {
                "client_id": CLIENT_IDS["client_a"],
                "location_id": LOCATION_IDS["gym"],
                "scheduled_at": today + timedelta(days=1) + timedelta(hours=8), # 08:00
                "duration_minutes": 60,
                "notes": "Sesión de piernas",
                "status": "scheduled",
                "is_paid": False,
            },
            {
                "client_id": CLIENT_IDS["client_b"],
                "location_id": LOCATION_IDS["track"],
                "scheduled_at": today + timedelta(days=2) + timedelta(hours=10), # 10:00
                "duration_minutes": 90,
                "status": "scheduled",
                "is_paid": False,
            },
            {
                "client_id": CLIENT_IDS["client_c"],
                "location_id": LOCATION_IDS["track"],
                "scheduled_at": today + timedelta(days=3) + timedelta(hours=8), # 08:00
                "duration_minutes": 120,
                "notes": "Entrenamiento largo - preparación maratón",
                "status": "scheduled",
                "is_paid": False,
            },
            # Cancelled session
            {
                "client_id": CLIENT_IDS["client_d"],
                "location_id": LOCATION_IDS["home"],
                "scheduled_at": today - timedelta(days=2) + timedelta(hours=16), # 16:00
                "duration_minutes": 60,
                "status": "cancelled",
                "is_paid": False,
            },
        ]
        
        for session_data in sessions:
            session = TrainingSession(
                trainer_id=TRAINER_ID,
                **session_data
            )
            db.add(session)
            sessions_created += 1
        
        await db.flush()
        print(f"  Created {sessions_created} session(s)")
        
        # 6. Create Payment Records
        payments_created = 0
        payments = [
            {
                "client_id": CLIENT_IDS["client_a"],
                "sessions_paid": 2,
                "amount_cop": 100000,
                "payment_date": today - timedelta(days=6),
                "notes": "Pago por 2 sesiones",
            },
            {
                "client_id": CLIENT_IDS["client_c"],
                "sessions_paid": 10,
                "amount_cop": 450000,
                "payment_date": today - timedelta(days=1),
                "notes": "Paquete prepago de 10 sesiones",
            },
        ]
        
        for payment_data in payments:
            payment = Payment(
                trainer_id=TRAINER_ID,
                **payment_data
            )
            db.add(payment)
            payments_created += 1
        
        await db.flush()
        print(f"  Created {payments_created} payment(s)")
        
        # Commit all changes
        await db.commit()
        print("\n✅ Data seeding complete!")
        print(f"\n📊 Test Data Summary:")
        print(f"   Trainer ID: {TRAINER_ID}")
        print(f"   App ID: {APP_ID}")
        print(f"   Locations: {len(LOCATION_IDS)}")
        print(f"   Clients: {len(CLIENT_IDS)}")
        print(f"   Sessions: {len(sessions)}")
        print(f"   Payments: {len(payments)}")


if __name__ == "__main__":
    asyncio.run(seed_data())
