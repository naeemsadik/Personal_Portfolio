"""Pydantic schemas for analytics events."""
from pydantic import BaseModel, Field


class AnalyticsEventIn(BaseModel):
    type: str = Field(pattern=r"^(pageview|contact_submit)$")
    path: str = Field(min_length=1, max_length=255)
    ts: int = Field(ge=0, description="ms since epoch")
    # Optional viewer metadata. Truncated to 255 chars to fit the column.
    user_agent: str | None = Field(default=None, max_length=255)
    referrer: str | None = Field(default=None, max_length=255)
    session_id: str | None = Field(default=None, max_length=64)


class PageviewBucket(BaseModel):
    date: str
    count: int


class TopPath(BaseModel):
    path: str
    count: int


class RecentEvent(BaseModel):
    """Lightweight event shape returned in the admin summary."""

    id: int
    type: str
    path: str
    ts: int
    user_agent: str | None
    referrer: str | None
    session_id: str | None


class DailyBucket(BaseModel):
    """One day in the 30-day time series."""

    date: str
    pageviews: int
    contact: int


class AnalyticsSummary(BaseModel):
    total_events: int
    total_pageviews: int
    total_contact_submissions: int
    contact_submissions_last_7_days: int
    pageviews_last_7_days: list[PageviewBucket]
    top_paths: list[TopPath]
    # New fields for the upgraded admin dashboard
    unique_visitors_30d: int
    recent_events: list[RecentEvent]
    daily_30d: list[DailyBucket]
    top_paths_30d: list[TopPath]
