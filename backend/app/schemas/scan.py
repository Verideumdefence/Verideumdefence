from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.scan import ScanStatus, Severity


class ScanCreate(BaseModel):
    target: str = Field(min_length=1, max_length=512)
    scan_type: str = Field(default="network", max_length=64)


class FindingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scan_id: int
    title: str
    description: str
    severity: Severity
    recommendation: str
    resolved: bool
    created_at: datetime


class FindingUpdate(BaseModel):
    resolved: bool


class ScanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    target: str
    scan_type: str
    status: ScanStatus
    error: str | None
    owner_id: int
    created_at: datetime
    finished_at: datetime | None


class ScanDetail(ScanRead):
    findings: list[FindingRead] = []


class SeverityCount(BaseModel):
    severity: Severity
    count: int


class ReportSummary(BaseModel):
    total_scans: int
    completed_scans: int
    total_findings: int
    open_findings: int
    findings_by_severity: list[SeverityCount]
    risk_score: float
