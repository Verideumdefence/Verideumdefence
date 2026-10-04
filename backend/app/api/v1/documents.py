from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import Document, DocumentType, User
from app.schemas.document import DocumentCreate, DocumentRead

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Document:
    document = Document(
        title=payload.title,
        type=payload.type,
        project_id=payload.project_id,
        client_id=payload.client_id,
        client_name=payload.client_name,
        uploaded_by=user.id,
        uploaded_by_name=payload.uploaded_by_name,
        file_size=payload.file_size,
        file_url=payload.file_url,
        description=payload.description,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("", response_model=list[DocumentRead])
def list_documents(
    type: DocumentType | None = Query(default=None),
    client_id: int | None = Query(default=None),
    project_id: int | None = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> list[Document]:
    stmt = select(Document).order_by(Document.id.desc())
    if type is not None:
        stmt = stmt.where(Document.type == type)
    if client_id is not None:
        stmt = stmt.where(Document.client_id == client_id)
    if project_id is not None:
        stmt = stmt.where(Document.project_id == project_id)
    return list(db.scalars(stmt.offset(skip).limit(limit)))


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_admin),
) -> None:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    db.delete(document)
    db.commit()
