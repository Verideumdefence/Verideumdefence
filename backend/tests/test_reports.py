from fastapi.testclient import TestClient


def test_summary_aggregates_findings(client: TestClient, auth_headers: dict[str, str]) -> None:
    client.post(
        "/api/v1/scans", json={"target": "http://example.com:3389"}, headers=auth_headers
    )
    summary = client.get("/api/v1/reports/summary", headers=auth_headers).json()

    assert summary["total_scans"] == 1
    assert summary["completed_scans"] == 1
    assert summary["total_findings"] == summary["open_findings"] > 0
    assert 0 <= summary["risk_score"] <= 10
    assert {row["severity"] for row in summary["findings_by_severity"]} == {
        "info",
        "low",
        "medium",
        "high",
        "critical",
    }
