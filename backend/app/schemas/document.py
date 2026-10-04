from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentCreate(BaseModel):
    title: str
    type: str
    project_id: int | None = None
    client_id: int
    client_name: str
    uploaded_by_name: str
    file_size: int
    file_url: str | None = None
    description: str | None = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    type: str
    project_id: int | None
    client_id: int
    client_name: str
    uploaded_by: int | None
    uploaded_by_name: str
    file_size: int
    file_url: str | None
    created_at: datetime
    description: str | None
