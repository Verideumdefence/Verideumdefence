from fastapi import APIRouter, Depends, HTTPException, Query, Request as HttpRequest, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import AuditAction, Request, RequestStatus, RequestPriority, User
from app.schemas.request import RequestRead, RequestUpdate
from app.services.audit import record_audit

router = APIRouter(prefix="/requests", tags=["requests"])


@router.get("", response_model=list[RequestRead])
def list_requests(
    status: RequestStatus | None = Query(default=None),
    priority: RequestPriority | None = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> list[Request]:
    stmt = select(Request).order_by(Request.id.desc())
    if status is not None:
        stmt = stmt.where(Request.status == status)
    if priority is not None:
        stmt = stmt.where(Request.priority == priority)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{request_id}", response_model=RequestRead)
def get_request(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Request:
    request = db.get(Request, request_id)
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return request


@router.patch("/{request_id}", response_model=RequestRead)
def update_request(
    request_id: int,
    payload: RequestUpdate,
    http_request: HttpRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Request:
    request = db.get(Request, request_id)
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    
    if payload.status is not None:
        request.status = payload.status
    if payload.assigned_to is not None:
        request.assigned_to = payload.assigned_to
    if payload.internal_notes is not None:
        request.internal_notes = payload.internal_notes

    action = AuditAction.change_status if payload.status is not None else AuditAction.update
    record_audit(db, user, action, "request", {"request_id": request.id}, http_request)
    db.commit()
    db.refresh(request)
    return request


@router.delete("/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: int,
    http_request: HttpRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> None:
    request = db.get(Request, request_id)
    if request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    record_audit(db, user, AuditAction.delete, "request", {"request_id": request.id}, http_request)
    db.delete(request)
    db.commit()
