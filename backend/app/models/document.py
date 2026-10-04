import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.client import Client
    from app.models.project import Project
    from app.models.user import User


class DocumentType(str, enum.Enum):
    security_report = "security_report"
    assessment_report = "assessment_report"
    incident_report = "incident_report"
    invoice = "invoice"
    contract = "contract"
    other = "other"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    type: Mapped[DocumentType] = mapped_column(Enum(DocumentType))
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), default=None)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    client_name: Mapped[str] = mapped_column(String(255))
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    uploaded_by_name: Mapped[str] = mapped_column(String(255))
    file_size: Mapped[int] = mapped_column(Integer)
    file_url: Mapped[str | None] = mapped_column(String(512), default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    description: Mapped[str | None] = mapped_column(Text, default=None)

    uploader: Mapped["User"] = relationship()
    client: Mapped["Client"] = relationship(back_populates="documents")
    project: Mapped["Project"] = relationship(back_populates="documents")
