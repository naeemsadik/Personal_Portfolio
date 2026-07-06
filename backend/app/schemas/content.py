"""Pydantic schemas for content resources. These accept dict payloads because the
actual shape is validated on the frontend by Zod; FastAPI stores the entire
blob in a JSON column. We do light validation here just to keep the API safe.
"""
from typing import Any, Literal
from pydantic import BaseModel, Field


# ---------- Hero / Settings ----------
class HeroIn(BaseModel):
    data: dict[str, Any] = Field(description="Full HeroContent object")


class SettingsIn(BaseModel):
    data: dict[str, Any] = Field(description="Full SettingsContent object")


# ---------- Experience ----------
class ExperienceIn(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    kind: str = Field(pattern=r"^(work|education|leadership|volunteer|achievement)$")
    title: str = Field(min_length=1, max_length=255)
    organization: str = Field(min_length=1, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    start_date: str = Field(description="ISO date YYYY-MM-DD")
    end_date: str | None = Field(default=None, description="ISO date YYYY-MM-DD or null")
    description: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    meta: str | None = Field(default=None, max_length=255)
    ord: int = Field(default=0, ge=0)
    status: Literal["draft", "published"] = "published"


class ExperiencePatch(BaseModel):
    """Partial update for an experience entry. All fields optional."""

    status: Literal["draft", "published"] | None = None


# ---------- Project ----------
class ProjectIn(BaseModel):
    id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=255)
    summary: str = Field(min_length=1, max_length=500)
    description: str = Field(min_length=1)
    tech: list[str] = Field(default_factory=list)
    live_url: str | None = Field(default=None, max_length=500)
    repo_url: str | None = Field(default=None, max_length=500)
    cover_url: str | None = Field(default=None, max_length=500)
    featured: bool = False
    ord: int = Field(default=0, ge=0)
    status: Literal["draft", "published"] = "published"


class ProjectPatch(BaseModel):
    """Partial update for a project. All fields optional."""

    status: Literal["draft", "published"] | None = None
