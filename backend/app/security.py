"""Password hashing + JWT helpers."""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

# passlib[bcrypt] + bcrypt 4.0.1 — the pin avoids passlib's "AttributeError: module
# 'bcrypt' has no attribute '__about__'" on bcrypt >= 4.1.
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _pwd_context.verify(plain, hashed)
    except ValueError:
        return False


def create_access_token(*, sub: str, role: str, extra: dict[str, Any] | None = None) -> tuple[str, datetime]:
    """Return (jwt, expires_at)."""
    settings = get_settings()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MIN)
    payload: dict[str, Any] = {
        "sub": sub,
        "role": role,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires_at


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as e:
        raise ValueError(f"invalid token: {e}") from e