"""Analytics events."""
from sqlalchemy import BigInteger, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class AnalyticsEventRow(Base):
    __tablename__ = "analytics_events"

    # SQLite needs INTEGER (not BIGINT) for the autoincrement primary key to
    # work — only `INTEGER PRIMARY KEY` is aliased to ROWID. Use `BigInteger`
    # on other dialects, fall back to `Integer` for SQLite.
    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # pageview|contact_submit
    path: Mapped[str] = mapped_column(String(255), nullable=False)
    ts: Mapped[int] = mapped_column(BigInteger, nullable=False)  # ms since epoch
    # Optional viewer metadata. Nullable so older rows / clients that don't
    # send them remain valid.
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    __table_args__ = (
        Index("idx_ts", "ts"),
        Index("idx_path_ts", "path", "ts"),
        Index("idx_session_ts", "session_id", "ts"),
    )
