from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import User, WebsiteReview, WebsiteVisit
from app.schemas.website import ReviewCreate, ReviewRead, VisitCreate, WebsiteStats

router = APIRouter(prefix="/website", tags=["website"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/visits", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def record_visit(request: Request, payload: VisitCreate, db: Session = Depends(get_db)) -> None:
    today = datetime.now(timezone.utc).date()
    values = {"visitor_key": payload.visitor_key, "visit_date": today}
    insert = pg_insert if db.bind.dialect.name == "postgresql" else sqlite_insert
    db.execute(insert(WebsiteVisit).values(**values).on_conflict_do_nothing())
    db.commit()


@router.post("/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def create_review(request: Request, payload: ReviewCreate, db: Session = Depends(get_db)) -> WebsiteReview:
    review = WebsiteReview(**payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("/reviews", response_model=list[ReviewRead])
def list_reviews(
    db: Session = Depends(get_db), _: User = Depends(get_current_admin)
) -> list[WebsiteReview]:
    return list(db.scalars(select(WebsiteReview).order_by(WebsiteReview.created_at.desc()).limit(200)))


@router.get("/stats", response_model=WebsiteStats)
def website_stats(
    db: Session = Depends(get_db), _: User = Depends(get_current_admin)
) -> WebsiteStats:
    now = datetime.now(timezone.utc)
    start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    visitors = db.scalar(select(func.count(WebsiteVisit.id)).where(WebsiteVisit.visit_date == now.date())) or 0
    signups = db.scalar(
        select(func.count(User.id)).where(
            User.created_at >= start, User.created_at < end, User.is_admin.is_(False)
        )
    ) or 0
    total_customers = db.scalar(select(func.count(User.id)).where(User.is_admin.is_(False))) or 0
    reviews = db.scalar(
        select(func.count(WebsiteReview.id)).where(WebsiteReview.created_at >= start, WebsiteReview.created_at < end)
    ) or 0
    return WebsiteStats(
        today_visitors=visitors,
        today_signups=signups,
        total_customers=total_customers,
        today_reviews=reviews,
    )
