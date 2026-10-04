import json

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import AuditAction, AuditLog, AuditStatus, User


def record_audit(
    db: Session,
    user: User,
    action: AuditAction,
    resource: str,
    details: dict[str, object],
    request: Request | None = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user.id,
            user_name=user.full_name or user.email,
            user_role="admin" if user.is_admin else "client",
            action=action,
            resource=resource,
            status=AuditStatus.success,
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
            details=json.dumps(details),
        )
    )