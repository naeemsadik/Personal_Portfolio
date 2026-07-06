"""Snapshot generation engine.

`generate_snapshot` is the long-lived coroutine that:
  1. Fetches the route list from the running Next.js admin API
     (`GET /api/public-routes`), authenticating with the admin's JWT
     forwarded as Bearer.
  2. Walks `backend/uploads/` and copies each file into the snapshot
     directory under `_media/`.
  3. For each route, fetches the rendered HTML from the running Next.js
     server, rewrites media URLs to point at the local `/_media/...`
     files, and writes it to `<snapshots_dir>/<version>/<path>/index.html`.
  4. Updates the `SiteSnapshotRow` after each page (so polling UI sees
     progress) and on completion marks the row `generated` (or `failed`).

Cancellation: the loop checks an `asyncio.Event` between pages. The
caller sets the event to break the loop; the row is then marked
`failed` with `error_message='cancelled'`.

Crash recovery: this coroutine does NOT survive a FastAPI restart. The
caller is expected to use `asyncio.create_task(...)` stored in
`app.state.snapshot_tasks` so the lifespan can cancel it on shutdown.
A periodic sweep task in `app.main` marks any `generating` row older
than 5 minutes as `failed` so a crashed generation is recoverable.
"""
from __future__ import annotations

import asyncio
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import SiteSnapshotRow

# ---- Version slug ---------------------------------------------------------

_VERSION_RE = re.compile(r"^v\d{4}-\d{2}-\d{2}-[A-Za-z0-9._-]+$")


def _version_slug(now: datetime | None = None) -> str:
    """Build a version slug like `v2026-06-22-142233`."""
    when = now or datetime.now()
    return f"v{when.strftime('%Y-%m-%d-%H%M%S')}"


def _validate_version(version: str) -> None:
    if not _VERSION_RE.match(version):
        raise ValueError(
            f"Invalid version '{version}'. "
            "Expected pattern: vYYYY-MM-DD-<token> (e.g. v2026-06-22-142233)."
        )


# ---- Media URL rewriting --------------------------------------------------

# Match `src="..."` (any value) and capture the inner URL.
_RE_SRC = re.compile(r"""(?P<attr>src)\s*=\s*['"](?P<val>[^'"]+)['"]""", re.IGNORECASE)
# Match `srcset="..."` whose value is a comma-separated list of
# `<url> <descriptor>` candidates.
_RE_SRCSET = re.compile(r"""(?P<attr>srcset)\s*=\s*['"](?P<val>[^'"]+)['"]""", re.IGNORECASE)
# Match `href` for absolute http(s) URLs that should be rewritten to local.
_RE_HREF_ABS = re.compile(
    r"""(?P<attr>href)\s*=\s*['"](?P<val>https?://[^'"]+)['"]""", re.IGNORECASE
)


