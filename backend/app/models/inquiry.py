from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.request import RequestService


class Inquiry(Base):
    """Public website inquiries, which do not require a portal account."""

    __tablename__ = "inquiries"

    id: Mapped[int] = mapped_column(primary_key=True)
    requester_name: Mapped[str] = mapped_column(String(255))
    requester_email: Mapped[str] = mapped_column(String(255), index=True)
    company: Mapped[str | None] = mapped_column(String(255), default=None)
    service: Mapped[RequestService] = mapped_column(Enum(RequestService))
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
