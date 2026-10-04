import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import AuditAction, Project, ProjectPriority, ProjectStatus, User
from app.schemas.project import ProjectCreate, ProjectRead, ProjectUpdate
from app.services.audit import record_audit

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Project:
    project = Project(
        name=payload.name,
        client_id=payload.client_id,
        client_name=payload.client_name,
        service=payload.service,
        priority=payload.priority,
        start_date=payload.start_date,
        expected_completion=payload.expected_completion,
        assigned_team=json.dumps(payload.assigned_team),
        description=payload.description,
    )
    db.add(project)
    db.flush()
    record_audit(db, user, AuditAction.create, "project", {"project_id": project.id, "name": project.name}, request)
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectRead])
def list_projects(
    status: ProjectStatus | None = Query(default=None),
    priority: ProjectPriority | None = Query(default=None),
    client_id: int | None = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> list[Project]:
    stmt = select(Project).order_by(Project.id.desc())
    if status is not None:
        stmt = stmt.where(Project.status == status)
    if priority is not None:
        stmt = stmt.where(Project.priority == priority)
    if client_id is not None:
        stmt = stmt.where(Project.client_id == client_id)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    if payload.name is not None:
        project.name = payload.name
    if payload.status is not None:
        project.status = payload.status
    if payload.priority is not None:
        project.priority = payload.priority
    if payload.expected_completion is not None:
        project.expected_completion = payload.expected_completion
    if payload.actual_completion is not None:
        project.actual_completion = payload.actual_completion
    if payload.assigned_team is not None:
        project.assigned_team = json.dumps(payload.assigned_team)
    if payload.progress is not None:
        project.progress = payload.progress
    if payload.description is not None:
        project.description = payload.description

    action = AuditAction.change_status if payload.status is not None else AuditAction.update
    record_audit(db, user, action, "project", {"project_id": project.id}, request)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> None:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    record_audit(db, user, AuditAction.delete, "project", {"project_id": project.id, "name": project.name}, request)
    db.delete(project)
    db.commit()
