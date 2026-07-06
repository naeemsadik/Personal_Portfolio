"""Snapshot subsystem: site-state + snapshot CRUD + publish/rollback."""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_admin
from app.models import AdminUser, SiteSettingKV, SiteSnapshotRow
from app.schemas.snapshot import (
    SiteSnapshotListOut,
    SiteSnapshotOut,
    SiteStateIn,
    SiteStateOut,
    SnapshotCreateIn,
)
from app.services.snapshots import (
    _version_slug,
    _validate_version,
    generate_snapshot,
)

router = APIRouter(tags=["snapshots"])


# ---- Site-state key/value helpers -----------------------------------------

_KEY_MODE = "snapshot_mode"
_KEY_VERSION = "published_snapshot_version"


def _read_setting(db: Session, key: str) -> str | None:
    row = db.get(SiteSettingKV, key)
    return row.value if row is not None else None


def _write_setting(db: Session, key: str, value: str | None) -> None:
    row = db.get(SiteSettingKV, key)
    if row is None:
        row = SiteSettingKV(key=key, value=value)
        db.add(row)
    else:
        row.value = value
    db.flush()


def _get_site_state(db: Session) -> SiteStateOut:
    mode_raw = _read_setting(db, _KEY_MODE) or "off"
    mode = "published" if mode_raw == "published" else "off"
    version = _read_setting(db, _KEY_VERSION) if mode == "published" else None
    return SiteStateOut(snapshotMode=mode, publishedVersion=version)


# ---- Public site-state endpoint -------------------------------------------


@router.get("/site-state", response_model=SiteStateOut)
def get_site_state(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> SiteStateOut:
    state = _get_site_state(db)
    response.headers["Cache-Control"] = "public, max-age=10, s-maxage=10"
    return state


# ---- Admin site-state endpoint --------------------------------------------


@router.post("/admin/site-state", response_model=SiteStateOut)
def set_site_state(
    payload: SiteStateIn,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> SiteStateOut:
    if payload.mode == "off":
        # Demote the currently-published row to `archived` so the
        # history table reflects reality (no row claims to be Active
        # when the live site isn't using it).
        now = datetime.now()
        for row in (
            db.query(SiteSnapshotRow)
            .filter(SiteSnapshotRow.status == "published")
            .all()
        ):
            row.status = "archived"
            row.archived_at = now
        _write_setting(db, _KEY_MODE, "off")
        _write_setting(db, _KEY_VERSION, None)
    else:
        if not payload.version:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="version is required when mode='published'",
            )
        snap = (
            db.query(SiteSnapshotRow)
            .filter(SiteSnapshotRow.version == payload.version)
            .one_or_none()
        )
        if snap is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="snapshot version not found",
            )
        if snap.status != "published":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "snapshot version is not currently published "
                    f"(status={snap.status})"
                ),
            )
        _write_setting(db, _KEY_MODE, "published")
        _write_setting(db, _KEY_VERSION, payload.version)

    db.commit()
    return _get_site_state(db)


# ---- Snapshot CRUD --------------------------------------------------------


def _ensure_task_state(request: Request) -> tuple[dict, dict]:
    """Lazy-init the in-memory task registries on `app.state`.

    We attach them on the first call so test harnesses that don't go
    through the lifespan can still use the router.
    """
    state = request.app.state
    if not hasattr(state, "snapshot_tasks"):
        state.snapshot_tasks = {}
    if not hasattr(state, "snapshot_cancel"):
        state.snapshot_cancel = {}
    return state.snapshot_tasks, state.snapshot_cancel


