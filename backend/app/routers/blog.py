"""Blog post endpoints — public list/detail + admin CRUD."""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_admin
from app.models import AdminUser, BlogPostRow
from app.schemas.blog import BlogPostIn, BlogPostOut, BlogPostPatch
from app.services.reading_time import estimate_reading_time_min

router = APIRouter(prefix="/blog", tags=["blog"])


def _row_to_out(row: BlogPostRow) -> BlogPostOut:
    return BlogPostOut(
        id=row.id,
        slug=row.slug,
        title=row.title,
        excerpt=row.excerpt,
        body=row.body,
        cover_url=row.cover_url,
        tags=row.tags or [],
        status=row.status,
        reading_time_min=row.reading_time_min,
        ord=row.ord,
        published_at=row.published_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


# ---------- Public ----------
@router.get("", response_model=list[BlogPostOut])
def list_published(
    db: Annotated[Session, Depends(get_db)],
    tag: str | None = Query(default=None, description="Filter by tag"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[BlogPostOut]:
    q = db.query(BlogPostRow).filter(BlogPostRow.status == "published")
    if tag:
        # MySQL JSON contains — using LIKE works because tags are stored as a JSON array of strings.
        # JSON_CONTAINS is cleaner but adds dialect complexity; LIKE is sufficient for small N.
        q = q.filter(BlogPostRow.tags.like(f'%"{tag}"%'))
    rows = (
        q.order_by(desc(BlogPostRow.published_at), BlogPostRow.ord.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [_row_to_out(r) for r in rows]


@router.get("/{slug}", response_model=BlogPostOut)
def get_published_by_slug(slug: str, db: Annotated[Session, Depends(get_db)]) -> BlogPostOut:
    row = (
        db.query(BlogPostRow)
        .filter(BlogPostRow.slug == slug, BlogPostRow.status == "published")
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="post not found")
    return _row_to_out(row)


# ---------- Admin ----------
@router.get("/admin/all", response_model=list[BlogPostOut])
def admin_list_all(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> list[BlogPostOut]:
    rows = db.query(BlogPostRow).order_by(desc(BlogPostRow.updated_at)).all()
    return [_row_to_out(r) for r in rows]


@router.get("/admin/post/{post_id}", response_model=BlogPostOut)
def admin_get_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> BlogPostOut:
    row = db.get(BlogPostRow, post_id)
    if row is None:
        raise HTTPException(status_code=404, detail="post not found")
    return _row_to_out(row)


@router.post("", response_model=BlogPostOut)
def upsert_post(
    payload: BlogPostIn,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> BlogPostOut:
    # Upsert: if `id` is given, update; otherwise insert.
    if payload.id is not None:
        row = db.get(BlogPostRow, payload.id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"post {payload.id} not found")
    else:
        row = BlogPostRow()
        db.add(row)

    # Slug uniqueness (exclude self when updating)
    existing = (
        db.query(BlogPostRow).filter(BlogPostRow.slug == payload.slug).one_or_none()
    )
    if existing and existing.id != row.id:
        raise HTTPException(status_code=409, detail=f"slug '{payload.slug}' already in use")

    row.slug = payload.slug
    row.title = payload.title
    row.excerpt = payload.excerpt
    row.body = payload.body
    row.cover_url = payload.cover_url
    row.tags = payload.tags
    row.status = payload.status
    row.ord = payload.ord
    row.reading_time_min = estimate_reading_time_min(payload.body)

    # Set published_at on first publish transition
    if payload.status == "published" and row.published_at is None:
        row.published_at = datetime.now(timezone.utc)
    elif payload.status == "draft":
        # keep published_at even if reverted to draft (so it can be re-published without losing the timestamp)
        pass

    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.patch("/{post_id}", response_model=BlogPostOut)
def patch_post(
    post_id: int,
    payload: BlogPostPatch,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> BlogPostOut:
    row = db.get(BlogPostRow, post_id)
    if row is None:
        raise HTTPException(status_code=404, detail="post not found")

    # Slug uniqueness check if slug is being changed
    if payload.slug is not None and payload.slug != row.slug:
        existing = (
            db.query(BlogPostRow).filter(BlogPostRow.slug == payload.slug).one_or_none()
        )
        if existing and existing.id != row.id:
            raise HTTPException(status_code=409, detail=f"slug '{payload.slug}' already in use")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(row, field, value)

    if "body" in data and data["body"] is not None:
        row.reading_time_min = estimate_reading_time_min(data["body"])

    # Set published_at on first publish transition.
    if row.status == "published" and row.published_at is None:
        row.published_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> None:
    row = db.get(BlogPostRow, post_id)
    if row is None:
        return None
    db.delete(row)
    db.commit()
    return None
