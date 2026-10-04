import json
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import AuditAction, Client, ClientStatus, User
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.services.audit import record_audit

router = APIRouter(prefix="/clients", tags=["clients"])


@router.post("", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Client:
    client = Client(
        name=payload.name,
        email=payload.email,
        company=payload.company,
        services=json.dumps(payload.services),
        status=payload.status,
        contact_info=json.dumps(payload.contact_info) if payload.contact_info else None,
    )
    db.add(client)
    db.flush()
    record_audit(db, user, AuditAction.create, "client", {"client_id": client.id, "name": client.name}, request)
    db.commit()
    db.refresh(client)
    return client


@router.get("", response_model=list[ClientRead])
def list_clients(
    status: ClientStatus | None = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> list[Client]:
    stmt = select(Client).order_by(Client.id.desc())
    if status is not None:
        stmt = stmt.where(Client.status == status)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{client_id}", response_model=ClientRead)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Client:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.patch("/{client_id}", response_model=ClientRead)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Client:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    if payload.name is not None:
        client.name = payload.name
    if payload.email is not None:
        client.email = payload.email
    if payload.company is not None:
        client.company = payload.company
    if payload.services is not None:
        client.services = json.dumps(payload.services)
    if payload.status is not None:
        client.status = payload.status
    if "contact_info" in payload.model_fields_set:
        client.contact_info = json.dumps(payload.contact_info) if payload.contact_info is not None else None

    action = AuditAction.change_status if payload.status is not None else AuditAction.update
    record_audit(db, user, action, "client", {"client_id": client.id}, request)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> None:
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    record_audit(db, user, AuditAction.delete, "client", {"client_id": client.id, "name": client.name}, request)
    db.delete(client)
    db.commit()
