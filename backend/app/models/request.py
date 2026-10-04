import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class RequestStatus(str, enum.Enum):
    new = "new"
    reviewing = "reviewing"
    in_progress = "in_progress"
    completed = "completed"
    rejected = "rejected"


class RequestPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RequestService(str, enum.Enum):
    security_assessment = "security_assessment"
    vulnerability_assessment = "vulnerability_assessment"
    digital_forensics = "digital_forensics"
    incident_response = "incident_response"
    network_protection = "network_protection"
    cybersecurity_training = "cybersecurity_training"
    general_consultation = "general_consultation"


class Request(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    requester_name: Mapped[str] = mapped_column(String(255))
    requester_email: Mapped[str] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(255), default=None)
    service: Mapped[RequestService] = mapped_column(Enum(RequestService))
    priority: Mapped[RequestPriority] = mapped_column(Enum(RequestPriority), default=RequestPriority.medium)
    status: Mapped[RequestStatus] = mapped_column(Enum(RequestStatus), default=RequestStatus.new)
    description: Mapped[str] = mapped_column(Text)
    contact_info: Mapped[str | None] = mapped_column(Text, default=None)
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), default=None)
    internal_notes: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    requester: Mapped["User"] = relationship(foreign_keys=[requester_id])
    assignee: Mapped["User"] = relationship(foreign_keys=[assigned_to])
