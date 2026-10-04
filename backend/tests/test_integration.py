"""Integration tests for the API."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.core.security import hash_password


# Test database setup
TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session():
    """Create a test database session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """Create a test client."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    from app.models import User
    user = User(
        email="test@example.com",
        full_name="Test User",
        password_hash=hash_password("TestPassword123!@#"),
        is_active=True,
        is_admin=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_token(client, test_user):
    """Get authentication token for test user."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "TestPassword123!@#"}
    )
    return response.json()["access_token"]


class TestAuthEndpoints:
    """Test authentication endpoints."""

    def test_public_signup_is_removed(self, client):
        """Client self-registration is no longer available."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "password": "Z8!copperLake#42",
                "full_name": "New User"
            }
        )
        assert response.status_code == 404

    def test_signup_route_is_removed_for_existing_emails(self, client, test_user):
        """The removed signup route does not expose whether an email exists."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "password": "Z8!copperLake#42",
                "full_name": "Duplicate User"
            }
        )
        assert response.status_code == 404

    def test_signup_route_is_removed_for_any_password(self, client):
        """The removed signup route returns not found for every payload."""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "weak@example.com",
                "password": "weak",
                "full_name": "Weak User"
            }
        )
        assert response.status_code == 404

    def test_login_success(self, client, test_user):
        """Test successful login."""
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "TestPassword123!@#"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client, test_user):
        """Test login with invalid credentials."""
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_get_current_user(self, client, auth_token):
        """Test getting current user."""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"

    def test_2fa_setup(self, client, auth_token):
        """Test 2FA setup."""
        response = client.post(
            "/api/v1/auth/2fa/setup",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "secret" in data
        assert "qr_code_url" in data


class TestScanEndpoints:
    """Test scan endpoints."""

    def test_create_scan(self, client, auth_token):
        """Test creating a scan."""
        response = client.post(
            "/api/v1/scans",
            json={"target": "example.com", "scan_type": "network"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["target"] == "example.com"
        assert data["scan_type"] == "network"
        assert data["status"] == "pending"

    def test_list_scans(self, client, auth_token, test_user):
        """Test listing scans."""
        # Create a scan first
        client.post(
            "/api/v1/scans",
            json={"target": "example.com", "scan_type": "network"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        response = client.get(
            "/api/v1/scans",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_scan(self, client, auth_token, test_user):
        """Test getting a specific scan."""
        # Create a scan first
        create_response = client.post(
            "/api/v1/scans",
            json={"target": "example.com", "scan_type": "network"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        scan_id = create_response.json()["id"]
        
        response = client.get(
            f"/api/v1/scans/{scan_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == scan_id

    def test_delete_scan(self, client, auth_token, test_user):
        """Test deleting a scan."""
        # Create a scan first
        create_response = client.post(
            "/api/v1/scans",
            json={"target": "example.com", "scan_type": "network"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        scan_id = create_response.json()["id"]
        
        response = client.delete(
            f"/api/v1/scans/{scan_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 204


class TestReportEndpoints:
    """Test report endpoints."""

    def test_get_summary(self, client, auth_token):
        """Test getting report summary."""
        response = client.get(
            "/api/v1/reports/summary",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_scans" in data
        assert "total_findings" in data
        assert "risk_score" in data

    def test_pdf_report(self, client, auth_token, test_user):
        """Test PDF report generation."""
        # Create a scan first
        create_response = client.post(
            "/api/v1/scans",
            json={"target": "example.com", "scan_type": "network"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        scan_id = create_response.json()["id"]
        
        response = client.get(
            f"/api/v1/reports/scan/{scan_id}/pdf",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers["content-type"]

    def test_excel_report(self, client, auth_token, test_user):
        """Test Excel report generation."""
        # Create a scan first
        create_response = client.post(
            "/api/v1/scans",
            json={"target": "example.com", "scan_type": "network"},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        scan_id = create_response.json()["id"]
        
        response = client.get(
            f"/api/v1/reports/scan/{scan_id}/excel",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        assert "spreadsheet" in response.headers["content-type"]


class TestRateLimiting:
    """Test rate limiting."""

    def test_signup_route_stays_removed_after_repeated_requests(self, client):
        """Repeated requests cannot restore the removed signup endpoint."""
        # Try to register multiple times quickly
        for i in range(6):
            response = client.post(
                "/api/v1/auth/register",
                json={
                    "email": f"ratelimit{i}@example.com",
                    "password": "Z8!copperLake#42",
                    "full_name": f"Rate Limit {i}"
                }
            )
        
        assert response.status_code == 404
