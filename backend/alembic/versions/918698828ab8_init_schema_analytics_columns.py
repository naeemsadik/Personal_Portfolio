"""init schema + analytics columns

Revision ID: 918698828ab8
Revises:
Create Date: 2026-06-21 22:45:06.098817

Adds:
- projects.status, experience.status (draft/published, default 'published')
- analytics_events.user_agent, referrer, ip_hash, session_id
- new indexes on (path, ts) and (session_id, ts) for analytics queries
- new index on (status, ord) for both content tables

NOTE: For fresh installs, `Base.metadata.create_all` in app/main.py bootstraps
all base tables. This migration handles the *additive* schema changes — the new
columns and indexes — that `create_all` alone wouldn't apply to a database
that was already created before this revision.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '918698828ab8'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- analytics_events: viewer metadata ---
    op.add_column('analytics_events', sa.Column('user_agent', sa.String(length=255), nullable=True))
    op.add_column('analytics_events', sa.Column('referrer', sa.String(length=255), nullable=True))
    op.add_column('analytics_events', sa.Column('ip_hash', sa.String(length=64), nullable=True))
    op.add_column('analytics_events', sa.Column('session_id', sa.String(length=64), nullable=True))
    op.create_index('idx_path_ts', 'analytics_events', ['path', 'ts'], unique=False)
    op.create_index('idx_session_ts', 'analytics_events', ['session_id', 'ts'], unique=False)

    # --- experience: status column ---
    # SQLite needs a server_default for NOT NULL on an existing table.
    op.add_column(
        'experience',
        sa.Column(
            'status',
            sa.String(length=16),
            nullable=False,
            server_default='published',
        ),
    )
    op.create_index('idx_status_ord', 'experience', ['status', 'ord'], unique=False)

    # --- projects: status column ---
    op.add_column(
        'projects',
        sa.Column(
            'status',
            sa.String(length=16),
            nullable=False,
            server_default='published',
        ),
    )
    op.create_index('idx_status_ord', 'projects', ['status', 'ord'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_status_ord', table_name='projects')
    op.drop_column('projects', 'status')
    op.drop_index('idx_status_ord', table_name='experience')
    op.drop_column('experience', 'status')
    op.drop_index('idx_session_ts', table_name='analytics_events')
    op.drop_index('idx_path_ts', table_name='analytics_events')
    op.drop_column('analytics_events', 'session_id')
    op.drop_column('analytics_events', 'ip_hash')
    op.drop_column('analytics_events', 'referrer')
    op.drop_column('analytics_events', 'user_agent')
