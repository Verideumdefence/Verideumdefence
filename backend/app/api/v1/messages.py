from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import AuditAction, Message, User
from app.schemas.message import MessageCreate, MessageRead
from app.services.audit import record_audit

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
def create_message(
    payload: MessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Message:
    recipient = db.get(User, payload.to_id)
    if recipient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")

    message = Message(
        from_id=user.id,
        from_name=user.full_name or user.email,
        to_id=payload.to_id,
        to_name=recipient.full_name or recipient.email,
        subject=payload.subject,
        content=payload.content,
    )
    db.add(message)
    db.flush()
    record_audit(db, user, AuditAction.create, "message", {"message_id": message.id, "to_id": message.to_id}, request)
    db.commit()
    db.refresh(message)
    return message


@router.get("", response_model=list[MessageRead])
def list_messages(
    is_read: bool | None = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> list[Message]:
    # Get messages sent to or from the current user
    stmt = select(Message).where(
        (Message.to_id == user.id) | (Message.from_id == user.id)
    ).order_by(Message.id.desc())
    
    if is_read is not None:
        stmt = stmt.where(Message.is_read == is_read)
    
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{message_id}", response_model=MessageRead)
def get_message(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Message:
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Only allow access if user is sender or recipient
    if message.to_id != user.id and message.from_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Mark as read if user is recipient
    if message.to_id == user.id and not message.is_read:
        message.is_read = True
        record_audit(db, user, AuditAction.change_status, "message", {"message_id": message.id, "is_read": True}, request)
        db.commit()
        db.refresh(message)
    
    return message


@router.patch("/{message_id}/read", response_model=MessageRead)
def mark_message_read(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Message:
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    if message.to_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    message.is_read = True
    record_audit(db, user, AuditAction.change_status, "message", {"message_id": message.id, "is_read": True}, request)
    db.commit()
    db.refresh(message)
    return message


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_message(
    message_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> None:
    message = db.get(Message, message_id)
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Only allow deletion if user is sender
    if message.from_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    record_audit(db, user, AuditAction.delete, "message", {"message_id": message.id}, request)
    db.delete(message)
    db.commit()
