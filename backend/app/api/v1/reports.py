from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Finding, Scan, ScanStatus, Severity, User
from app.schemas.scan import ReportSummary, SeverityCount
from app.services.reports import generate_excel_report, generate_pdf_report

router = APIRouter(prefix="/reports", tags=["reports"])

_SEVERITY_WEIGHTS = {
    Severity.info: 0.0,
    Severity.low: 1.0,
    Severity.medium: 3.0,
    Severity.high: 7.0,
    Severity.critical: 10.0,
}


@router.get("/summary", response_model=ReportSummary)
def summary(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> ReportSummary:
    owned_scans = select(Scan.id).where(Scan.owner_id == user.id).scalar_subquery()

    total_scans = db.scalar(
        select(func.count()).select_from(Scan).where(Scan.owner_id == user.id)
    )
    completed_scans = db.scalar(
        select(func.count())
        .select_from(Scan)
        .where(Scan.owner_id == user.id, Scan.status == ScanStatus.completed)
    )
    rows = db.execute(
        select(Finding.severity, func.count())
        .where(Finding.scan_id.in_(owned_scans))
        .group_by(Finding.severity)
    ).all()

    counts = {severity: count for severity, count in rows}
    open_findings = db.scalar(
        select(func.count())
        .select_from(Finding)
        .where(Finding.scan_id.in_(owned_scans), Finding.resolved.is_(False))
    )
    total_findings = sum(counts.values())
    weighted = sum(_SEVERITY_WEIGHTS[sev] * count for sev, count in counts.items())
    risk_score = round(min(weighted / max(total_findings, 1), 10.0), 2)

    return ReportSummary(
        total_scans=total_scans or 0,
        completed_scans=completed_scans or 0,
        total_findings=total_findings,
        open_findings=open_findings or 0,
        findings_by_severity=[
            SeverityCount(severity=sev, count=counts.get(sev, 0)) for sev in Severity
        ],
        risk_score=risk_score,
    )


@router.get("/scan/{scan_id}/pdf")
def download_pdf_report(
    scan_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Download a PDF report for a specific scan."""
    scan = db.get(Scan, scan_id)
    if not scan or (scan.owner_id != user.id and not user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    try:
        pdf_buffer = generate_pdf_report(scan_id, db)
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=scan_{scan_id}_report.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF report: {str(e)}"
        )


@router.get("/scan/{scan_id}/excel")
def download_excel_report(
    scan_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Download an Excel report for a specific scan."""
    scan = db.get(Scan, scan_id)
    if not scan or (scan.owner_id != user.id and not user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scan not found"
        )
    
    try:
        excel_buffer = generate_excel_report(scan_id, db)
        return StreamingResponse(
            excel_buffer,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=scan_{scan_id}_report.xlsx"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Excel report: {str(e)}"
        )
