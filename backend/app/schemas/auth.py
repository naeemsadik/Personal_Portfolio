"""Pydantic request/response DTOs."""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    role: str
    email: EmailStr


class MeOut(BaseModel):
    id: int
    email: EmailStr
    role: str