from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import AuditAction, Ticket, TicketCategory, TicketPriority, TicketStatus, User, TicketMessage
from app.schemas.ticket import TicketCreate, TicketRead, TicketUpdate, TicketMessageCreate, TicketMessageRead
from app.services.audit import record_audit

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.post("", response_model=TicketRead, status_code=status.HTTP_201_CREATED)
def create_ticket(
    payload: TicketCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Ticket:
    ticket = Ticket(
        subject=payload.subject,
        client_id=payload.client_id,
        client_name=payload.client_name,
        category=payload.category,
        priority=payload.priority,
        description=payload.description,
    )
    db.add(ticket)
    db.flush()
    record_audit(db, user, AuditAction.create, "ticket", {"ticket_id": ticket.id, "subject": ticket.subject}, request)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("", response_model=list[TicketRead])
def list_tickets(
    status: TicketStatus | None = Query(default=None),
    priority: TicketPriority | None = Query(default=None),
    category: TicketCategory | None = Query(default=None),
    client_id: int | None = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> list[Ticket]:
    stmt = select(Ticket).order_by(Ticket.id.desc())
    if status is not None:
        stmt = stmt.where(Ticket.status == status)
    if priority is not None:
        stmt = stmt.where(Ticket.priority == priority)
    if category is not None:
        stmt = stmt.where(Ticket.category == category)
    if client_id is not None:
        stmt = stmt.where(Ticket.client_id == client_id)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{ticket_id}", response_model=TicketRead)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketRead)
def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    if payload.status is not None:
        ticket.status = payload.status
    if payload.priority is not None:
        ticket.priority = payload.priority
    if payload.assigned_to is not None:
        ticket.assigned_to = payload.assigned_to

    action = AuditAction.change_status if payload.status is not None else AuditAction.assign if payload.assigned_to is not None else AuditAction.update
    record_audit(db, user, action, "ticket", {"ticket_id": ticket.id}, request)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> None:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    record_audit(db, user, AuditAction.delete, "ticket", {"ticket_id": ticket.id, "subject": ticket.subject}, request)
    db.delete(ticket)
    db.commit()


@router.post("/{ticket_id}/messages", response_model=TicketMessageRead, status_code=status.HTTP_201_CREATED)
def create_ticket_message(
    ticket_id: int,
    payload: TicketMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> TicketMessage:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    message = TicketMessage(
        ticket_id=ticket_id,
        sender_id=user.id,
        sender_name=user.full_name or user.email,
        sender_role="admin",
        content=payload.content,
        is_internal=payload.is_internal,
    )
    db.add(message)
    db.flush()
    record_audit(db, user, AuditAction.create, "ticket_message", {"ticket_id": ticket.id, "message_id": message.id}, request)
    db.commit()
    db.refresh(message)
    return message


@router.get("/{ticket_id}/messages", response_model=list[TicketMessageRead])
def list_ticket_messages(
    ticket_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> list[TicketMessage]:
    ticket = db.get(Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    
    stmt = select(TicketMessage).where(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.id.asc())
    return list(db.scalars(stmt))
