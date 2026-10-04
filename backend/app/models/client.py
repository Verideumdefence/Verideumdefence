import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.ticket import Ticket
    from app.models.user import User


class ClientStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    pending = "pending"
    suspended = "suspended"


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255))
    services: Mapped[str] = mapped_column(Text, default="[]")  # JSON array
    status: Mapped[ClientStatus] = mapped_column(Enum(ClientStatus), default=ClientStatus.pending)
    contact_info: Mapped[str | None] = mapped_column(Text, default=None)  # JSON object
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="client_profile")
    projects: Mapped[list["Project"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="client", cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(back_populates="client", cascade="all, delete-orphan")
