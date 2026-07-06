"""Contact-form messages — public POST, admin GET/PATCH/DELETE."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_admin
from app.models import AdminUser, MessageRow
from app.schemas.message import MessageIn, MessageOut, MessagePatch

router = APIRouter(prefix="/messages", tags=["messages"])


def _to_out(row: MessageRow) -> MessageOut:
    return MessageOut(
        id=row.id,
        name=row.name,
        email=row.email,
        message=row.message,
        received_at=row.received_at,
        is_read=row.is_read,
    )


@router.get("", response_model=list[MessageOut])
def list_messages(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> list[MessageOut]:
    rows = db.query(MessageRow).order_by(desc(MessageRow.received_at)).all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=MessageOut, status_code=status.HTTP_201_CREATED)
def create_message(
    payload: MessageIn,
    db: Annotated[Session, Depends(get_db)],
) -> MessageOut:
    row = MessageRow(name=payload.name, email=payload.email, message=payload.message)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.patch("/{msg_id}", response_model=MessageOut)
def patch_message(
    msg_id: int,
    payload: MessagePatch,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> MessageOut:
    row = db.get(MessageRow, msg_id)
    if row is None:
        raise HTTPException(status_code=404, detail="not found")
    row.is_read = payload.read
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.delete("/{msg_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    msg_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[AdminUser, Depends(get_current_admin)],
) -> None:
    row = db.get(MessageRow, msg_id)
    if row is None:
        return None
    db.delete(row)
    db.commit()
    return None