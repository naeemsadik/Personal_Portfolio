"""Auth endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_admin
from app.models import AdminUser
from app.schemas.auth import LoginIn, LoginOut, MeOut
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, db: Annotated[Session, Depends(get_db)]) -> LoginOut:
    user = db.query(AdminUser).filter(AdminUser.email == payload.email.lower()).one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid email or password",
        )
    token, expires_at = create_access_token(sub=str(user.id), role="admin")
    return LoginOut(
        access_token=token,
        expires_at=expires_at,
        role="admin",
        email=user.email,
    )


@router.get("/me", response_model=MeOut)
def me(current: Annotated[AdminUser, Depends(get_current_admin)]) -> MeOut:
    return MeOut(id=current.id, email=current.email, role="admin")