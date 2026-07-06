# --- Stage 1: install dependencies into a wheel we can copy across ---
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# build-essential + libpq-dev: required by some wheels (cryptography, etc.)
# We only need them at build time — they don't end up in the runtime image.
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential libssl-dev pkg-config \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install the project + deps. Doing this in a separate layer (after
# copying only pyproject.toml) lets Docker cache the dependency install
# and only re-install when pyproject.toml changes.
COPY pyproject.toml ./
RUN pip install --upgrade pip \
 && pip install .

# --- Stage 2: minimal runtime image ---
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Same Debian runtime libs that the wheels linked against at build time.
# libcurl4-openssl-dev / libpq5 are sometimes needed at runtime by
# cryptography / SQLAlchemy drivers.
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl libssl3 \
 && rm -rf /var/lib/apt/lists/*

# Create a non-root user for the runtime.
RUN useradd --create-home --uid 10001 --shell /bin/bash app

WORKDIR /app

# Copy installed site-packages + the project from the builder.
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy the source. Seed data is read at runtime from /app/seed-data.
COPY --chown=app:app app ./app
COPY --chown=app:app alembic ./alembic
COPY --chown=app:app alembic.ini ./
COPY --chown=app:app seed-data ./seed-data
COPY --chown=app:app pyproject.toml ./

# Persistent volume target — uploads land here and survive container restarts.
RUN mkdir -p /data/uploads && chown -R app:app /data

USER app

EXPOSE 8000

# Seed on first start, then run migrations + uvicorn. We're using
# `alembic upgrade head` rather than `create_all` so the schema in MySQL
# matches the versioned migrations in alembic/versions/.
# The seed step is idempotent and refreshes the admin password on every
# boot — set ADMIN_BOOTSTRAP_PASSWORD once and forget it.
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