@router.post(
    "/admin/snapshots",
    response_model=SiteSnapshotOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_snapshot(
    payload: SnapshotCreateIn,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> SiteSnapshotOut:
    """Create a new snapshot row and kick off generation as a background task."""
    # Refuse if a snapshot is already running.
    busy = (
        db.query(SiteSnapshotRow)
        .filter(SiteSnapshotRow.status == "generating")
        .first()
    )
    if busy is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"a snapshot is already generating (id={busy.id}, "
                f"version={busy.version})"
            ),
        )

    version = (payload.version or _version_slug()).strip()
    _validate_version(version)

    # Reject duplicate version slugs explicitly so we don't write two
    # on-disk trees to the same path.
    if (
        db.query(SiteSnapshotRow)
        .filter(SiteSnapshotRow.version == version)
        .first()
        is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"version '{version}' already exists",
        )

    snap = SiteSnapshotRow(
        version=version,
        status="generating",
        notes=payload.notes,
        started_at=datetime.now(),
        creator_email=admin.email,
        warnings_json=[],
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)

    tasks, cancels = _ensure_task_state(request)
    cancel_event = asyncio.Event()
    cancels[snap.id] = cancel_event
    # Forward the admin's JWT so the crawler can authenticate against
    # `/api/public-routes`. The default 15-minute token may expire
    # mid-crawl for very large sites; mint a 2-hour token for the
    # crawler. This is safe because the token is held only in this
    # process's task and never persisted.
    from app.config import get_settings
    from jose import jwt

    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
    crawler_jwt = jwt.encode(
        {
            "sub": str(admin.id),
            "role": "admin",
            "exp": expires_at,
            "iat": datetime.now(timezone.utc),
            "purpose": "snapshot-crawler",
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )

    task = asyncio.create_task(
        generate_snapshot(
            snapshot_id=snap.id,
            admin_jwt=crawler_jwt,
            admin_email=admin.email,
            cancel_event=cancel_event,
        )
    )
    tasks[snap.id] = task
    task.add_done_callback(
        lambda _t, sid=snap.id: cancels.pop(sid, None) and tasks.pop(sid, None)
    )

    return SiteSnapshotOut.model_validate(snap)


@router.get("/admin/snapshots", response_model=SiteSnapshotListOut)
def list_snapshots(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
    limit: int = 50,
    offset: int = 0,
) -> SiteSnapshotListOut:
    q = db.query(SiteSnapshotRow).order_by(desc(SiteSnapshotRow.created_at))
    total = q.count()
    rows = q.limit(max(1, min(limit, 200))).offset(max(0, offset)).all()
    return SiteSnapshotListOut(
        items=[SiteSnapshotOut.model_validate(r) for r in rows],
        total=total,
    )


@router.get("/admin/snapshots/{snapshot_id}", response_model=SiteSnapshotOut)
def get_snapshot(
    snapshot_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> SiteSnapshotOut:
    snap = db.get(SiteSnapshotRow, snapshot_id)
    if snap is None:
        raise HTTPException(status_code=404, detail="snapshot not found")
    return SiteSnapshotOut.model_validate(snap)


@router.get(
    "/admin/snapshots/{snapshot_id}/progress",
    response_model=SiteSnapshotOut,
)
def snapshot_progress(
    snapshot_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> SiteSnapshotOut:
    """Same payload as detail — named for the polling client to be explicit."""
    return get_snapshot(snapshot_id=snapshot_id, db=db, _admin=_admin)  # type: ignore[arg-type]


@router.post("/admin/snapshots/{snapshot_id}/cancel", response_model=SiteSnapshotOut)
def cancel_snapshot(
    snapshot_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> SiteSnapshotOut:
    snap = db.get(SiteSnapshotRow, snapshot_id)
    if snap is None:
        raise HTTPException(status_code=404, detail="snapshot not found")
    if snap.status != "generating":
        raise HTTPException(
            status_code=409,
            detail=f"snapshot is not generating (status={snap.status})",
        )
    _, cancels = _ensure_task_state(request)
    ev = cancels.get(snapshot_id)
    if ev is not None:
        ev.set()
    return SiteSnapshotOut.model_validate(snap)


# ---- Publish / rollback / archive / delete -------------------------------


def _do_publish(db: Session, snapshot_id: int) -> SiteSnapshotRow:
    """Atomically promote a `generated` row to `published`.

    Demotes any currently-published row to `archived`, updates
    `site_settings`, and flips `snapshot_mode='published'`. All in one
    transaction.

    Returns the freshly-published row. Raises HTTPException(409) on bad
    state (not found, wrong status, etc.).
    """
    snap = db.get(SiteSnapshotRow, snapshot_id)
    if snap is None:
        raise HTTPException(status_code=404, detail="snapshot not found")
    # Refuse to publish a row that isn't `generated` or `archived`.
    # `published` is itself a no-op (we already are live on it).
    if snap.status not in ("generated", "archived"):
        raise HTTPException(
            status_code=409,
            detail=(
                f"snapshot cannot be published (status={snap.status}); "
                "expected 'generated' or 'archived'"
            ),
        )

    now = datetime.now()
    # Demote the current published row (if any) to archived.
    current_published = (
        db.query(SiteSnapshotRow)
        .filter(SiteSnapshotRow.status == "published")
        .all()
    )
    for row in current_published:
        if row.id == snap.id:
            continue
        row.status = "archived"
        row.archived_at = now

    # Promote the target. The status guard makes this race-safe: if
    # two publishes race, only one UPDATE actually flips status.
    rows_updated = (
        db.query(SiteSnapshotRow)
        .filter(SiteSnapshotRow.id == snapshot_id)
        .filter(SiteSnapshotRow.status.in_(("generated", "archived")))
        .update(
            {
                SiteSnapshotRow.status: "published",
                SiteSnapshotRow.published_at: now,
                SiteSnapshotRow.archived_at: None,
            },
            synchronize_session=False,
        )
    )
    if rows_updated == 0:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="snapshot status changed concurrently",
        )

    # Update site_settings in the same transaction.
    _write_setting(db, _KEY_MODE, "published")
    _write_setting(db, _KEY_VERSION, snap.version)

    db.commit()
    db.refresh(snap)
    return snap


@router.post(
    "/admin/snapshots/{snapshot_id}/publish", response_model=SiteSnapshotOut
)
def publish_snapshot(
    snapshot_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> SiteSnapshotOut:
    """Promote a `generated` (or `archived`) snapshot to `published`."""
    snap = _do_publish(db, snapshot_id)
    return SiteSnapshotOut.model_validate(snap)


@router.post(
    "/admin/snapshots/{snapshot_id}/rollback", response_model=SiteSnapshotOut
)
def rollback_snapshot(
    snapshot_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> SiteSnapshotOut:
    """Alias for publish — used when restoring an older `archived` snapshot."""
    snap = _do_publish(db, snapshot_id)
    return SiteSnapshotOut.model_validate(snap)


@router.post(
    "/admin/snapshots/{snapshot_id}/archive", response_model=SiteSnapshotOut
)
def archive_snapshot(
    snapshot_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> SiteSnapshotOut:
    """Mark a `generated` row `archived`. Refuses on `published`."""
    snap = db.get(SiteSnapshotRow, snapshot_id)
    if snap is None:
        raise HTTPException(status_code=404, detail="snapshot not found")
    if snap.status == "published":
        # Only refuse if this is the currently-live one. Otherwise the
        # admin has already disabled snapshot mode and is just cleaning
        # up an old published row.
        live_version = _read_setting(db, _KEY_VERSION)
        if live_version == snap.version:
            raise HTTPException(
                status_code=409,
                detail=(
                    "snapshot is currently live; disable snapshot mode "
                    "or rollback to a different version before archiving"
                ),
            )
    if snap.status != "generated":
        raise HTTPException(
            status_code=409,
            detail=f"snapshot cannot be archived (status={snap.status})",
        )
    snap.status = "archived"
    snap.archived_at = datetime.now()
    db.commit()
    db.refresh(snap)
    return SiteSnapshotOut.model_validate(snap)


@router.delete(
    "/admin/snapshots/{snapshot_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_snapshot(
    snapshot_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> Response:
    """Remove a snapshot row and its on-disk files.

    Refuses if the snapshot is the currently live one (status='published'
    AND the live site is pointing at it). The admin must disable
    snapshot mode first, or rollback to a different version.
    """
    snap = db.get(SiteSnapshotRow, snapshot_id)
    if snap is None:
        return Response(status_code=204)
    if snap.status == "published":
        live_version = _read_setting(db, _KEY_VERSION)
        if live_version == snap.version:
            raise HTTPException(
                status_code=409,
                detail=(
                    "snapshot is currently live; disable snapshot mode or "
                    "rollback to a different version before deleting"
                ),
            )
    # Best-effort filesystem cleanup. Failures here don't roll back
    # the DB delete — orphaned files are picked up by manual cleanup.
    try:
        from app.services.snapshots import snapshot_root

        root = snapshot_root(snap.version)
        if root.exists():
            import shutil

            shutil.rmtree(root)
    except Exception as e:
        # Don't propagate — log it instead. The row is the source of truth.
        import logging

        logging.warning(
            "failed to remove on-disk snapshot %s: %s", snap.version, e
        )
    db.delete(snap)
    db.commit()
    return Response(status_code=204)