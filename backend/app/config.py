"""Application settings loaded from environment / .env file."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_snapshots_dir() -> Path:
    """Resolve the snapshot storage dir relative to the backend root.

    Snapshots are written into `frontend/public/__snapshots__/` so that
    Next.js can serve them as static files. The path is computed once at
    import time so it's stable across calls.
    """
    here = Path(__file__).resolve()
    # `here` is backend/app/config.py → backend/app → backend → repo root
    repo_root = here.parents[2]
    return repo_root / "frontend" / "public" / "__snapshots__"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database — set DATABASE_URL to override (e.g. mysql+pymysql://...).
    # When unset, falls back to a local SQLite file for easy local development.
    DATABASE_URL: str = ""

    # JWT
    JWT_SECRET: str = "change-me-to-a-long-random-string-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MIN: int = 15

    # Admin bootstrap (used by `python -m app.seed`)
    ADMIN_BOOTSTRAP_EMAIL: str = "admin@example.com"
    ADMIN_BOOTSTRAP_PASSWORD: str = "change-me-on-first-login"

    # CORS — comma-separated origins
    CORS_ORIGINS: str = "http://localhost:3000"

    # Uploads
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 8
    MAX_CV_UPLOAD_MB: int = 10

    # Public URL used to build absolute URLs returned to clients
    PUBLIC_API_URL: str = "http://localhost:8000"

    # Snapshots — where generated HTML lives, where the crawler fetches
    # from, and how long each fetch is allowed to take.
    SNAPSHOTS_DIR: str = ""  # empty → resolved by `snapshots_dir` property
    NEXT_PUBLIC_SITE_URL: str = "http://localhost:3000"
    SNAPSHOT_CRAWLER_TIMEOUT_S: float = 30.0

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024

    @property
    def max_cv_upload_bytes(self) -> int:
        return self.MAX_CV_UPLOAD_MB * 1024 * 1024

    @property
    def snapshots_dir(self) -> Path:
        if self.SNAPSHOTS_DIR:
            return Path(self.SNAPSHOTS_DIR).resolve()
        return _default_snapshots_dir()


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()