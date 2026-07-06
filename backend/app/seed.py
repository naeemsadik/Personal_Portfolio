"""One-shot seed: bootstrap the admin user and load initial content from JSON.

Usage:
    cd backend
    python -m app.seed

The admin password is taken from $ADMIN_BOOTSTRAP_PASSWORD (default in config).
JSON files live in backend/seed-data/*.json.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.models import (
    AdminUser,
    BlogPostRow,
    ExperienceRow,
    HeroRow,
    ProjectRow,
    SettingsRow,
)
from app.security import hash_password
from app.services.reading_time import estimate_reading_time_min

SEED_DIR = Path(__file__).resolve().parents[1] / "seed-data"


def _read_json(name: str) -> object:
    path = SEED_DIR / name
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def seed_admin(db) -> None:
    settings = get_settings()
    target_email = settings.ADMIN_BOOTSTRAP_EMAIL.lower()
    target_password = settings.ADMIN_BOOTSTRAP_PASSWORD

    # Upsert by email: if the user already exists, refresh its password hash
    # so re-running the seed after editing .env always reflects the new
    # bootstrap credentials. Without this, the legacy row is left in place
    # and login with the new password fails with 401.
    existing = db.execute(
        select(AdminUser).where(AdminUser.email == target_email)
    ).scalar_one_or_none()
    if existing is not None:
        existing.password_hash = hash_password(target_password)
        db.commit()
        print(f"  ✓ admin user exists, password refreshed: {existing.email}")
        return

    user = AdminUser(
        email=target_email,
        password_hash=hash_password(target_password),
    )
    db.add(user)
    db.commit()
    print(f"  ✓ created admin user: {user.email}")


def seed_hero(db) -> None:
    data = _read_json("hero.json")
    if data is None:
        print("  - hero.json missing, skipping")
        return
    row = db.get(HeroRow, "hero")
    if row is None:
        db.add(HeroRow(id="hero", data=data))
    else:
        row.data = data
    db.commit()
    print("  ✓ hero")


def seed_settings(db) -> None:
    data = _read_json("settings.json")
    if data is None:
        print("  - settings.json missing, skipping")
        return
    row = db.get(SettingsRow, "settings")
    if row is None:
        db.add(SettingsRow(id="settings", data=data))
    else:
        row.data = data
    db.commit()
    print("  ✓ settings")


def seed_experience(db) -> None:
    raw = _read_json("experience.json")
    if raw is None:
        print("  - experience.json missing, skipping")
        return
    assert isinstance(raw, list)
    for entry in raw:
        row = db.get(ExperienceRow, entry["id"])
        if row is None:
            row = ExperienceRow(id=entry["id"])
            db.add(row)
        row.kind = entry["kind"]
        row.title = entry["title"]
        row.organization = entry["organization"]
        row.location = entry.get("location")
        row.start_date = date.fromisoformat(entry["startDate"])
        end = entry.get("endDate")
        row.end_date = date.fromisoformat(end) if end else None
        row.description = entry["description"]
        row.tags = entry.get("tags", [])
        row.meta = entry.get("meta")
        row.ord = entry.get("order", entry.get("ord", 0))
    db.commit()
    print(f"  ✓ experience ({len(raw)} entries)")


def seed_projects(db) -> None:
    raw = _read_json("projects.json")
    if raw is None:
        print("  - projects.json missing, skipping")
        return
    assert isinstance(raw, list)
    for entry in raw:
        row = db.get(ProjectRow, entry["id"])
        if row is None:
            row = ProjectRow(id=entry["id"])
            db.add(row)
        row.title = entry["title"]
        row.summary = entry["summary"]
        row.description = entry["description"]
        row.tech = entry.get("tech", [])
        row.live_url = entry.get("liveUrl")
        row.repo_url = entry.get("repoUrl")
        row.cover_url = entry.get("coverUrl")
        row.featured = entry.get("featured", False)
        row.ord = entry.get("order", entry.get("ord", 0))
    db.commit()
    print(f"  ✓ projects ({len(raw)} entries)")


def seed_blog(db) -> None:
    raw = _read_json("blog.json")
    if raw is None:
        print("  - blog.json missing, skipping")
        return
    assert isinstance(raw, list)
    for entry in raw:
        existing = db.execute(select(BlogPostRow).where(BlogPostRow.slug == entry["slug"])).scalar_one_or_none()
        if existing is not None:
            print(f"    · blog '{entry['slug']}' already exists, skipping")
            continue
        post = BlogPostRow(
            slug=entry["slug"],
            title=entry["title"],
            excerpt=entry["excerpt"],
            body=entry["body"],
            cover_url=entry.get("coverUrl") or entry.get("cover_url"),
            tags=entry.get("tags", []),
            status=entry.get("status", "draft"),
            reading_time_min=entry.get("reading_time_min") or estimate_reading_time_min(entry["body"]),
            ord=entry.get("ord", 0),
            published_at=(
                datetime.fromisoformat(entry["publishedAt"].replace("Z", "+00:00"))
                if entry.get("publishedAt")
                else (datetime.now(timezone.utc) if entry.get("status") == "published" else None)
            ),
        )
        db.add(post)
    db.commit()
    print(f"  ✓ blog ({len(raw)} entries)")


def main() -> None:
    print("Seeding…")
    with SessionLocal() as db:
        seed_admin(db)
        seed_hero(db)
        seed_settings(db)
        seed_experience(db)
        seed_projects(db)
        seed_blog(db)
    print("\n✓ Seed complete.")


if __name__ == "__main__":
    main()