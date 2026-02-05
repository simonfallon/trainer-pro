"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-02-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create trainers table
    op.create_table(
        'trainers',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=True),
        sa.Column('google_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_trainers_email', 'trainers', ['email'], postgresql_where=sa.text('email IS NOT NULL'))
    op.create_index('idx_trainers_phone', 'trainers', ['phone'])
    op.create_index('idx_trainers_google_id', 'trainers', ['google_id'], postgresql_where=sa.text('google_id IS NOT NULL'))
    
    # Create locations table
    op.create_table(
        'locations',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('trainer_id', sa.Integer(), sa.ForeignKey('trainers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('type', sa.String(20), nullable=False, server_default='other'),
        sa.Column('address_line1', sa.String(255), nullable=True),
        sa.Column('address_line2', sa.String(255), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('region', sa.String(100), nullable=True),
        sa.Column('postal_code', sa.String(20), nullable=True),
        sa.Column('country', sa.String(100), nullable=True),
        sa.Column('latitude', sa.Numeric(10, 8), nullable=True),
        sa.Column('longitude', sa.Numeric(11, 8), nullable=True),
        sa.Column('google_place_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.CheckConstraint("type IN ('trainer_base', 'client_home', 'gym', 'track', 'other')", name='valid_location_type'),
    )
    op.create_index('idx_locations_trainer', 'locations', ['trainer_id'])
    op.create_index('idx_locations_place_id', 'locations', ['google_place_id'], postgresql_where=sa.text('google_place_id IS NOT NULL'))
    
    # Create trainer_apps table
    op.create_table(
        'trainer_apps',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('trainer_id', sa.Integer(), sa.ForeignKey('trainers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('theme_id', sa.String(50), nullable=False),
        sa.Column('theme_config', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_apps_trainer', 'trainer_apps', ['trainer_id'])
    
    # Create clients table
    op.create_table(
        'clients',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('trainer_id', sa.Integer(), sa.ForeignKey('trainers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('phone', sa.String(50), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('default_location_id', sa.Integer(), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('google_id', sa.String(255), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
    )
    op.create_index('idx_clients_trainer', 'clients', ['trainer_id'], postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_clients_phone', 'clients', ['trainer_id', 'phone'])
    
    # Create training_sessions table
    op.create_table(
        'training_sessions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('trainer_id', sa.Integer(), sa.ForeignKey('trainers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('client_id', sa.Integer(), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('location_id', sa.Integer(), sa.ForeignKey('locations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_minutes', sa.Integer, nullable=False, server_default='60'),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='scheduled'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('NOW()')),
        sa.CheckConstraint("status IN ('scheduled', 'completed', 'cancelled')", name='valid_session_status'),
    )
    op.create_index('idx_sessions_trainer_date', 'training_sessions', ['trainer_id', 'scheduled_at'])
    op.create_index('idx_sessions_client', 'training_sessions', ['client_id'])
    
    # Create updated_at trigger function
    op.execute('''
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    ''')
    
    # Create triggers for all tables
    for table in ['trainers', 'locations', 'trainer_apps', 'clients', 'training_sessions']:
        op.execute(f'''
            CREATE TRIGGER tr_{table}_updated
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        ''')


def downgrade() -> None:
    # Drop triggers
    for table in ['trainers', 'locations', 'trainer_apps', 'clients', 'training_sessions']:
        op.execute(f'DROP TRIGGER IF EXISTS tr_{table}_updated ON {table}')
    
    op.execute('DROP FUNCTION IF EXISTS update_updated_at()')
    
    # Drop tables in reverse order of creation
    op.drop_table('training_sessions')
    op.drop_table('clients')
    op.drop_table('trainer_apps')
    op.drop_table('locations')
    op.drop_table('trainers')
