from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageCreate(BaseModel):
    to_id: int
    to_name: str
    subject: str
    content: str


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    from_id: int
    from_name: str
    to_id: int
    to_name: str
    subject: str
    content: str
    is_read: bool
    created_at: datetime
