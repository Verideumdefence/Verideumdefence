from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    name: str
    client_id: int
    client_name: str
    service: str
    priority: str = "medium"
    start_date: datetime
    expected_completion: datetime | None = None
    assigned_team: list[int] = []
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    priority: str | None = None
    expected_completion: datetime | None = None
    actual_completion: datetime | None = None
    assigned_team: list[int] | None = None
    progress: int | None = None
    description: str | None = None


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    client_id: int
    client_name: str
    service: str
    status: str
    priority: str
    start_date: datetime
    expected_completion: datetime | None
    actual_completion: datetime | None
    assigned_team: str
    progress: int
    description: str | None
    created_at: datetime
    updated_at: datetime
