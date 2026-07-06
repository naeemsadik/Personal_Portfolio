"""Content CRUD: hero, settings, experience, projects."""
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_admin
from app.models import AdminUser, ExperienceRow, HeroRow, ProjectRow, SettingsRow
from app.schemas.content import (
    ExperienceIn,
    ExperiencePatch,
    HeroIn,
    ProjectIn,
    ProjectPatch,
    SettingsIn,
)

router = APIRouter(prefix="/content", tags=["content"])


# ---------- Hero ----------
@router.get("/hero")
def get_hero(db: Annotated[Session, Depends(get_db)]) -> dict:
    row = db.get(HeroRow, "hero")
    if row is None:
        raise HTTPException(status_code=404, detail="hero not seeded")
    return row.data


@router.put("/hero", status_code=status.HTTP_200_OK)
def put_hero(
    payload: HeroIn,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> dict:
    row = db.get(HeroRow, "hero")
    if row is None:
        row = HeroRow(id="hero", data=payload.data)
        db.add(row)
    else:
        row.data = payload.data
    db.commit()
    return row.data


# ---------- Settings ----------
@router.get("/settings")
def get_settings(db: Annotated[Session, Depends(get_db)]) -> dict:
    row = db.get(SettingsRow, "settings")
    if row is None:
        raise HTTPException(status_code=404, detail="settings not seeded")
    return row.data


@router.put("/settings")
def put_settings(
    payload: SettingsIn,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> dict:
    row = db.get(SettingsRow, "settings")
    if row is None:
        row = SettingsRow(id="settings", data=payload.data)
        db.add(row)
    else:
        row.data = payload.data
    db.commit()
    return row.data


# ---------- Experience ----------
def _experience_to_dict(row: ExperienceRow) -> dict:
    return {
        "id": row.id,
        "kind": row.kind,
        "title": row.title,
        "organization": row.organization,
        "location": row.location,
        "startDate": row.start_date.isoformat(),
        "endDate": row.end_date.isoformat() if row.end_date else None,
        "description": row.description,
        "tags": row.tags or [],
        "meta": row.meta,
        "order": row.ord,
        "status": row.status,
    }


@router.get("/experience")
def list_experience(db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = db.query(ExperienceRow).order_by(ExperienceRow.ord.asc()).all()
    return [_experience_to_dict(r) for r in rows]


@router.get("/experience/{entry_id}")
def get_experience(entry_id: str, db: Annotated[Session, Depends(get_db)]) -> dict:
    row = db.get(ExperienceRow, entry_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    return _experience_to_dict(row)


@router.post("/experience")
def upsert_experience(
    payload: ExperienceIn,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> dict:
    row = db.get(ExperienceRow, payload.id)
    if row is None:
        row = ExperienceRow(id=payload.id)
        db.add(row)
    row.kind = payload.kind
    row.title = payload.title
    row.organization = payload.organization
    row.location = payload.location
    row.start_date = date.fromisoformat(payload.start_date)
    row.end_date = date.fromisoformat(payload.end_date) if payload.end_date else None
    row.description = payload.description
    row.tags = payload.tags
    row.meta = payload.meta
    row.ord = payload.ord
    row.status = payload.status
    db.commit()
    return _experience_to_dict(row)


@router.patch("/experience/{entry_id}")
def patch_experience(
    entry_id: str,
    payload: ExperiencePatch,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> dict:
    row = db.get(ExperienceRow, entry_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    if payload.status is not None:
        row.status = payload.status
    db.commit()
    return _experience_to_dict(row)


@router.delete("/experience/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience(
    entry_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> None:
    row = db.get(ExperienceRow, entry_id)
    if row is None:
        return None
    db.delete(row)
    db.commit()
    return None


# ---------- Projects ----------
def _project_to_dict(row: ProjectRow) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "summary": row.summary,
        "description": row.description,
        "tech": row.tech or [],
        "liveUrl": row.live_url,
        "repoUrl": row.repo_url,
        "coverUrl": row.cover_url,
        "featured": row.featured,
        "order": row.ord,
        "status": row.status,
    }


@router.get("/projects")
def list_projects(db: Annotated[Session, Depends(get_db)]) -> list[dict]:
    rows = db.query(ProjectRow).order_by(ProjectRow.ord.asc()).all()
    return [_project_to_dict(r) for r in rows]


@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Annotated[Session, Depends(get_db)]) -> dict:
    row = db.get(ProjectRow, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    return _project_to_dict(row)


@router.post("/projects")
def upsert_project(
    payload: ProjectIn,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> dict:
    row = db.get(ProjectRow, payload.id)
    if row is None:
        row = ProjectRow(id=payload.id)
        db.add(row)
    row.title = payload.title
    row.summary = payload.summary
    row.description = payload.description
    row.tech = payload.tech
    row.live_url = payload.live_url
    row.repo_url = payload.repo_url
    row.cover_url = payload.cover_url
    row.featured = payload.featured
    row.ord = payload.ord
    row.status = payload.status
    db.commit()
    return _project_to_dict(row)


@router.patch("/projects/{project_id}")
def patch_project(
    project_id: str,
    payload: ProjectPatch,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> dict:
    row = db.get(ProjectRow, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    if payload.status is not None:
        row.status = payload.status
    db.commit()
    return _project_to_dict(row)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> None:
    row = db.get(ProjectRow, project_id)
    if row is None:
        return None
    db.delete(row)
    db.commit()
    return None
