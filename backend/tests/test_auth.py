from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.models import User


def test_admin_login_and_me(client: TestClient, db_session) -> None:
    db_session.add(User(
        email="a@b.com",
        full_name="A B",
        password_hash=hash_password("Z8!copperLake#42"),
        is_admin=True,
    ))
    db_session.commit()

    login = client.post("/api/v1/auth/login", json={"email": "a@b.com", "password": "Z8!copperLake#42"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "A B"


def test_client_signup_and_portal_profile_routes_are_removed(client: TestClient) -> None:
    payload = {"email": "portal@example.com", "password": "W7!nQ2#vR9$xP", "full_name": "Portal Client"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 404
    assert client.get("/api/v1/clients/me").status_code == 401


def test_legacy_client_accounts_cannot_access_portal_data(client: TestClient, db_session) -> None:
    user = User(
        email="legacy-client@example.com",
        password_hash=hash_password("W7!nQ2#vR9$xP"),
        is_admin=False,
    )
    db_session.add(user)
    db_session.commit()
    token = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "W7!nQ2#vR9$xP"},
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    for endpoint in ("/api/v1/requests", "/api/v1/projects", "/api/v1/tickets", "/api/v1/documents", "/api/v1/messages"):
        assert client.get(endpoint, headers=headers).status_code == 403


def test_login_with_wrong_password(client: TestClient, db_session) -> None:
    db_session.add(User(email="a@b.com", password_hash=hash_password("Z8!copperLake#42"), is_admin=True))
    db_session.commit()
    response = client.post("/api/v1/auth/login", json={"email": "a@b.com", "password": "nope12345"})
    assert response.status_code == 401


def test_me_requires_token(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401
