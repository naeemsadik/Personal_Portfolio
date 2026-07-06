"""Pydantic schemas for messages."""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class MessageIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)


class MessagePatch(BaseModel):
    read: bool


class MessageOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    message: str
    received_at: datetime
    is_read: bool