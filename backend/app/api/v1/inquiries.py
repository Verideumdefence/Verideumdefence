from fastapi import APIRouter, Depends, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import Inquiry, User
from app.schemas.inquiry import InquiryCreate, InquiryRead
from app.services.email import send_inquiry_notification

router = APIRouter(prefix="/inquiries", tags=["inquiries"])
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=InquiryRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def create_inquiry(
    request: Request, payload: InquiryCreate, db: Session = Depends(get_db)
) -> Inquiry:
    inquiry = Inquiry(**payload.model_dump())
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    send_inquiry_notification(inquiry)
    return inquiry


@router.get("", response_model=list[InquiryRead])
def list_inquiries(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[Inquiry]:
    stmt = select(Inquiry).order_by(Inquiry.id.desc()).offset(skip).limit(min(limit, 100))
    return list(db.scalars(stmt))
