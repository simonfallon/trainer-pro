"""
Seed test data for development and E2E testing.

This script creates TWO complete test datasets:
1. BMX Trainer with BMX-specific data
2. Physio Trainer with Physio-specific data

IMPORTANT: This is for DEVELOPMENT ONLY.
"""

import asyncio
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete

from app.database import async_session_maker
from app.models.app import TrainerApp
from app.models.client import Client
from app.models.exercise_set import ExerciseSet
from app.models.exercise_template import ExerciseTemplate
from app.models.location import Location
from app.models.payment import Payment
from app.models.session import TrainingSession
from app.models.session_exercise import SessionExercise
from app.models.session_group import SessionGroup
from app.models.trainer import Trainer


async def seed_data():
    """Seed test data (idempotent - safe to run multiple times)."""
    async with async_session_maker() as db:
        print("🌱 Starting data seeding...")

        # Clean up all existing data
        print("  Cleaning up existing data...")
        await db.execute(delete(SessionExercise))
        await db.execute(delete(ExerciseSet))
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
                    "primary": "#334155",
                    "secondary": "#94a3b8",
                    "background": "#f8fafc",
                    "text": "#0f172a",
                },
                "fonts": {"heading": "Inter", "body": "Inter"},
            },
        )
        db.add(bmx_app)
        await db.flush()
        print(f"  ✓ Created BMX app (ID: {bmx_app.id})")

        # BMX Locations
        bmx_track = Location(
            trainer_id=bmx_trainer.id,
            name="Pista Carlos Ramírez",
            type="track",
            address_line1="Unidad Deportiva de Belén",
            city="Medellín",
            region="Antioquia",
            country="Colombia",
            latitude=6.223,
            longitude=-75.590,
        )
        db.add(bmx_track)

        bmx_track_envigado = Location(
            trainer_id=bmx_trainer.id,
            name="Pista Envigado",
            type="track",
            city="Envigado",
            region="Antioquia",
            country="Colombia",
        )
        db.add(bmx_track_envigado)

        await db.flush()
        await db.refresh(bmx_track)
        await db.refresh(bmx_track_envigado)

        bmx_locations = [bmx_track, bmx_track_envigado]
        print(f"  ✓ Created {len(bmx_locations)} BMX locations")

        # BMX Clients (10 clients)
        bmx_clients = []
        clients_data = [
            ("Santiago Ramírez", "+57 301 111 1111", datetime(1994, 7, 20), "M", 175, 75.0),
            ("Valentina Torres", "+57 302 222 2222", datetime(1998, 3, 15), "F", 165, 58.0),
            ("Mateo Gómez", "+57 303 333 3333", datetime(2000, 11, 5), "M", 180, 82.0),
            ("Mariana Pajón", "+57 304 444 4444", datetime(1991, 10, 10), "F", 158, 53.0),
            ("Carlos Oquendo", "+57 305 555 5555", datetime(1987, 11, 16), "M", 182, 85.0),
            ("Diego Arboleda", "+57 306 666 6666", datetime(1996, 8, 16), "M", 178, 80.0),
            ("Vincent Pelluard", "+57 307 777 7777", datetime(1990, 5, 31), "M", 183, 86.0),
            ("Andrea Escobar", "+57 308 888 8888", datetime(1997, 7, 21), "F", 165, 60.0),
            ("Juan Carlos Díaz", "+57 309 999 9999", datetime(1999, 1, 12), "M", 174, 72.0),
            ("Sofía Cadavid", "+57 310 000 0000", datetime(2001, 12, 5), "F", 162, 55.0),
        ]

        for _i, (name, phone, birth_date, gender, height_cm, weight_kg) in enumerate(clients_data):
            # Randomly assign a location
            client_location = bmx_locations[_i % len(bmx_locations)]

            client = Client(
                trainer_id=bmx_trainer.id,
                name=name,
                phone=phone,
                default_location_id=client_location.id,
                birth_date=birth_date,
                gender=gender,
                height_cm=height_cm,
                weight_kg=weight_kg,
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
                    "duracion_total": {
                        "type": "duration",
                        "label": "Duración Total",
                        "required": True,
                    },
                    "tiempos_vuelta": {
                        "type": "array",
                        "label": "Tiempos por Vuelta",
                        "itemType": "duration",
                        "required": False,
                    },
                },
            },
            {
                "name": "Pump track",
                "discipline_type": "bmx",
                "field_schema": {
                    "runs": {"type": "integer", "label": "Runs", "required": True},
                    "duracion_total": {
                        "type": "duration",
                        "label": "Duración Total",
                        "required": True,
                    },
                },
            },
            {
                "name": "Práctica de curvas",
                "discipline_type": "bmx",
                "field_schema": {
                    "runs": {"type": "integer", "label": "Runs", "required": True},
                    "duracion_total": {
                        "type": "duration",
                        "label": "Duración Total",
                        "required": True,
                    },
                },
            },
        ]

        bmx_templates_models = []
        for template_data in bmx_templates:
            template = ExerciseTemplate(trainer_app_id=bmx_app.id, **template_data)
            db.add(template)
            bmx_templates_models.append(template)
        await db.flush()
        print(f"  ✓ Created {len(bmx_templates)} BMX exercise templates")

        # BMX Sessions
        bmx_sessions_data = [
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
                "_exercises": [
                    {
                        "template_index": 0,
                        "data": {
                            "runs": 5,
                            "duracion_total": "00:20:00",
                            "lap_times_ms": [
                                65000,
                                63000,
                                62000,
                                64000,
                                61000,
                            ],
                        },
                    }
                ],
            },
            {
                "client_id": bmx_clients[1].id,
                "location_id": bmx_track.id,
                "scheduled_at": today - timedelta(days=5) + timedelta(hours=10),
                "duration_minutes": 90,
                "status": "completed",
                "is_paid": False,
                "_exercises": [
                    {"template_index": 1, "data": {"runs": 3, "duracion_total": "00:15:00"}}
                ],
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

        for i in range(2, 10):
            bmx_sessions_data.append(
                {
                    "client_id": bmx_clients[i].id,
                    "location_id": bmx_track.id,
                    "scheduled_at": today
                    - timedelta(days=random.randint(1, 14))
                    + timedelta(hours=random.randint(7, 16)),
                    "duration_minutes": 90,
                    "status": "completed",
                    "is_paid": False,
                    "_exercises": [
                        {
                            "template_index": 0,
                            "data": {
                                "runs": 5,
                                "duracion_total": "00:20:00",
                                "lap_times_ms": [
                                    random.randint(45000, 50000),
                                    random.randint(45000, 50000),
                                    random.randint(45000, 50000),
                                ],
                            },
                        }
                    ],
                }
            )

        bmx_sessions = []
        for session_data in bmx_sessions_data:
            exercises_data = session_data.pop("_exercises", [])
            session = TrainingSession(trainer_id=bmx_trainer.id, **session_data)
            db.add(session)
            await db.flush()
            bmx_sessions.append(session)

            for i, ex_data in enumerate(exercises_data):
                template = bmx_templates_models[ex_data["template_index"]]
                session_exercise = SessionExercise(
                    session_id=session.id,
                    exercise_template_id=template.id,
                    custom_name="Toma de Tiempo BMX",
                    data=ex_data["data"],
                    order_index=i,
                )
                db.add(session_exercise)
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
                    "primary": "#1e3a8a",
                    "secondary": "#3b82f6",
                    "background": "#f8fafc",
                    "text": "#0f172a",
                },
                "fonts": {"heading": "Inter", "body": "Inter"},
            },
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

        physio_center_laureles = Location(
            trainer_id=physio_trainer.id,
            name="Consultorio Laureles",
            type="trainer_base",
            city="Medellín",
        )
        db.add(physio_center_laureles)

        await db.flush()
        await db.refresh(physio_center)
        await db.refresh(home_location)
        await db.refresh(physio_center_laureles)

        physio_locations = [physio_center, home_location, physio_center_laureles]
        print(f"  ✓ Created {len(physio_locations)} Physio locations")

        # Physio Clients (10 clients)
        physio_clients_data_list = [
            (
                "Ana García",
                "+57 301 444 4444",
                "ana@example.com",
                datetime(1985, 5, 10),
                "F",
                160,
                60.0,
            ),
            (
                "Carlos Rodríguez",
                "+57 302 555 5555",
                "carlos@example.com",
                datetime(1978, 9, 22),
                "M",
                178,
                85.0,
            ),
            (
                "María López",
                "+57 303 666 6666",
                "maria@example.com",
                datetime(1990, 12, 1),
                "F",
                168,
                65.0,
            ),
            (
                "Juan Pérez",
                "+57 304 777 7777",
                "juan@example.com",
                datetime(1988, 3, 15),
                "M",
                175,
                75.0,
            ),
            (
                "Laura Gómez",
                "+57 305 888 8888",
                "laura@example.com",
                datetime(1992, 8, 20),
                "F",
                165,
                62.0,
            ),
            (
                "Daniel Torres",
                "+57 306 999 9999",
                "daniel@example.com",
                datetime(1985, 11, 5),
                "M",
                180,
                80.0,
            ),
            (
                "Camila Martínez",
                "+57 307 111 2222",
                "camila@example.com",
                datetime(1995, 2, 28),
                "F",
                162,
                58.0,
            ),
            (
                "Andrés Fernández",
                "+57 308 222 3333",
                "andres@example.com",
                datetime(1990, 7, 12),
                "M",
                172,
                70.0,
            ),
            (
                "Valeria Ramírez",
                "+57 309 333 4444",
                "valeria@example.com",
                datetime(1998, 9, 10),
                "F",
                170,
                65.0,
            ),
            (
                "Felipe Herrera",
                "+57 310 444 5555",
                "felipe@example.com",
                datetime(1982, 4, 25),
                "M",
                185,
                90.0,
            ),
        ]

        physio_clients = []
        for _i, (name, phone, email, birth_date, gender, height_cm, weight_kg) in enumerate(
            physio_clients_data_list
        ):
            # Randomly assign a location
            client_location = physio_locations[_i % len(physio_locations)]

            client = Client(
                trainer_id=physio_trainer.id,
                name=name,
                phone=phone,
                email=email,
                default_location_id=client_location.id,
                birth_date=birth_date,
                gender=gender,
                height_cm=height_cm,
                weight_kg=weight_kg,
            )
            db.add(client)
            physio_clients.append(client)
        await db.flush()
        print(f"  ✓ Created {len(physio_clients)} Physio clients")

        # Physio Exercise Templates (20 total)
        default_physio_schema = {
            "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
            "series": {"type": "integer", "label": "Series", "required": True},
            "peso": {"type": "float", "label": "Peso kg", "required": False},
        }
        default_physio_schema_time = {
            "repeticiones": {"type": "integer", "label": "Repeticiones", "required": True},
            "series": {"type": "integer", "label": "Series", "required": True},
            "duracion_segundos": {
                "type": "integer",
                "label": "Duración (seg)",
                "required": False,
            },
        }

        physio_template_names = [
            ("Sentadillas", default_physio_schema),  # 0
            ("Press de banca", default_physio_schema),  # 1
            ("Peso muerto", default_physio_schema),  # 2
            ("Plancha", default_physio_schema_time),  # 3
            ("Estocadas", default_physio_schema),  # 4
            ("Flexiones de pecho", default_physio_schema),  # 5
            ("Dominadas", default_physio_schema),  # 6
            ("Curl de bíceps", default_physio_schema),  # 7
            ("Extensión de tríceps", default_physio_schema),  # 8
            ("Elevación de pantorrillas", default_physio_schema),  # 9
            ("Press militar", default_physio_schema),  # 10
            ("Remo con mancuerna", default_physio_schema),  # 11
            ("Elevaciones laterales", default_physio_schema),  # 12
            ("Abdominales", default_physio_schema_time),  # 13
            ("Vuelos", default_physio_schema),  # 14
            ("Puentes de glúteo", default_physio_schema),  # 15
            ("Hip thrust", default_physio_schema),  # 16
            ("Jalón al pecho", default_physio_schema),  # 17
            ("Movilidad articular", default_physio_schema_time),  # 18
            ("Estiramientos activos", default_physio_schema_time),  # 19
        ]

        physio_templates_models = []
        for name, schema in physio_template_names:
            template = ExerciseTemplate(
                trainer_app_id=physio_app.id,
                name=name,
                discipline_type="physio",
                field_schema=schema,
            )
            db.add(template)
            physio_templates_models.append(template)
        await db.flush()
        print(f"  ✓ Created {len(physio_templates_models)} Physio exercise templates")

        # Physio Sessions
        physio_sessions_data = [
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
                "_circuits": [
                    {
                        "name": "Circuito Fuerza Base",
                        "series": 3,
                        "exercises": [
                            {
                                "template_index": 0,
                                "data": {"repeticiones": 10, "peso": 40.0},
                            },  # Sentadillas
                            {
                                "template_index": 1,
                                "data": {"repeticiones": 10, "peso": 30.0},
                            },  # Press de banca
                        ],
                    }
                ],
            },
            {
                "client_id": physio_clients[0].id,
                "location_id": physio_center.id,
                "scheduled_at": today - timedelta(days=5) + timedelta(hours=10),
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": True,
                "paid_at": today - timedelta(days=4),
                "_circuits": [
                    {
                        "name": "Circuito Tren Superior",
                        "series": 4,
                        "exercises": [
                            {
                                "template_index": 6,
                                "data": {"repeticiones": 8, "peso": 0.0},
                            },  # Dominadas
                            {
                                "template_index": 10,
                                "data": {"repeticiones": 12, "peso": 15.0},
                            },  # Press militar
                            {
                                "template_index": 3,
                                "data": {"repeticiones": 1, "duracion_segundos": 60},
                            },  # Plancha
                        ],
                    }
                ],
            },
            # Recent unpaid
            {
                "client_id": physio_clients[0].id,
                "location_id": physio_center.id,
                "scheduled_at": today - timedelta(days=3) + timedelta(hours=14),
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": False,
                "_circuits": [
                    {
                        "name": "Circuito Tren Inferior",
                        "series": 3,
                        "exercises": [
                            {
                                "template_index": 2,
                                "data": {"repeticiones": 12, "peso": 60.0},
                            },  # Peso muerto
                            {
                                "template_index": 4,
                                "data": {"repeticiones": 12, "peso": 20.0},
                            },  # Estocadas
                            {
                                "template_index": 15,
                                "data": {"repeticiones": 15, "peso": 0.0},
                            },  # Puentes de glúteo
                        ],
                    }
                ],
            },
            {
                "client_id": physio_clients[1].id,
                "location_id": physio_center.id,
                "scheduled_at": today - timedelta(days=4) + timedelta(hours=10),
                "duration_minutes": 60,
                "status": "completed",
                "is_paid": False,
                "_circuits": [
                    {
                        "name": "Evaluación Inicial",
                        "series": 1,
                        "exercises": [
                            {
                                "template_index": 18,
                                "data": {"repeticiones": 1, "duracion_segundos": 300},
                            },  # Movilidad
                            {
                                "template_index": 0,
                                "data": {"repeticiones": 15, "peso": 0.0},
                            },  # Sentadillas (bodyweight)
                        ],
                    }
                ],
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

        for i in range(2, 10):
            physio_sessions_data.append(
                {
                    "client_id": physio_clients[i].id,
                    "location_id": physio_center.id,
                    "scheduled_at": today
                    - timedelta(days=random.randint(1, 14))
                    + timedelta(hours=random.randint(7, 16)),
                    "duration_minutes": 60,
                    "status": "completed",
                    "is_paid": False,
                    "_circuits": [
                        {
                            "name": f"Circuito {random.randint(1, 100)}",
                            "series": 3,
                            "exercises": [
                                {
                                    "template_index": random.randint(0, 5),
                                    "data": {"repeticiones": 10, "peso": 20.0},
                                },
                                {
                                    "template_index": random.randint(6, 12),
                                    "data": {"repeticiones": 12, "peso": 15.0},
                                },
                            ],
                        }
                    ],
                }
            )

        physio_sessions = []
        for session_data in physio_sessions_data:
            circuits_data = session_data.pop("_circuits", [])
            session = TrainingSession(trainer_id=physio_trainer.id, **session_data)
            db.add(session)
            await db.flush()
            physio_sessions.append(session)

            for c_idx, circ_data in enumerate(circuits_data):
                exercise_set = ExerciseSet(
                    session_id=session.id,
                    name=circ_data["name"],
                    series=circ_data["series"],
                    order_index=c_idx,
                )
                db.add(exercise_set)
                await db.flush()

                for ex_idx, ex_data in enumerate(circ_data["exercises"]):
                    template = physio_templates_models[ex_data["template_index"]]
                    session_exercise = SessionExercise(
                        session_id=session.id,
                        exercise_template_id=template.id,
                        exercise_set_id=exercise_set.id,
                        custom_name=template.name,
                        data=ex_data["data"],
                        order_index=ex_idx,
                    )
                    db.add(session_exercise)
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
        print("  ✓ Created 1 Physio payment")

        # Reset sequences
        import sqlalchemy as sa

        for table in [
            "trainers",
            "trainer_apps",
            "locations",
            "clients",
            "exercise_templates",
            "training_sessions",
            "session_groups",
            "payments",
            "session_exercises",
            "exercise_sets",
        ]:
            await db.execute(
                sa.text(
                    f"SELECT setval('{table}_id_seq', COALESCE((SELECT MAX(id) FROM {table}), 1))"
                )
            )
        print("\n  ✓ Sequences reset")

        # Commit all changes
        await db.commit()
        print("\n✅ Data seeding complete!")
        print("\n📊 Test Data Summary:")
        print(f"   BMX Trainer ID: {bmx_trainer.id} (email: bmx@test.com)")
        print(f"   Physio Trainer ID: {physio_trainer.id} (email: physio@test.com)")
        print(f"   Total Clients: {len(bmx_clients) + len(physio_clients)}")
        print(f"   Total Exercise Templates: {len(bmx_templates) + len(physio_templates_models)}")
        print(f"   Total Sessions: {len(bmx_sessions) + len(physio_sessions)}")


if __name__ == "__main__":
    asyncio.run(seed_data())
