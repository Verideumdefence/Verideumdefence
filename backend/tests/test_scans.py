from fastapi.testclient import TestClient
from app.core.security import hash_password
from app.models import User


def test_scan_lifecycle_and_findings(client: TestClient, auth_headers: dict[str, str]) -> None:
    created = client.post(
        "/api/v1/scans",
        json={"target": "http://example.com:23", "scan_type": "web"},
        headers=auth_headers,
    )
    assert created.status_code == 201
    scan_id = created.json()["id"]

    detail = client.get(f"/api/v1/scans/{scan_id}", headers=auth_headers).json()
    assert detail["status"] == "completed"
    assert len(detail["findings"]) >= 2

    critical = client.get(
        f"/api/v1/scans/{scan_id}/findings", params={"severity": "critical"}, headers=auth_headers
    ).json()
    assert critical and critical[0]["severity"] == "critical"

    resolved = client.patch(
        f"/api/v1/scans/{scan_id}/findings/{critical[0]['id']}",
        json={"resolved": True},
        headers=auth_headers,
    )
    assert resolved.json()["resolved"] is True

    assert client.delete(f"/api/v1/scans/{scan_id}", headers=auth_headers).status_code == 204
    assert client.get(f"/api/v1/scans/{scan_id}", headers=auth_headers).status_code == 404


def test_scans_are_isolated_per_user(client: TestClient, auth_headers: dict[str, str], db_session) -> None:
    scan_id = client.post(
        "/api/v1/scans", json={"target": "https://example.com"}, headers=auth_headers
    ).json()["id"]

    db_session.add(User(email="other@x.io", password_hash=hash_password("Z8!copperLake#42"), is_admin=False))
    db_session.commit()
    other_token = client.post(
        "/api/v1/auth/login", json={"email": "other@x.io", "password": "Z8!copperLake#42"}
    ).json()["access_token"]
    other = {"Authorization": f"Bearer {other_token}"}

    assert client.get(f"/api/v1/scans/{scan_id}", headers=other).status_code == 404
    assert client.get("/api/v1/scans", headers=other).json() == []
