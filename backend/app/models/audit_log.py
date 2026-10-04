import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class AuditAction(str, enum.Enum):
    login = "login"
    logout = "logout"
    create = "create"
    update = "update"
    delete = "delete"
    view = "view"
    export = "export"
    assign = "assign"
    change_status = "change_status"


class AuditStatus(str, enum.Enum):
    success = "success"
    failed = "failed"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    user_name: Mapped[str] = mapped_column(String(255))
    user_role: Mapped[str] = mapped_column(String(50))  # 'admin' or 'client'
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction))
    resource: Mapped[str] = mapped_column(String(100))
    resource_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), default=None)
    ip_address: Mapped[str | None] = mapped_column(String(45), default=None)
    user_agent: Mapped[str | None] = mapped_column(Text, default=None)
    status: Mapped[AuditStatus] = mapped_column(Enum(AuditStatus), default=AuditStatus.success)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    details: Mapped[str | None] = mapped_column(Text, default=None)

    user: Mapped["User"] = relationship(foreign_keys=[user_id])
