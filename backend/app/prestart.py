"""One-shot container startup tasks.

Runs BEFORE uvicorn on every container boot:
  1. Wait for the database to be reachable (with retry/backoff so
     MySQL cold-start doesn't cause a crash loop).
  2. Run `Base.metadata.create_all()` to bootstrap all tables on a
     fresh DB. This is idempotent — no-op on an existing schema.
  3. Sanity check: confirm a known table exists so we fail loudly
     with a clear message if the DB connection is wrong.

The SQLAlchemy models are the single source of truth for the schema.
"""
from __future__ import annotations

import logging
import sys
import time

from sqlalchemy import inspect, text
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.config import get_settings
from app.db import Base, engine

# Importing the models package registers all ORM classes on
# Base.metadata so create_all sees them. `app.models` is already
# imported transitively by `app.db` callers, but we import it
# explicitly here so this script is self-contained.
import app.models  # noqa: F401, E402

logger = logging.getLogger(__name__)

# How long to keep retrying the initial DB connection before giving
# up. 30s is enough for MySQL to finish its first-boot initialization
# (creating the system tables, the `portfolio` database, and the
# `portfolio` user from MYSQL_USER/MYSQL_PASSWORD env vars).
MAX_CONNECT_WAIT_S = 30
CONNECT_RETRY_S = 2


def _wait_for_db() -> None:
    """Block until the database accepts connections.

    Catches the 1045 'Access denied' and 2003 'Can't connect' errors
    that happen when MySQL is still initializing the user accounts
    after a fresh start. Retries with linear backoff up to
    MAX_CONNECT_WAIT_S.
    """
    deadline = time.monotonic() + MAX_CONNECT_WAIT_S
    attempt = 0
    while True:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            if attempt > 0:
                logger.info("✓ database is ready (after %d retries)", attempt)
            return
        except OperationalError as exc:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                logger.error("✗ database not reachable after %ds", MAX_CONNECT_WAIT_S)
                logger.error("  last error: %s", exc)
                logger.error("  → check that DATABASE_URL is correct and MySQL is up")
                sys.exit(1)
            # MySQL returns this exact text for both "wrong password"
            # and "user not yet created" during the first few seconds
            # of boot. Both are recoverable with a retry.
            err = str(exc.orig) if exc.orig else str(exc)
            if "Access denied" in err or "Can't connect" in err or "Unknown database" in err:
                attempt += 1
                logger.info(
                    "  db not ready yet (attempt %d, %.0fs left): %s",
                    attempt, remaining, err.splitlines()[0],
                )
                time.sleep(min(CONNECT_RETRY_S, remaining))
                continue
            # Any other error is not a transient init issue — fail fast.
            raise


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    settings = get_settings()
    logger.info("→ prestart: connecting to %s", _redact_url(settings.DATABASE_URL))

    _wait_for_db()

    logger.info("→ create_all: bootstrapping base tables…")
    try:
        Base.metadata.create_all(bind=engine)
    except (OperationalError, ProgrammingError) as exc:
        logger.error("✗ create_all failed: %s", exc)
        return 1

    # Sanity check: confirm analytics_events exists now. If not,
    # something is very wrong (the model defines this table).
    inspector = inspect(engine)
    if not inspector.has_table("analytics_events"):
        logger.error("✗ analytics_events table missing after create_all")
        return 1

    logger.info("✓ base tables present")
    return 0


def _redact_url(url: str) -> str:
    """Hide the password in `mysql+pymysql://user:pass@host:port/db`."""
    if "@" not in url or "://" not in url:
        return url
    scheme, rest = url.split("://", 1)
    if "@" not in rest:
        return url
    creds, host = rest.split("@", 1)
    if ":" in creds:
        user, _ = creds.split(":", 1)
        return f"{scheme}://{user}:****@{host}"
    return url


if __name__ == "__main__":
    sys.exit(main())
