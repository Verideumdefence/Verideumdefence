from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import User


def test_update_profile(client: TestClient, auth_headers: dict[str, str]) -> None:
    res = client.patch("/api/v1/users/me", json={"full_name": "New Name"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["full_name"] == "New Name"


def test_listing_users_requires_admin(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    user = db_session.query(User).one()
    user.is_admin = False
    db_session.commit()
    assert client.get("/api/v1/users", headers=auth_headers).status_code == 403

    user.is_admin = True
    db_session.commit()

    assert client.get("/api/v1/users", headers=auth_headers).status_code == 200
