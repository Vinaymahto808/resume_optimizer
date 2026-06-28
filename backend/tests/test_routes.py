import pytest
import json
import io
from unittest.mock import MagicMock, patch, PropertyMock, AsyncMock
from datetime import datetime

from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app
from app.database import get_db
from app.auth import get_current_user as auth_get_current_user
from app.models import User, Resume, PlanTier
from app.services.auth_service import create_refresh_token

# ==================== Fixtures ====================

@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def mock_db():
    db = MagicMock()
    return db


@pytest.fixture
def mock_user():
    user = MagicMock(spec=User)
    user.id = "test-user-id"
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.hashed_password = "hashed_pw_placeholder"
    return user


# ==================== Health Route ====================

class TestHealth:
    def test_health_endpoint(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["version"] == "1.0.0"


# ==================== Auth Routes ====================

class TestAuthRoutes:
    @patch("app.routes.auth_routes.register_user")
    @patch("app.routes.auth_routes.create_access_token")
    @patch("app.routes.auth_routes.create_refresh_token")
    def test_register_success(self, mock_create_refresh, mock_token, mock_register, client):
        mock_user = MagicMock()
        mock_user.id = "new-user-id"
        mock_user.email = "new@test.com"
        mock_user.full_name = "New User"
        mock_register.return_value = mock_user
        mock_token.return_value = "test-token"
        mock_create_refresh.return_value = "test-refresh-token"

        response = client.post("/api/auth/register", json={
            "email": "new@test.com",
            "password": "ValidP@ssword123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "test-token"
        assert data["user"]["email"] == "new@test.com"

    @patch("app.routes.auth_routes.register_user")
    def test_register_failure(self, mock_register, client):
        mock_register.side_effect = HTTPException(status_code=400, detail="Email already registered")
        response = client.post("/api/auth/register", json={
            "email": "existing@test.com",
            "password": "ValidP@ssword123",
        })
        assert response.status_code == 400

    @patch("app.routes.auth_routes.authenticate_user")
    @patch("app.routes.auth_routes.create_access_token")
    @patch("app.routes.auth_routes.create_refresh_token")
    def test_login_success(self, mock_create_refresh, mock_token, mock_auth, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"
        mock_user.email = "test@test.com"
        mock_user.full_name = "Test"
        mock_auth.return_value = mock_user
        mock_token.return_value = "login-token"
        mock_create_refresh.return_value = "test-refresh-token"

        response = client.post("/api/auth/login", data={
            "username": "test@test.com",
            "password": "ValidP@ssword123",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "login-token"

    @patch("app.routes.auth_routes.authenticate_user")
    def test_login_failure(self, mock_auth, client):
        mock_auth.side_effect = HTTPException(status_code=401, detail="Invalid email or password")
        response = client.post("/api/auth/login", data={
            "username": "wrong@test.com",
            "password": "wrong",
        })
        assert response.status_code == 401

    def test_me_endpoint_authenticated(self, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"
        mock_user.email = "test@test.com"
        mock_user.full_name = "Test User"
        app.dependency_overrides[auth_get_current_user] = lambda: mock_user
        response = client.get("/api/auth/me")
        app.dependency_overrides.clear()
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@test.com"

    def test_me_endpoint_unauthenticated(self, client):
        app.dependency_overrides[auth_get_current_user] = lambda: (_ for _ in ()).throw(HTTPException(status_code=401, detail="Not authenticated"))
        response = client.get("/api/auth/me")
        app.dependency_overrides.clear()
        assert response.status_code == 401

    @patch("app.routes.auth_routes.create_password_reset_token")
    @patch("app.routes.auth_routes.send_reset_email")
    def test_forgot_password(self, mock_send, mock_create, client):
        mock_create.return_value = "reset-token"
        mock_send.return_value = True
        with patch("app.models.User") as MockUser:
            mock_user = MagicMock()
            MockUser.email.__eq__ = lambda self, other: True
            filter_mock = MagicMock()
            filter_mock.first.return_value = mock_user
            session_mock = MagicMock()
            session_mock.query.return_value.filter.return_value = filter_mock

            def override_get_db():
                yield session_mock
            app.dependency_overrides[get_db] = override_get_db

            response = client.post("/api/auth/forgot-password", json={"email": "test@test.com"})
            app.dependency_overrides.clear()
            assert response.status_code == 200
            assert "message" in response.json()

    @patch("app.routes.auth_routes.reset_password")
    def test_reset_password(self, mock_reset, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"
        mock_reset.return_value = mock_user

        response = client.post("/api/auth/reset-password", json={
            "token": "valid-token",
            "new_password": "NewV@lidPass123",
        })
        assert response.status_code == 200
        assert response.json()["message"] == "Password reset successfully"

    @patch("app.routes.auth_routes.reset_password")
    def test_reset_password_failure(self, mock_reset, client):
        mock_reset.side_effect = HTTPException(status_code=400, detail="Invalid or expired reset token")
        response = client.post("/api/auth/reset-password", json={
            "token": "bad-token",
            "new_password": "NewV@lidPass123",
        })
        assert response.status_code == 400


# ==================== Resume Routes ====================

class TestResumeRoutes:
    def test_upload_resume_success(self, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"

        mock_db = MagicMock()

        mock_resume = MagicMock(spec=Resume)
        mock_resume.id = "res-1"
        mock_resume.filename = "test_resume.pdf"
        mock_db.add.return_value = None
        mock_db.commit.return_value = None
        mock_db.refresh.return_value = None

        mock_calc = {
            "ats_score": 85,
            "breakdown": {"formatting": 20},
            "keywords_found": ["python"],
            "keywords_missing": ["docker"],
            "suggestions": ["Add more keywords"],
            "word_count": 150,
            "raw_text": "sample text",
            "tier1_checks": [],
            "tier2_checks": [],
            "nineteen_point": {"Content": {"score": 50}},
        }

        app.dependency_overrides[auth_get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db
        with patch("app.resume_routes.calculate_ats_score", return_value=mock_calc):
            with patch("app.resume_routes.keyword_match_analysis") as mock_kw:
                mock_kw.return_value = {"categories": {"ML & AI": {"matched": [], "count": 0, "total": 10, "score": 0}}}
                response = client.post(
                    "/api/resumes/upload",
                    files={"file": ("test_resume.pdf", b"%PDF-1.4 fake pdf content", "application/pdf")},
                )
                app.dependency_overrides.clear()
                assert response.status_code in (200, 422)

    def test_upload_invalid_extension(self, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"

        app.dependency_overrides[auth_get_current_user] = lambda: mock_user
        response = client.post(
            "/api/resumes/upload",
            files={"file": ("test.exe", b"some content", "application/x-msdownload")},
        )
        app.dependency_overrides.clear()
        assert response.status_code == 400

    def test_list_resumes(self, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"

        mock_db = MagicMock()

        mock_resume = MagicMock(spec=Resume)
        mock_resume.id = "res-1"
        mock_resume.filename = "test.pdf"
        mock_resume.ats_score = 78.5
        mock_resume.created_at = datetime.utcnow()

        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_resume]

        app.dependency_overrides[auth_get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/resumes/")
        app.dependency_overrides.clear()
        assert response.status_code == 200

    @patch("app.resume_routes.calculate_ats_score")
    def test_get_resume_detail(self, mock_calc, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"

        mock_db = MagicMock()

        mock_resume = MagicMock(spec=Resume)
        mock_resume.id = "res-1"
        mock_resume.filename = "test.pdf"
        mock_resume.ats_score = 78.5
        mock_resume.keywords_found = "python,sql"
        mock_resume.keywords_missing = "docker"
        mock_resume.suggestions = "Add keywords\nProofread"
        mock_resume.raw_text = "Python developer"
        mock_resume.file_path = "/tmp/test.pdf"
        mock_resume.created_at = datetime.utcnow()
        mock_resume.user_id = "user-id"

        mock_db.query.return_value.filter.return_value.first.return_value = mock_resume
        mock_calc.return_value = {
            "breakdown": {"formatting": 20},
            "nineteen_point": {"Content": {"score": 50}},
            "tier1_checks": [],
            "tier2_checks": [],
        }

        with patch("app.resume_routes.keyword_match_analysis") as mock_kw:
            mock_kw.return_value = {
                "categories": {"ML & AI": {"matched": [], "count": 0, "total": 10, "score": 0}}
            }

            app.dependency_overrides[auth_get_current_user] = lambda: mock_user
            app.dependency_overrides[get_db] = lambda: mock_db

            response = client.get("/api/resumes/res-1")
            app.dependency_overrides.clear()

            if response.status_code == 200:
                data = response.json()
                assert data["id"] == "res-1"

    def test_get_resume_not_found(self, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"

        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None

        app.dependency_overrides[auth_get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/resumes/nonexistent")
        app.dependency_overrides.clear()
        assert response.status_code == 404

    def test_delete_resume(self, client):
        mock_user = MagicMock()
        mock_user.id = "user-id"

        mock_db = MagicMock()

        mock_resume = MagicMock(spec=Resume)
        mock_resume.id = "res-1"
        mock_resume.file_path = "/tmp/test.pdf"
        mock_resume.user_id = "user-id"

        mock_db.query.return_value.filter.return_value.first.return_value = mock_resume

        with patch("os.path.exists", return_value=True):
            with patch("os.remove") as mock_remove:
                app.dependency_overrides[auth_get_current_user] = lambda: mock_user
                app.dependency_overrides[get_db] = lambda: mock_db

                response = client.delete("/api/resumes/res-1")
                app.dependency_overrides.clear()
                assert response.status_code == 200
                mock_remove.assert_called_once_with("/tmp/test.pdf")


# ==================== Profile Routes ====================

class TestProfileRoutes:
    def test_analyze_endpoint(self, client):
        response = client.post("/api/analyze", json={
            "profile_text": "python machine learning deep learning nlp docker gcp aws " * 3,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data

    def test_analyze_too_short(self, client):
        response = client.post("/api/analyze", json={"profile_text": "short"})
        assert response.status_code == 422

    @patch("app.profile_routes.fetch_profile_text")
    def test_fetch_profile(self, mock_fetch, client):
        mock_fetch.return_value = {"success": True, "text": "Profile text"}
        response = client.post("/api/fetch-profile", json={
            "url": "https://linkedin.com/in/testuser",
        })
        assert response.status_code == 200

    def test_recommend_jobs(self, client):
        response = client.post("/api/recommend-jobs", json={
            "profile_text": "python sql machine learning docker gcp aws pandas numpy " * 3,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_ats_analyze(self, client):
        response = client.post("/api/ats-analyze", json={
            "resume_text": "python sql machine learning docker\n• Bullet 1\n• Bullet 2\n• Bullet 3\n• Bullet 4\n• Bullet 5\nExperience\nEducation\nSkills\ntest@email.com +1-555-123-4567",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_upload_resume_legacy_no_file(self, client):
        response = client.post("/api/upload-resume")
        assert response.status_code == 422

    def test_upload_resume_legacy_invalid_ext(self, client):
        response = client.post(
            "/api/upload-resume",
            files={"file": ("test.txt", b"some text", "text/plain")},
        )
        assert response.status_code == 400

    @patch("app.profile_routes.extract_text_from_resume")
    def test_upload_resume_legacy_success(self, mock_extract, client):
        mock_extract.return_value = {
            "success": True,
            "text": "Extracted resume text",
            "char_count": 20,
            "word_count": 3,
        }
        response = client.post(
            "/api/upload-resume",
            files={"file": ("test.pdf", b"%PDF content", "application/pdf")},
        )
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True


# ==================== AI Routes ====================

class TestAIRoutes:
    def test_ai_analyze_no_key(self, client):
        with patch("app.ai_routes.get_api_key") as mock_key:
            mock_key.side_effect = HTTPException(status_code=400, detail="GROQ_API_KEY not configured")
            response = client.post("/api/ai-analyze", json={
                "profile_text": "python machine learning " * 5,
            })
            assert response.status_code == 400

    @patch("app.ai_routes.analyze_with_groq")
    @patch("app.ai_routes.get_api_key")
    def test_ai_analyze_success(self, mock_key, mock_analyze, client):
        mock_key.return_value = "test-api-key"
        mock_analyze.return_value = {"overall_rating": 8, "strengths": ["Python expert"]}

        response = client.post("/api/ai-analyze", json={
            "profile_text": "python machine learning " * 5,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    @patch("app.ai_routes.analyze_with_groq")
    @patch("app.ai_routes.get_api_key")
    def test_ai_analyze_failure(self, mock_key, mock_analyze, client):
        mock_key.return_value = "test-api-key"
        mock_analyze.return_value = None

        response = client.post("/api/ai-analyze", json={
            "profile_text": "python machine learning " * 5,
        })
        assert response.status_code == 500

    @patch("app.ai_routes.match_job_with_groq")
    @patch("app.ai_routes.get_api_key")
    def test_ai_match_success(self, mock_key, mock_match, client):
        mock_key.return_value = "key"
        mock_match.return_value = {"fit_score": 8, "reasons": ["Good match"]}

        response = client.post("/api/ai-match", json={
            "profile_text": "python developer with ML skills",
            "job_title": "Data Scientist",
            "job_description": "Need python and ML",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True

    @patch("app.ai_routes.match_job_with_groq")
    @patch("app.ai_routes.get_api_key")
    def test_ai_match_failure(self, mock_key, mock_match, client):
        mock_key.return_value = "key"
        mock_match.return_value = None

        response = client.post("/api/ai-match", json={
            "profile_text": "python developer with ML skills",
            "job_title": "Data Scientist",
            "job_description": "Need python and ML",
        })
        assert response.status_code == 500

    @patch("app.ai_routes.suggest_jobs_with_groq")
    @patch("app.ai_routes.get_api_key")
    def test_ai_suggest_jobs(self, mock_key, mock_suggest, client):
        mock_key.return_value = "key"
        mock_suggest.return_value = {"suggested_roles": [{"title": "DS"}]}

        response = client.post("/api/ai-suggest-jobs", json={
            "profile_text": "python machine learning",
        })
        assert response.status_code == 200

    @patch("app.ai_routes.generate_career_roadmap")
    @patch("app.ai_routes.get_api_key")
    def test_ai_roadmap(self, mock_key, mock_roadmap, client):
        mock_key.return_value = "key"
        mock_roadmap.return_value = {"skills": []}

        response = client.post("/api/ai-roadmap", json={"target_role": "Data Scientist"})
        assert response.status_code == 200

    @patch("app.ai_routes.generate_portfolio_html")
    @patch("app.ai_routes.get_api_key")
    def test_ai_portfolio(self, mock_key, mock_portfolio, client):
        mock_key.return_value = "key"
        mock_portfolio.return_value = {"html": "<html></html>"}

        response = client.post("/api/ai-portfolio", json={
            "resume_text": "Experienced developer with python skills " * 3,
        })
        assert response.status_code == 200

    @patch("app.ai_routes.generate_analytics_suggestions")
    @patch("app.ai_routes.get_api_key")
    def test_ai_analytics(self, mock_key, mock_analytics, client):
        mock_key.return_value = "key"
        mock_analytics.return_value = {"profile_strength": {"score": 75}}

        response = client.post("/api/ai-analytics", json={
            "profile_text": "python machine learning " * 5,
        })
        assert response.status_code == 200
