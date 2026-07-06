"""One-shot container startup tasks.

Runs BEFORE uvicorn on a fresh database so that:
  1. Base.metadata.create_all() creates all tables (analytics_events,
     experience, projects, site_settings, site_snapshots, etc.) using
     the SQLAlchemy model definitions as the single source of truth.

This script is idempotent — running create_all on a database that
already has the tables is a no-op. Safe to run on every container
boot.
"""
from __future__ import annotations

import logging
import sys

from sqlalchemy import inspect

from app.config import get_settings
from app.db import Base, engine

# Importing the models package registers all ORM classes on
# Base.metadata so create_all sees them. `app.models` is already
# imported transitively by `app.db` callers, but we import it
# explicitly here so this script is self-contained.
import app.models  # noqa: F401, E402

logger = logging.getLogger(__name__)


def main() -> int:
    settings = get_settings()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    logger.info("→ create_all: bootstrapping base tables…")
    Base.metadata.create_all(bind=engine)

    # Quick sanity check: confirm analytics_events exists now.
    inspector = inspect(engine)
    if not inspector.has_table("analytics_events"):
        logger.error("✗ analytics_events table still missing after create_all")
        return 1

    logger.info("✓ base tables present")
    return 0


if __name__ == "__main__":
    sys.exit(main())
