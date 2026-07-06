"""SQLAlchemy engine, SessionLocal, declarative Base, and the FastAPI dependency."""
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _resolve_url() -> str:
    settings = get_settings()
    if settings.DATABASE_URL:
        return settings.DATABASE_URL
    # Local-dev fallback: SQLite file in backend/.data/portfolio.db
    data_dir = Path(__file__).resolve().parents[1] / ".data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data_dir / 'portfolio.db'}"


_db_url = _resolve_url()
_is_sqlite = _db_url.startswith("sqlite")
engine = create_engine(
    _db_url,
    pool_pre_ping=not _is_sqlite,
    pool_recycle=3600 if not _is_sqlite else 3600,
    echo=False,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionLocal = sessionmaker(
    bind=engine, autocommit=False, autoflush=False, expire_on_commit=False
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a request-scoped DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()