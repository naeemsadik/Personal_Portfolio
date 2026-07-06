"""Pydantic schemas for the snapshot subsystem."""
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# ---- Site state (live snapshot mode + version) ----------------------------

SiteMode = Literal["off", "published"]


class SiteStateOut(BaseModel):
    """Public payload served from `GET /site-state` (cached 10s)."""

    snapshotMode: SiteMode = Field(serialization_alias="snapshotMode")
    publishedVersion: str | None = Field(
        default=None, serialization_alias="publishedVersion"
    )

    model_config = {"populate_by_name": True}


class SiteStateIn(BaseModel):
    """Admin payload for `POST /admin/site-state`."""

    mode: SiteMode
    version: str | None = None


# ---- Snapshot CRUD --------------------------------------------------------

SnapshotStatus = Literal[
    "generating", "generated", "published", "archived", "failed"
]


class SiteSnapshotOut(BaseModel):
    """One snapshot row, as returned to the admin client.

    Field names are camelCase to match the rest of the admin layer. The
    FastAPI router translates from snake_case ORM columns via `model_config`.
    """

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    version: str
    status: str
    notes: str | None = None

    createdAt: datetime = Field(validation_alias="created_at")
    startedAt: datetime | None = Field(default=None, validation_alias="started_at")
    finishedAt: datetime | None = Field(default=None, validation_alias="finished_at")
    publishedAt: datetime | None = Field(default=None, validation_alias="published_at")
    archivedAt: datetime | None = Field(default=None, validation_alias="archived_at")

    totalSizeBytes: int = Field(default=0, validation_alias="total_size_bytes")
    pageCount: int = Field(default=0, validation_alias="page_count")
    pagesFailedCount: int = Field(default=0, validation_alias="pages_failed_count")
    warnings: list[Any] = Field(default_factory=list, validation_alias="warnings_json")

    errorMessage: str | None = Field(default=None, validation_alias="error_message")
    creatorEmail: str | None = Field(default=None, validation_alias="creator_email")
    baseUrl: str | None = Field(default=None, validation_alias="base_url")
    currentPath: str | None = Field(default=None, validation_alias="current_path")


class SiteSnapshotListOut(BaseModel):
    items: list[SiteSnapshotOut]
    total: int


class SnapshotCreateIn(BaseModel):
    """Admin payload for `POST /admin/snapshots`."""

    notes: str | None = Field(default=None, max_length=2000)
    version: str | None = Field(default=None, max_length=64)