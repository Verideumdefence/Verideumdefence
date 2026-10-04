from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.request import RequestService


class InquiryCreate(BaseModel):
    requester_name: str = Field(min_length=1, max_length=255)
    requester_email: EmailStr
    company: str | None = Field(default=None, max_length=255)
    service: RequestService
    description: str = Field(min_length=1, max_length=10000)


class InquiryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester_name: str
    requester_email: EmailStr
    company: str | None
    service: RequestService
    description: str
    created_at: datetime
