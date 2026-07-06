# --- Stage 1: install dependencies into a wheel we can copy across ---
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

# build-essential + libssl-dev: required by some wheels (cryptography, etc.).
# We only need them at build time — they don't end up in the runtime image.
# IMPORTANT: keep every RUN on a single line. Coolify prepends `ARG ...`
# declarations before each `RUN` it finds, which breaks bash line
# continuations (`pip install \\\n && pip install .`) and silently turns
# the second half into garbage that gets executed.
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libssl-dev pkg-config && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install the project + deps. We also COPY the `app/` source so
# `pip install .` has the packages it declares (`app`, `app.models`,
# ...). Doing deps-only first then re-installing gives us a stable
# cache layer for the heavy third-party packages.
COPY pyproject.toml ./
COPY app ./app
RUN pip install --upgrade pip setuptools wheel && pip install . --no-cache-dir

# --- Stage 2: minimal runtime image ---
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

# Runtime libs that the wheels linked against at build time.
# libssl3 is needed by cryptography and the MySQL connector.
RUN apt-get update && apt-get install -y --no-install-recommends curl libssl3 && rm -rf /var/lib/apt/lists/*

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

EXPOSE 8080

# Startup sequence on every container boot:
#
#   1. `python -m app.prestart` runs `Base.metadata.create_all` to
#      bootstrap all base tables on a fresh DB. The first alembic
#      migration (`918698828ab8`) tries to ALTER TABLE
#      analytics_events — which fails if the table doesn't exist
#      yet, so we have to create it first.
#
#   2. `alembic upgrade head` applies the additive schema changes
#      (new columns + indexes) on top of the base tables.
#
#   3. `python -m app.seed` is idempotent: it upserts the admin user
#      (refreshing the password from ADMIN_BOOTSTRAP_PASSWORD on
#      every boot) and writes the initial content if missing.
#
#   4. `uvicorn app.main:app` starts the API server. The startup
#      hook in app/main.py also runs create_all, which is harmless
#      (it only creates tables that don't exist).
#
# Single-line CMD so Coolify's ARG injection doesn't break the
# shell pipeline (it breaks bash `\\\n` line-continuations).
CMD ["sh", "-c", "python -m app.prestart && alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8080"]
