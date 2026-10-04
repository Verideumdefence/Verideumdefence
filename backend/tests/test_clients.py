from fastapi.testclient import TestClient


def test_admin_can_create_client_with_selected_status(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post(
        "/api/v1/clients",
        headers=auth_headers,
        json={
            "name": "Acme Contact",
            "email": "security@acme.test",
            "company": "Acme",
            "services": ["penetration_test", "incident_response"],
            "status": "active",
            "contact_info": {"phone": "+1-555-0100"},
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "active"
    assert response.json()["services"] == '["penetration_test", "incident_response"]'

    client_id = response.json()["id"]
    update_response = client.patch(
        f"/api/v1/clients/{client_id}",
        headers=auth_headers,
        json={"name": "Acme Security Contact", "contact_info": None},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Acme Security Contact"
    assert update_response.json()["contact_info"] is None

    delete_response = client.delete(f"/api/v1/clients/{client_id}", headers=auth_headers)
    assert delete_response.status_code == 204

    audit_response = client.get("/api/v1/audit-logs?resource=client", headers=auth_headers)
    assert audit_response.status_code == 200
    actions = {entry["action"] for entry in audit_response.json()}
    assert actions == {"create", "update", "delete"}
    assert client.get("/api/v1/audit-logs?resource=client&q=Acme", headers=auth_headers).json()


def test_admin_message_actions_are_audited(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    current_user = client.get("/api/v1/auth/me", headers=auth_headers).json()
    message_response = client.post(
        "/api/v1/messages",
        headers=auth_headers,
        json={
            "to_id": current_user["id"],
            "to_name": "untrusted supplied name",
            "subject": "Test message",
            "content": "Audit trail verification",
        },
    )
    assert message_response.status_code == 201
    message = message_response.json()
    assert message["to_name"] == current_user["full_name"]

    marked_read = client.patch(
        f"/api/v1/messages/{message['id']}/read", headers=auth_headers, json={}
    )
    assert marked_read.status_code == 200

    delete_response = client.delete(
        f"/api/v1/messages/{message['id']}", headers=auth_headers
    )
    assert delete_response.status_code == 204

    audit_response = client.get("/api/v1/audit-logs?resource=message", headers=auth_headers)
    assert audit_response.status_code == 200
    actions = {entry["action"] for entry in audit_response.json()}
    assert actions == {"create", "change_status", "delete"}