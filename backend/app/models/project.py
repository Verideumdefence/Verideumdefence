import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.client import Client


class ProjectStatus(str, enum.Enum):
    planning = "planning"
    assessment = "assessment"
    investigation = "investigation"
    testing = "testing"
    reporting = "reporting"
    completed = "completed"
    on_hold = "on_hold"


class ProjectPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    client_name: Mapped[str] = mapped_column(String(255))
    service: Mapped[str] = mapped_column(String(255))
    status: Mapped[ProjectStatus] = mapped_column(Enum(ProjectStatus), default=ProjectStatus.planning)
    priority: Mapped[ProjectPriority] = mapped_column(Enum(ProjectPriority), default=ProjectPriority.medium)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    expected_completion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    actual_completion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    assigned_team: Mapped[str] = mapped_column(Text, default="[]")  # JSON array of user IDs
    progress: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    client: Mapped["Client"] = relationship(back_populates="projects")
    documents: Mapped[list["Document"]] = relationship(back_populates="project", cascade="all, delete-orphan")
