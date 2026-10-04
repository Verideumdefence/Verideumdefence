from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TicketCreate(BaseModel):
    subject: str
    client_id: int
    client_name: str
    category: str
    priority: str = "medium"
    description: str


class TicketUpdate(BaseModel):
    status: str | None = None
    priority: str | None = None
    assigned_to: int | None = None


class TicketMessageCreate(BaseModel):
    content: str
    is_internal: bool = False


class TicketMessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_id: int
    sender_id: int
    sender_name: str
    sender_role: str
    content: str
    is_internal: bool
    created_at: datetime


class TicketRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject: str
    client_id: int
    client_name: str
    category: str
    priority: str
    status: str
    assigned_to: int | None
    description: str
    created_at: datetime
    updated_at: datetime
    last_updated_by: int | None
