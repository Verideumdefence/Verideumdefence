from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    user_name: str
    user_role: str
    action: str
    resource: str
    resource_id: int | None
    ip_address: str | None
    user_agent: str | None
    status: str
    timestamp: datetime
    details: str | None
