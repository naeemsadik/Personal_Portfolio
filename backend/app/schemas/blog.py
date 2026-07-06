"""Pydantic schemas for blog posts."""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class BlogPostIn(BaseModel):
    """Upsert payload. `id` is None for new posts; on update it identifies the row."""

    id: int | None = Field(default=None, ge=1)
    slug: str = Field(min_length=1, max_length=160, pattern=r"^[a-z0-9][a-z0-9-]*$")
    title: str = Field(min_length=1, max_length=255)
    excerpt: str = Field(min_length=1, max_length=500)
    body: str = Field(min_length=1)
    cover_url: str | None = Field(default=None, max_length=500)
    tags: list[str] = Field(default_factory=list)
    status: Literal["draft", "published"] = "draft"
    ord: int = Field(default=0, ge=0)


class BlogPostPatch(BaseModel):
    """Partial update for a blog post. Every field is optional."""

    slug: str | None = Field(default=None, min_length=1, max_length=160, pattern=r"^[a-z0-9][a-z0-9-]*$")
    title: str | None = Field(default=None, min_length=1, max_length=255)
    excerpt: str | None = Field(default=None, min_length=1, max_length=500)
    body: str | None = Field(default=None, min_length=1)
    cover_url: str | None = Field(default=None, max_length=500)
    tags: list[str] | None = None
    status: Literal["draft", "published"] | None = None
    ord: int | None = Field(default=None, ge=0)


class BlogPostOut(BaseModel):
    id: int
    slug: str
    title: str
    excerpt: str
    body: str
    cover_url: str | None
    tags: list[str]
    status: str
    reading_time_min: int
    ord: int
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
