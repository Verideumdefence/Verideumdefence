from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import AuditLog, AuditAction, AuditStatus
from app.schemas.audit_log import AuditLogRead

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=list[AuditLogRead])
def list_audit_logs(
    action: AuditAction | None = Query(default=None),
    status: AuditStatus | None = Query(default=None),
    user_id: int | None = Query(default=None),
    resource: str | None = Query(default=None),
    q: str | None = Query(default=None, min_length=1, max_length=200),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user = Depends(get_current_admin),
) -> list[AuditLog]:
    stmt = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if action is not None:
        stmt = stmt.where(AuditLog.action == action)
    if status is not None:
        stmt = stmt.where(AuditLog.status == status)
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if resource is not None:
        stmt = stmt.where(AuditLog.resource == resource)
    if q is not None:
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                AuditLog.user_name.ilike(term),
                AuditLog.resource.ilike(term),
                AuditLog.details.ilike(term),
                AuditLog.ip_address.ilike(term),
            )
        )
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{log_id}", response_model=AuditLogRead)
def get_audit_log(
    log_id: int,
    db: Session = Depends(get_db),
    user = Depends(get_current_admin),
) -> AuditLog:
    log = db.get(AuditLog, log_id)
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit log not found")
    return log
