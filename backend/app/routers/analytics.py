"""Analytics event ingest (public) + admin summary."""
import hashlib
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_admin
from app.models import AdminUser, AnalyticsEventRow
from app.schemas.analytics import (
    AnalyticsEventIn,
    AnalyticsSummary,
    DailyBucket,
    PageviewBucket,
    RecentEvent,
    TopPath,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Cap how many rows we scan when computing the rollup. Bumped from 2k to 10k
# so the 30-day window has enough headroom on a busy site.
_MAX_ROWS_FOR_ROLLUP = 10_000
_DAILY_WINDOW_DAYS = 30
_TOP_PATHS_LIMIT = 25
_RECENT_EVENTS_LIMIT = 50


def _hash_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()


@router.post("", status_code=status.HTTP_201_CREATED)
def record_event(
    payload: AnalyticsEventIn,
    db: Annotated[Session, Depends(get_db)],
    request: Request,
) -> dict:
    row = AnalyticsEventRow(
        type=payload.type,
        path=payload.path,
        ts=payload.ts,
        user_agent=payload.user_agent,
        referrer=payload.referrer,
        session_id=payload.session_id,
        ip_hash=_hash_ip(request.client.host if request.client else None),
    )
    db.add(row)
    db.commit()
    return {"ok": True}


@router.get("/summary", response_model=AnalyticsSummary)
def summary(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> AnalyticsSummary:
    rows = (
        db.query(AnalyticsEventRow)
        .order_by(desc(AnalyticsEventRow.ts))
        .limit(_MAX_ROWS_FOR_ROLLUP)
        .all()
    )

    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    seven_days_ago = now_ms - 7 * 24 * 60 * 60 * 1000
    thirty_days_ago = now_ms - _DAILY_WINDOW_DAYS * 24 * 60 * 60 * 1000

    # Pre-seed the 7-day buckets (old summary shape — keep stable).
    seven_day_buckets: dict[str, int] = {}
    for i in range(6, -1, -1):
        d = datetime.now(timezone.utc) - timedelta(days=i)
        seven_day_buckets[d.date().isoformat()] = 0

    # Pre-seed the 30-day buckets with both pageviews and contact counts.
    daily_30d: dict[str, dict[str, int]] = {}
    for i in range(_DAILY_WINDOW_DAYS - 1, -1, -1):
        d = datetime.now(timezone.utc) - timedelta(days=i)
        key = d.date().isoformat()
        daily_30d[key] = {"pageviews": 0, "contact": 0}

    path_counts_30d: Counter[str] = Counter()
    sessions_30d: set[str] = set()
    total_pageviews = 0
    total_contact = 0
    contact_last_7 = 0

    for e in rows:
        if e.type == "pageview":
            total_pageviews += 1
            iso_day = datetime.fromtimestamp(e.ts / 1000, tz=timezone.utc).date().isoformat()
            if iso_day in seven_day_buckets:
                seven_day_buckets[iso_day] += 1
            if e.ts >= thirty_days_ago:
                path_counts_30d[e.path] += 1
                if iso_day in daily_30d:
                    daily_30d[iso_day]["pageviews"] += 1
                if e.session_id:
                    sessions_30d.add(e.session_id)
        elif e.type == "contact_submit":
            total_contact += 1
            if e.ts >= seven_days_ago:
                contact_last_7 += 1
            if e.ts >= thirty_days_ago:
                iso_day = datetime.fromtimestamp(e.ts / 1000, tz=timezone.utc).date().isoformat()
                if iso_day in daily_30d:
                    daily_30d[iso_day]["contact"] += 1

    # Recent events — last N rows in chronological order (oldest first within
    # the slice so the UI can render them as a "log").
    recent_rows = rows[:_RECENT_EVENTS_LIMIT]
    recent_events = [
        RecentEvent(
            id=r.id,
            type=r.type,
            path=r.path,
            ts=r.ts,
            user_agent=r.user_agent,
            referrer=r.referrer,
            session_id=r.session_id,
        )
        for r in recent_rows
    ]

    return AnalyticsSummary(
        total_events=len(rows),
        total_pageviews=total_pageviews,
        total_contact_submissions=total_contact,
        contact_submissions_last_7_days=contact_last_7,
        pageviews_last_7_days=[
            PageviewBucket(date=d, count=c) for d, c in seven_day_buckets.items()
        ],
        top_paths=[TopPath(path=p, count=c) for p, c in path_counts_30d.most_common(10)],
        unique_visitors_30d=len(sessions_30d),
        recent_events=recent_events,
        daily_30d=[
            DailyBucket(date=d, pageviews=c["pageviews"], contact=c["contact"])
            for d, c in daily_30d.items()
        ],
        top_paths_30d=[
            TopPath(path=p, count=c) for p, c in path_counts_30d.most_common(_TOP_PATHS_LIMIT)
        ],
    )
