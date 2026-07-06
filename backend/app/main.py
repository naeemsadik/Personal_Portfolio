"""FastAPI application entry point."""
import asyncio
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db import Base, SessionLocal, engine
from app.models import SiteSnapshotRow
from app.routers import analytics, auth, blog, content, health, messages, snapshots, uploads

# Register all models on Base.metadata so `Base.metadata.create_all` is aware
# of them when the startup hook below runs.
import app.models  # noqa: F401, E402


async def _snapshot_recovery_sweep() -> None:
    """Periodically mark stuck `generating` rows as `failed`.

    `asyncio.create_task`-based generation does not survive a server
    restart — if the process dies mid-crawl, the row stays `generating`
    forever. This sweep runs every 60s and fails any row whose
    `started_at` is older than 5 minutes.
    """
    while True:
        try:
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            return
        try:
            db = SessionLocal()
            try:
                cutoff = datetime.now() - timedelta(minutes=5)
                stuck = (
                    db.query(SiteSnapshotRow)
                    .filter(
                        SiteSnapshotRow.status == "generating",
                        SiteSnapshotRow.started_at.is_not(None),
                        SiteSnapshotRow.started_at < cutoff,
                    )
                    .all()
                )
                for s in stuck:
                    s.status = "failed"
                    s.error_message = "aborted: server restarted"
                    s.finished_at = datetime.now()
                if stuck:
                    db.commit()
            finally:
                db.close()
        except Exception:
            # Don't let a sweep error kill the loop.
            pass


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Naeem Abdullah Sadik — Portfolio API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url=None,
    )

    @app.on_event("startup")
    def _create_missing_tables() -> None:
        """Best-effort create-all so a fresh DB has its tables without a
        manual `alembic upgrade head`. Alembic remains the source of truth;
        this is just a safety net for the common case where the user pulls
        and runs `uvicorn app.main:app` without first running migrations."""
        Base.metadata.create_all(bind=engine)
        # Ensure the snapshot storage directory exists.
        settings.snapshots_dir.mkdir(parents=True, exist_ok=True)
        # Initialize in-memory task registries.
        app.state.snapshot_tasks = {}
        app.state.snapshot_cancel = {}

    @app.on_event("startup")
    def _start_snapshot_sweep() -> None:
        app.state.snapshot_sweep_task = asyncio.create_task(
            _snapshot_recovery_sweep()
        )

    @app.on_event("shutdown")
    async def _cancel_sweep_and_tasks() -> None:
        sweep = getattr(app.state, "snapshot_sweep_task", None)
        if sweep is not None:
            sweep.cancel()
        for t in list(getattr(app.state, "snapshot_tasks", {}).values()):
            t.cancel()
        for ev in list(getattr(app.state, "snapshot_cancel", {}).values()):
            ev.set()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Serve uploaded files at /media/*
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/media",
        StaticFiles(directory=str(upload_dir), check_dir=False),
        name="media",
    )

    # Routers
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(content.router)
    app.include_router(blog.router)
    app.include_router(messages.router)
    app.include_router(analytics.router)
    app.include_router(snapshots.router)
    app.include_router(uploads.router)

    return app


app = create_app()