import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("VERIDEUMDEFENCE_SECRET_KEY", "test-secret")

from app.api.deps import get_session_factory  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import User  # noqa: E402

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture(autouse=True)
def db_session() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_session_factory] = lambda: TestingSessionLocal
    try:
        yield db
    finally:
        app.dependency_overrides.clear()
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    db = TestingSessionLocal()
    db.add(User(
        email="analyst@verideumdefence.io",
        full_name="Analyst",
        password_hash=hash_password("Z8!copperLake#42"),
        is_admin=True,
    ))
    db.commit()
    db.close()
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@verideumdefence.io", "password": "Z8!copperLake#42"},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
