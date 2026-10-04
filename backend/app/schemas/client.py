from datetime import datetime

from pydantic import BaseModel, ConfigDict
from app.models.client import ClientStatus


class ClientCreate(BaseModel):
    name: str
    email: str
    company: str
    services: list[str] = []
    status: ClientStatus = ClientStatus.pending
    contact_info: dict | None = None


class ClientUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    company: str | None = None
    services: list[str] | None = None
    status: ClientStatus | None = None
    contact_info: dict | None = None


class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    name: str
    email: str
    company: str
    services: str
    status: str
    contact_info: str | None
    created_at: datetime
