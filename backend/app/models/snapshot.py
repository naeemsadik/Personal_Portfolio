"""Snapshot subsystem state.

Two tables:

- `site_settings`: a small key/value store for snapshot subsystem state
  (current mode, currently published version, etc). Separate from the
  user-editable `SettingsRow` (which holds the public site's content
  JSON). The two are not merged — they have different semantics and
  different writers.

- `site_snapshots`: one row per manually-generated static snapshot of
  the public site. See the snapshot router for status transitions.
"""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SiteSettingKV(Base):
    """Key/value state for the snapshot subsystem.

    `value` is JSON-encoded so callers can store complex values. We
    always store strings — callers parse them. Keep it simple.
    """

    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )


class SiteSnapshotRow(Base):
    """One row per generated static snapshot.

    Status transitions (enforced in the router, not the DB):

        generating -> generated -> published -> archived
                  |-> failed (terminal)
                  |-> archived (cancelled or stale)

    Only one row may be in `published` at a time. Enforced in the
    publish transaction.
    """

    __tablename__ = "site_snapshots"

    id: Mapped[int] = mapped_column(
        Integer().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    version: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    total_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    page_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pages_failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    warnings_json: Mapped[Any] = mapped_column(JSON, nullable=False, default=list)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    creator_email: Mapped[str | None] = mapped_column(String(190), nullable=True)
    base_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_path: Mapped[str | None] = mapped_column(String(255), nullable=True)