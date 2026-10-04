from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RequestCreate(BaseModel):
    requester_name: str
    requester_email: EmailStr
    company: str | None = None
    service: str
    priority: str = "medium"
    description: str
    contact_info: str | None = None


class RequestUpdate(BaseModel):
    status: str | None = None
    assigned_to: int | None = None
    internal_notes: str | None = None


class RequestRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    requester_id: int
    requester_name: str
    requester_email: str
    company: str | None
    service: str
    priority: str
    status: str
    description: str
    contact_info: str | None
    assigned_to: int | None
    internal_notes: str | None
    created_at: datetime
    updated_at: datetime
