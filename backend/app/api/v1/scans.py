from collections.abc import Callable

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_session_factory
from app.db.session import get_db
from app.models import Finding, Scan, ScanStatus, Severity, User
from app.schemas.scan import FindingRead, FindingUpdate, ScanCreate, ScanDetail, ScanRead
from app.services.scanner import run_scan

router = APIRouter(prefix="/scans", tags=["scans"])
limiter = Limiter(key_func=get_remote_address)


def _run_scan_task(session_factory: Callable[[], Session], scan_id: int) -> None:
    db = session_factory()
    try:
        run_scan(db, scan_id)
    finally:
        db.close()


def _get_owned_scan(db: Session, scan_id: int, user: User) -> Scan:
    scan = db.get(Scan, scan_id)
    if scan is None or (scan.owner_id != user.id and not user.is_admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    return scan


@router.post("", response_model=ScanRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_scan(
    request: Request,
    payload: ScanCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    session_factory: Callable[[], Session] = Depends(get_session_factory),
) -> Scan:
    scan = Scan(target=payload.target, scan_type=payload.scan_type, owner_id=user.id)
    db.add(scan)
    db.commit()
    db.refresh(scan)
    background_tasks.add_task(_run_scan_task, session_factory, scan.id)
    return scan


@router.get("", response_model=list[ScanRead])
def list_scans(
    scan_status: ScanStatus | None = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Scan]:
    stmt = select(Scan).where(Scan.owner_id == user.id).order_by(Scan.id.desc())
    if scan_status is not None:
        stmt = stmt.where(Scan.status == scan_status)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{scan_id}", response_model=ScanDetail)
def get_scan(
    scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> Scan:
    return _get_owned_scan(db, scan_id, user)


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(
    scan_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    scan = _get_owned_scan(db, scan_id, user)
    db.delete(scan)
    db.commit()


@router.get("/{scan_id}/findings", response_model=list[FindingRead])
def list_findings(
    scan_id: int,
    severity: Severity | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Finding]:
    scan = _get_owned_scan(db, scan_id, user)
    stmt = select(Finding).where(Finding.scan_id == scan.id)
    if severity is not None:
        stmt = stmt.where(Finding.severity == severity)
    return list(db.scalars(stmt))


@router.patch("/{scan_id}/findings/{finding_id}", response_model=FindingRead)
def update_finding(
    scan_id: int,
    finding_id: int,
    payload: FindingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Finding:
    scan = _get_owned_scan(db, scan_id, user)
    finding = db.get(Finding, finding_id)
    if finding is None or finding.scan_id != scan.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    finding.resolved = payload.resolved
    db.commit()
    db.refresh(finding)
    return finding