def _rewrite_url_to_media(url: str, api_origin: str) -> str:
    """Rewrite a single absolute URL to its local `/_media/...` equivalent.

    Only URLs that resolve under the API origin's `/media/` path are
    rewritten; everything else is left alone. This is intentionally
    conservative — we don't want to mangle cross-origin links to other
    sites.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return url
    api_parsed = urlparse(api_origin)
    if parsed.netloc != api_parsed.netloc:
        return url
    if not parsed.path.startswith("/media/"):
        return url
    # Preserve the path tail. Drop query/fragment — Next.js static
    # serving doesn't care about them.
    return f"/_media{parsed.path[len('/media'):]}"


def _rewrite_media_urls(html: str, api_origin: str) -> str:
    """Rewrite absolute media URLs in HTML to local `/_media/...` paths.

    Handles:
      - `src="..."`  (most <img> and <source>)
      - `srcset="..."` (split on commas, rewrite each URL — <img srcset>)

    `href` is left alone in v1 because the public site has no absolute
    `/media/...` hrefs.
    """

    def _replace_src(m: re.Match[str]) -> str:
        return f'{m.group("attr")}="{_rewrite_url_to_media(m.group("val"), api_origin)}"'

    def _replace_srcset(m: re.Match[str]) -> str:
        original = m.group("val")
        # Split on commas, but the descriptor is everything after the URL.
        # We just isolate the URL token (first whitespace-delimited chunk).
        parts: list[str] = []
        for chunk in original.split(","):
            chunk = chunk.strip()
            if not chunk:
                continue
            # First whitespace separates URL from descriptor.
            url_token, _, descriptor = chunk.partition(" ")
            new_url = _rewrite_url_to_media(url_token.strip(), api_origin)
            if descriptor:
                parts.append(f"{new_url} {descriptor.strip()}")
            else:
                parts.append(new_url)
        return f'{m.group("attr")}="{" , ".join(parts)}"'

    html = _RE_SRC.sub(_replace_src, html)
    html = _RE_SRCSET.sub(_replace_srcset, html)
    # Belt and braces — some sites put media URLs in href too.
    html = _RE_HREF_ABS.sub(
        lambda m: f'{m.group("attr")}="{_rewrite_url_to_media(m.group("val"), api_origin)}"',
        html,
    )
    return html


# ---- File size helpers ----------------------------------------------------


def _dir_size_bytes(root: Path) -> int:
    total = 0
    if not root.exists():
        return 0
    for path in root.rglob("*"):
        if path.is_file():
            total += path.stat().st_size
    return total


# ---- Public route shape ---------------------------------------------------

type PublicRoute = dict[str, Any]


async def _fetch_public_routes(
    client: httpx.AsyncClient,
    base_url: str,
    admin_jwt: str,
) -> list[PublicRoute]:
    """Fetch the canonical public-route list from the running Next.js app.

    Auth is required: the route is admin-gated on the Next side. We
    forward the admin's JWT as a Bearer token.
    """
    url = f"{base_url.rstrip('/')}/api/public-routes"
    res = await client.get(
        url,
        headers={"Authorization": f"Bearer {admin_jwt}"},
        timeout=10.0,
    )
    res.raise_for_status()
    data = res.json()
    if not isinstance(data, dict) or "routes" not in data or not isinstance(data["routes"], list):
        raise ValueError(f"Unexpected response from {url}: {data!r}")
    return data["routes"]


def _mirror_uploads(uploads_dir: Path, media_dest: Path) -> int:
    """Copy `uploads_dir` → `media_dest` recursively.

    Returns the number of files copied. Skips directories that don't
    exist (no uploads yet) and is tolerant of partial files.
    """
    if not uploads_dir.exists():
        media_dest.mkdir(parents=True, exist_ok=True)
        return 0
    media_dest.mkdir(parents=True, exist_ok=True)
    count = 0
    for src in uploads_dir.rglob("*"):
        if not src.is_file():
            continue
        rel = src.relative_to(uploads_dir)
        dst = media_dest / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        count += 1
    return count


# ---- Snapshot path helpers ------------------------------------------------


def snapshot_root(version: str) -> Path:
    settings = get_settings()
    root = settings.snapshots_dir / version
    root.mkdir(parents=True, exist_ok=True)
    return root


def url_to_snapshot_path(root: Path, url_path: str) -> Path:
    """Map a public URL path to its on-disk file under `<root>`.

    `/`                  → `<root>/index.html`
    `/blog`              → `<root>/blog/index.html`
    `/blog/judgex`       → `<root>/blog/judgex/index.html`
    """
    if url_path == "/" or not url_path:
        return root / "index.html"
    trimmed = url_path.rstrip("/")
    return root / trimmed.lstrip("/") / "index.html"


# ---- The main coroutine ---------------------------------------------------


async def generate_snapshot(
    snapshot_id: int,
    admin_jwt: str,
    admin_email: str,
    cancel_event: asyncio.Event | None = None,
) -> None:
    """Run the full generation pipeline for one snapshot.

    - Reads the `SiteSnapshotRow` by id (status must be `generating`).
    - Fetches routes from Next.js, mirrors uploads, crawls each route,
      writes HTML, updates progress in the DB.
    - On success: marks row `generated`. On failure: marks `failed` with
      `error_message`. On cancellation: marks `failed` with
      `error_message='cancelled'`.

    The DB is committed after every page so the admin UI's polling
    reflects progress in real time.
    """
    cancel_event = cancel_event or asyncio.Event()
    settings = get_settings()
    base_url = settings.NEXT_PUBLIC_SITE_URL
    api_origin = settings.PUBLIC_API_URL

    # Local DB session — `generate_snapshot` runs as a background task,
    # outside a request context, so we open our own session.
    db = SessionLocal()
    try:
        snap = db.get(SiteSnapshotRow, snapshot_id)
        if snap is None:
            raise RuntimeError(f"Snapshot {snapshot_id} not found")
        if snap.status != "generating":
            # Could be a duplicate task spawn or a row reset by another
            # process. Bail without touching the row.
            return

        # Use the version as the on-disk subdir name.
        version = snap.version
        _validate_version(version)
        root = snapshot_root(version)

        # Step 1 — fetch routes.
        try:
            async with httpx.AsyncClient() as client:
                routes = await _fetch_public_routes(client, base_url, admin_jwt)
        except Exception as e:
            snap.status = "failed"
            snap.error_message = f"failed to fetch route list: {e}"
            snap.finished_at = datetime.now()
            db.commit()
            return

        # Step 2 — mirror uploads.
        uploads_dir = Path(settings.UPLOAD_DIR).resolve()
        media_dest = root / "_media"
        try:
            copied = _mirror_uploads(uploads_dir, media_dest)
        except Exception as e:
            snap.status = "failed"
            snap.error_message = f"failed to mirror uploads: {e}"
            snap.finished_at = datetime.now()
            db.commit()
            return

        snap.page_count = len(routes)
        snap.current_path = None
        db.commit()

        # Step 3 — crawl each route.
        pages_written = 0
        pages_failed = 0
        warnings: list[str] = []

        async with httpx.AsyncClient(
            timeout=settings.SNAPSHOT_CRAWLER_TIMEOUT_S,
            follow_redirects=True,
        ) as client:
            for r in routes:
                if cancel_event.is_set():
                    snap.status = "failed"
                    snap.error_message = "cancelled"
                    snap.finished_at = datetime.now()
                    db.commit()
                    return

                url_path = str(r.get("path") or "").strip()
                if not url_path:
                    continue
                snap.current_path = url_path
                db.commit()

                target = base_url.rstrip("/") + url_path
                try:
                    res = await client.get(
                        target,
                        headers={
                            "Accept": "text/html",
                            "User-Agent": "NAS-Snapshot-Crawler/1.0",
                        },
                    )
                    if res.status_code != 200:
                        pages_failed += 1
                        warnings.append(
                            f"{url_path}: HTTP {res.status_code}"
                        )
                        snap.pages_failed_count = pages_failed
                        snap.warnings_json = warnings
                        db.commit()
                        continue
                    # Final body rewrite — media URLs → local paths.
                    body = _rewrite_media_urls(res.text, api_origin)
                    out_path = url_to_snapshot_path(root, url_path)
                    out_path.parent.mkdir(parents=True, exist_ok=True)
                    out_path.write_text(body, encoding="utf-8")
                    pages_written += 1
                except Exception as e:
                    pages_failed += 1
                    warnings.append(f"{url_path}: {e!s}")
                    snap.pages_failed_count = pages_failed
                    snap.warnings_json = warnings
                    db.commit()
                    continue

                # Update size and progress after each page.
                snap.total_size_bytes = _dir_size_bytes(root)
                db.commit()

        # Step 4 — finalize.
        snap.status = "generated"
        snap.finished_at = datetime.now()
        snap.current_path = None
        snap.total_size_bytes = _dir_size_bytes(root)
        snap.warnings_json = warnings
        snap.creator_email = admin_email
        snap.base_url = base_url
        db.commit()
    finally:
        db.close()