"""Single-row content tables (hero, settings)."""
from datetime import datetime
from sqlalchemy import JSON, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class HeroRow(Base):
    """Single-row table keyed by id='hero'. The full HeroContent is stored in `data`."""

    __tablename__ = "hero"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )


class SettingsRow(Base):
    __tablename__ = "settings"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )