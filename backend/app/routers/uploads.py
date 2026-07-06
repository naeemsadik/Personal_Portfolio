"""Uploads — admin only. Writes to UPLOAD_DIR and returns a public URL.

Two upload kinds are supported, selected via the `?kind=` query param:

- `kind=image` (default) — accepts `image/*`, written to `UPLOAD_DIR/`
  and served at `/media/{name}`. Cap: `MAX_UPLOAD_MB`.
- `kind=cv` — accepts `application/pdf` only, written to
  `UPLOAD_DIR/cv/` and served at `/media/cv/{name}`. Cap: `MAX_CV_UPLOAD_MB`.
"""
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.config import get_settings
from app.deps import get_current_admin
from app.models import AdminUser

router = APIRouter(prefix="/uploads", tags=["uploads"])

_SAFE_NAME = re.compile(r"[^a-zA-Z0-9._-]+")


def _safe_name(input_: str) -> str:
    cleaned = _SAFE_NAME.sub("-", input_).strip("-").lower()
    return cleaned or "file"


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload(
    file: Annotated[UploadFile, File(description="image/* (default) or application/pdf (kind=cv)")],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
    kind: Annotated[Literal["image", "cv"], Query(description="Upload kind: image or cv")] = "image",
) -> dict:
    settings = get_settings()

    # Content-type gate + size cap + subdir are all kind-specific.
    if kind == "cv":
        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="CV uploads must be application/pdf",
            )
        max_bytes = settings.max_cv_upload_bytes
        subdir = "cv"
    else:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="only image/* uploads are allowed",
            )
        max_bytes = settings.max_upload_bytes
        subdir = ""

    upload_dir = (Path(settings.UPLOAD_DIR) / subdir).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Read with size cap
    data = await file.read()
    if len(data) > max_bytes:
        mb_cap = max_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"file too large (>{mb_cap}MB)",
        )

    # Build a unique, safe filename
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    safe = _safe_name(file.filename or "upload")
    name = f"{timestamp}-{uuid.uuid4().hex[:8]}-{safe}"
    target = upload_dir / name
    target.write_bytes(data)

    media_segment = f"{subdir}/{name}" if subdir else name
    public_url = f"{settings.PUBLIC_API_URL.rstrip('/')}/media/{media_segment}"
    return {
        "url": public_url,
        "pathname": f"uploads/{media_segment}",
        "kind": kind,
    }


@router.delete("/{pathname:path}", status_code=status.HTTP_204_NO_CONTENT)
def delete_upload(
    pathname: str,
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> None:
    settings = get_settings()
    # Accept "uploads/cv/..." or "uploads/..." — always scope to UPLOAD_DIR
    # and reject anything that escapes it.
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    # The pathname is "uploads/..."; strip the leading prefix so the path
    # is relative to UPLOAD_DIR (which is also `./uploads` by default).
    rel = pathname
    if rel.startswith("uploads/"):
        rel = rel[len("uploads/") :]
    target = (upload_dir / rel).resolve()
    try:
        target.relative_to(upload_dir)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="invalid pathname") from e
    if target.exists():
        target.unlink()
    return None