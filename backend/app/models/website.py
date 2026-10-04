from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WebsiteVisit(Base):
    __tablename__ = "website_visits"
    __table_args__ = (UniqueConstraint("visitor_key", "visit_date", name="uq_website_visit_visitor_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    visitor_key: Mapped[str] = mapped_column(String(64), index=True)
    visit_date: Mapped[date] = mapped_column(Date, index=True)


class WebsiteReview(Base):
    __tablename__ = "website_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    reviewer_name: Mapped[str] = mapped_column(String(120))
    rating: Mapped[int] = mapped_column(Integer)
    review: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
