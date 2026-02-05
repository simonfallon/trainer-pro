"""
Seed test data for development and E2E testing.

This script creates TWO complete test datasets:
1. BMX Trainer with BMX-specific data
2. Physio Trainer with Physio-specific data

IMPORTANT: This is for DEVELOPMENT ONLY.
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, delete
from app.database import async_session_maker
from app.models.trainer import Trainer
from app.models.app import TrainerApp
from app.models.location import Location
from app.models.client import Client
from app.models.session import TrainingSession
from app.models.session_group import SessionGroup
from app.models.payment import Payment
from app.models.exercise_template import ExerciseTemplate


async def seed_data():
    """Seed test data (idempotent - safe to run multiple times)."""
    async with async_session_maker() as db:
        print("🌱 Starting data seeding...")
        
        # Clean up all existing data
        print("  Cleaning up existing data...")
        await db.execute(delete(Payment))
        await db.execute(delete(TrainingSession))
        await db.execute(delete(SessionGroup))
        await db.execute(delete(ExerciseTemplate))
        await db.execute(delete(Client))
        await db.execute(delete(Location))
        await db.execute(delete(TrainerApp))
        await db.execute(delete(Trainer))
        await db.flush()
        
        # Base date: Today at 00:00:00
        now = datetime.now()
        today = datetime(now.year, now.month, now.day)
        
        # ============================================================
        # BMX TRAINER DATASET
        # ============================================================
        print("\n📦 Creating BMX Trainer dataset...")
        
        bmx_trainer = Trainer(
            name="BMX Trainer",
            email="bmx@test.com",
            phone="+57 300 111 1111",
            discipline_type="bmx",
            google_id="bmx_google_id",
        )
        db.add(bmx_trainer)
        await db.flush()
        print(f"  ✓ Created BMX trainer (ID: {bmx_trainer.id})")
        
        bmx_app = TrainerApp(
            trainer_id=bmx_trainer.id,
            name="BMX Pro Training",
            theme_id="bmx",
            theme_config={
                "colors": {
                    "primary": "#ea580c",
                    "secondary": "#dc2626",
                    "background": "#ffffff",
                    "text": "#1e293b"
                },
                "fonts": {
                    "heading": "Inter",
                    "body": "Inter"
                }
            }
        )
        db.add(bmx_app)
        await db.flush()
        print(f"  ✓ Created BMX app (ID: {bmx_app.id})")
        
        # BMX Locations
        bmx_track = Location(
            trainer_id=bmx_trainer.id,
            name="Pista Motocross Road Track Guarne",
            type="track",
            address_line1="Guarne, Antioquia",
            city="Guarne",
            region="Antioquia",
            country="Colombia",
            latitude=6.243704,
            longitude=-75.4371669,
            google_place_id="ChIJp-f-Q0onRo4RjE1ExuY43Fc",
        )
        db.add(bmx_track)
        await db.flush()
        print(f"  ✓ Created BMX location")
        
        # BMX Clients
        bmx_clients = []
        for i, (name, phone) in enumerate([
            ("Santiago Ramírez", "+57 301 111 1111"),
            ("Valentina Torres", "+57 302 222 2222"),
            ("Mateo Gómez", "+57 303 333 3333"),
        ]):
            client = Client(
                trainer_id=bmx_trainer.id,
                name=name,
                phone=phone,
                default_location_id=bmx_track.id,
            )
            db.add(client)
            bmx_clients.append(client)
        await db.flush()
        print(f"  ✓ Created {len(bmx_clients)} BMX clients")
        
        # BMX Exercise Templates
        bmx_templates = [
            {
                "name": "Saltos técnicos",
                "discipline_type": "bmx",
                "field_schema": {
                    "runs": {"type": "integer", "label": "Runs", "required": True},
                    "duracion_total": {"type": "duration", "label": "Duración Total", "required": True},
                    "tiempos_vuelta": {"type": "array", "label": "Tiempos por Vuelta", "itemType": "duration", "required": False},
                }
            },
            {
                "name": "Pump track",
                "discipline_type": "bmx",
                "field_schema": {
                    "runs": {"type": "integer", "label": "Runs", "required": True},
                    "duracion_total": {"type": "duration", "label": "Duración Total", "required": True},
                }
            },
            {
                "name": "Práctica de curvas",
                "discipline_type": "bmx",
                "field_schema": {
                    "runs": {"type": "integer", "label": "Runs", "required": True},
                    "duracion_total": {"type": "duration", "label": "Duración Total", "required": True},
                }
            },
        ]
        
        for template_data in bmx_templates:
            template = ExerciseTemplate(
                trainer_app_id=bmx_app.id,
                **template_data
            )
            db.add(template)
        await db.flush()
        print(f"  ✓ Created {len(bmx_templates)} BMX exercise templates")
        
        # BMX Sessions
        bmx_sessions = [
            # Past completed sessions
            {
                "client_id": bmx_clients[0].id,
                "location_id": bmx_track.id,
                "scheduled_at": today - timedelta(days=7) + timedelta(hours=8),
                "duration_minutes": 90,
                "status": "completed",
                "is_paid": True,
                "paid_at": today - timedelta(days=6),
                "session_doc": "Excelente progreso en saltos. Mejoró técnica de aterrizaje.",
            },
            {
                "client_id": bmx_clients[1].id,
                "location_id": bmx_track.id,
                "scheduled_at": today - timedelta(days=5) + timedelta(hours=10),
                "duration_minutes": 90,
                "status": "completed",
                "is_paid": False,
            },
            # Upcoming sessions
            {
                "client_id": bmx_clients[0].id,
                "location_id": bmx_track.id,
                "scheduled_at": today + timedelta(days=1) + timedelta(hours=8),
                "duration_minutes": 90,
                "status": "scheduled",
                "is_paid": False,
            },
        ]
        
        for session_data in bmx_sessions:
            session = TrainingSession(
                trainer_id=bmx_trainer.id,
                **session_data
            )
            db.add(session)
        await db.flush()
        print(f"  ✓ Created {len(bmx_sessions)} BMX sessions")
        
        # ============================================================
        # PHYSIO TRAINER DATASET
        # ============================================================
        print("\n📦 Creating Physio Trainer dataset...")
        
        physio_trainer = Trainer(
            name="Physio Trainer",
            email="physio@test.com",
            phone="+57 300 222 2222",
            discipline_type="physio",
            google_id="physio_google_id",
        )
        db.add(physio_trainer)
        await db.flush()
        print(f"  ✓ Created Physio trainer (ID: {physio_trainer.id})")
        
        physio_app = TrainerApp(
            trainer_id=physio_trainer.id,
            name="Fisioterapia Pro",
            theme_id="physio",
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
        db.add(physio_app)
        await db.flush()
        print(f"  ✓ Created Physio app (ID: {physio_app.id})")
        
        # Physio Locations
        physio_center = Location(
            trainer_id=physio_trainer.id,
            name="Fisiofit Centro de Fisioterapia",
            type="gym",
            address_line1="Medellín, Antioquia",
            city="Medellín",
            region="Antioquia",
            country="Colombia",
            latitude=6.2476,
            longitude=-75.5658,
        )
        db.add(physio_center)
        
        home_location = Location(
            trainer_id=physio_trainer.id,
            name="Tierra Clara Apartamentos",
            type="client_home",
            address_line1="Sabaneta, Antioquia",
            city="Sabaneta",
            region="Antioquia",
            country="Colombia",
            latitude=6.1927169,
            longitude=-75.563297,
            google_place_id="ChIJbXLWBOGDRo4R3RcRdWiIYig",
        )
        db.add(home_location)
        await db.flush()
        print(f"  ✓ Created 2 Physio locations")
        
        # Physio Clients
        physio_clients = []
        for i, (name, phone, email) in enumerate([
            ("Ana García", "+57 301 444 4444", "ana@example.com"),
            ("Carlos Rodríguez", "+57 302 555 5555", "carlos@example.com"),
            ("María López", "+57 303 666 6666", "maria@example.com"),
        ]):
            client = Client(
                trainer_id=physio_trainer.id,
                name=name,
                phone=phone,
                email=email,
                default_location_id=physio_center.id,
            )
            db.add(client)
            physio_clients.append(client)
        await db.flush()
        print(f"  ✓ Created {len(physio_clients)} Physio clients")
        
        # Physio Exercise Templates
        physio_templates = [
            {
                "name": "Sentadillas",
                "discipline_type": "physio",
                "field_schema": {
                    "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
                    "series": {"type": "integer", "label": "Series", "required": True},
                    "peso": {"type": "float", "label": "Peso (kg)", "required": False},
                }
            },
            {
                "name": "Press de banca",
                "discipline_type": "physio",
                "field_schema": {
                    "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
                    "series": {"type": "integer", "label": "Series", "required": True},
                    "peso": {"type": "float", "label": "Peso (kg)", "required": False},
                }
            },
            {
                "name": "Peso muerto",
                "discipline_type": "physio",
                "field_schema": {
                    "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
                    "series": {"type": "integer", "label": "Series", "required": True},
                    "peso": {"type": "float", "label": "Peso (kg)", "required": False},
                }
            },
            {
                "name": "Plancha",
                "discipline_type": "physio",
                "field_schema": {
                    "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
                    "series": {"type": "integer", "label": "Series", "required": True},
                    "duracion_segundos": {"type": "integer", "label": "Duración (seg)", "required": False},
                }
            },
        ]
        
        for template_data in physio_templates:
            template = ExerciseTemplate(
                trainer_app_id=physio_app.id,
                **template_data
            )
            db.add(template)
        await db.flush()
        print(f"  ✓ Created {len(physio_templates)} Physio exercise templates")
        
        # Physio Sessions
        physio_sessions = [
            # Past completed sessions
            {
                "client_id": physio_clients[0].id,
                "location_id": physio_center.id,
                "scheduled_at": today - timedelta(days=7) + timedelta(hours=8),
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": True,
                "paid_at": today - timedelta(days=6),
                "session_doc": "Sentadillas 3x10, Press de banca 3x10. Buen progreso.",
            },
            {
                "client_id": physio_clients[0].id,
                "location_id": physio_center.id,
                "scheduled_at": today - timedelta(days=5) + timedelta(hours=10),
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": True,
                "paid_at": today - timedelta(days=4),
            },
            # Recent unpaid
            {
                "client_id": physio_clients[0].id,
                "location_id": physio_center.id,
                "scheduled_at": today - timedelta(days=3) + timedelta(hours=14),
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": False,
            },
            {
                "client_id": physio_clients[1].id,
                "location_id": physio_center.id,
                "scheduled_at": today - timedelta(days=4) + timedelta(hours=10),
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": False,
            },
            # Upcoming
            {
                "client_id": physio_clients[0].id,
                "location_id": physio_center.id,
                "scheduled_at": today + timedelta(days=1) + timedelta(hours=8),
                "duration_minutes": 60,
                "status": "scheduled",
                "is_paid": False,
            },
            {
                "client_id": physio_clients[1].id,
                "location_id": physio_center.id,
                "scheduled_at": today + timedelta(days=2) + timedelta(hours=10),
                "duration_minutes": 60,
                "status": "scheduled",
                "is_paid": False,
            },
        ]
        
        for session_data in physio_sessions:
            session = TrainingSession(
                trainer_id=physio_trainer.id,
                **session_data
            )
            db.add(session)
        await db.flush()
        print(f"  ✓ Created {len(physio_sessions)} Physio sessions")
        
        # Physio Payments
        payment = Payment(
            trainer_id=physio_trainer.id,
            client_id=physio_clients[0].id,
            sessions_paid=2,
            amount_cop=100000,
            payment_date=today - timedelta(days=6),
            notes="Pago por 2 sesiones",
        )
        db.add(payment)
        await db.flush()
        print(f"  ✓ Created 1 Physio payment")
        
        # Reset sequences
        import sqlalchemy as sa
        for table in ['trainers', 'trainer_apps', 'locations', 'clients', 'exercise_templates', 'training_sessions', 'session_groups', 'payments']:
            await db.execute(sa.text(
                f"SELECT setval('{table}_id_seq', COALESCE((SELECT MAX(id) FROM {table}), 1))"
            ))
        print("\n  ✓ Sequences reset")
        
        # Commit all changes
        await db.commit()
        print("\n✅ Data seeding complete!")
        print(f"\n📊 Test Data Summary:")
        print(f"   BMX Trainer ID: {bmx_trainer.id} (email: bmx@test.com)")
        print(f"   Physio Trainer ID: {physio_trainer.id} (email: physio@test.com)")
        print(f"   Total Clients: {len(bmx_clients) + len(physio_clients)}")
        print(f"   Total Exercise Templates: {len(bmx_templates) + len(physio_templates)}")
        print(f"   Total Sessions: {len(bmx_sessions) + len(physio_sessions)}")


if __name__ == "__main__":
    asyncio.run(seed_data())
