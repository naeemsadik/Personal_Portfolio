"""site_snapshots + site_settings

Adds:
- site_snapshots: one row per generated static snapshot
- site_settings: key/value state for the snapshot subsystem (live mode,
  currently published version)

Revision ID: a3c7b2d4e5f6
Revises: 918698828ab8
Create Date: 2026-06-22 18:00:00.000000

NOTE: For fresh installs, `Base.metadata.create_all` in app/main.py
bootstraps these tables. This migration exists for environments that
manage their schema purely through alembic.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c7b2d4e5f6'
down_revision: Union[str, None] = '918698828ab8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'site_settings',
        sa.Column('key', sa.String(length=64), primary_key=True),
        sa.Column('value', sa.Text(), nullable=True),
        sa.Column(
            'updated_at',
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=False,
        ),
    )

    op.create_table(
        'site_snapshots',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('version', sa.String(length=64), nullable=False, unique=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.func.current_timestamp(),
            nullable=False,
        ),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('finished_at', sa.DateTime(), nullable=True),
        sa.Column('published_at', sa.DateTime(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.Column('total_size_bytes', sa.Integer(), nullable=False, default=0),
        sa.Column('page_count', sa.Integer(), nullable=False, default=0),
        sa.Column('pages_failed_count', sa.Integer(), nullable=False, default=0),
        sa.Column('warnings_json', sa.JSON(), nullable=False, default=list),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('creator_email', sa.String(length=190), nullable=True),
        sa.Column('base_url', sa.String(length=255), nullable=True),
        sa.Column('current_path', sa.String(length=255), nullable=True),
    )
    op.create_index('idx_snap_status', 'site_snapshots', ['status'])
    op.create_index('idx_snap_created', 'site_snapshots', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_snap_created', table_name='site_snapshots')
    op.drop_index('idx_snap_status', table_name='site_snapshots')
    op.drop_table('site_snapshots')
    op.drop_table('site_settings')