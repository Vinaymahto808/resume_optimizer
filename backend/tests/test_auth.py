import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from datetime import datetime, timedelta
from jose import jwt
from fastapi import HTTPException

from app.auth import (
    hash_password, verify_password, create_access_token, get_current_user,
    register_user, authenticate_user, create_password_reset_token,
    send_reset_email, reset_password, UserCreate, ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.models import User, PasswordResetToken


class TestHashVerifyPassword:
    def test_hash_and_verify_correct(self):
        pw = "MyStr0ng!Pass123"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("CorrectP@ss1")
        assert verify_password("WrongP@ss1", hashed) is False


class TestCreateAccessToken:
    def test_creates_valid_jwt(self):
        data = {"sub": "user-123"}
        token = create_access_token(data)
        assert token is not None
        assert isinstance(token, str)
        assert len(token.split(".")) == 3

    @patch("app.auth.settings")
    def test_uses_secret_key_from_settings(self, mock_settings):
        mock_settings.SECRET_KEY = "custom-secret"
        mock_settings.ALGORITHM = "HS256"
        mock_settings.ACCESS_TOKEN_EXPIRE_MINUTES = 60
        token = create_access_token({"sub": "abc"})
        payload = jwt.decode(token, "custom-secret", algorithms=["HS256"])
        assert payload["sub"] == "abc"


class TestGetCurrentUser:
    def test_returns_user_for_valid_token(self, mock_db, sample_user):
        token = create_access_token({"sub": sample_user.id})
        mock_db.query().filter().first.return_value = sample_user
        result = get_current_user(token=token, db=mock_db)
        assert result.id == sample_user.id

    def test_raises_for_invalid_token(self, mock_db):
        with pytest.raises(HTTPException) as exc:
            get_current_user(token="bad-token", db=mock_db)
        assert exc.value.status_code == 401

    def test_raises_for_expired_token(self, mock_db, monkeypatch):
        monkeypatch.setattr("app.auth.settings.ACCESS_TOKEN_EXPIRE_MINUTES", -1)
        token = create_access_token({"sub": "any-id"})
        with pytest.raises(HTTPException) as exc:
            get_current_user(token=token, db=mock_db)
        assert exc.value.status_code == 401

    def test_raises_when_user_not_found(self, mock_db):
        token = create_access_token({"sub": "nonexistent"})
        mock_db.query().filter().first.return_value = None
        with pytest.raises(HTTPException) as exc:
            get_current_user(token=token, db=mock_db)
        assert exc.value.status_code == 401
        assert "User not found" in exc.value.detail

    def test_raises_when_sub_is_none(self, mock_db):
        token = create_access_token({"foo": "bar"})
        with pytest.raises(HTTPException) as exc:
            get_current_user(token=token, db=mock_db)
        assert exc.value.status_code == 401


class TestRegisterUser:
    def test_registers_valid_user(self, mock_db):
        data = UserCreate(email="new@test.com", password="ValidP@ssword123", full_name="New User")
        mock_db.query().filter().first.return_value = None
        user = register_user(data, mock_db)
        assert user.email == "new@test.com"
        assert user.full_name == "New User"
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_rejects_short_password(self, mock_db):
        data = UserCreate(email="test@test.com", password="Sh0rt!")
        with pytest.raises(HTTPException) as exc:
            register_user(data, mock_db)
        assert exc.value.status_code == 400
        assert "at least 12 characters" in exc.value.detail

    def test_rejects_password_without_uppercase(self, mock_db):
        data = UserCreate(email="test@test.com", password="lowercaseonly1!")
        with pytest.raises(HTTPException) as exc:
            register_user(data, mock_db)
        assert exc.value.status_code == 400
        assert "uppercase" in exc.value.detail

    def test_rejects_password_without_lowercase(self, mock_db):
        data = UserCreate(email="test@test.com", password="UPPERCASEONLY1!")
        with pytest.raises(HTTPException) as exc:
            register_user(data, mock_db)
        assert exc.value.status_code == 400
        assert "lowercase" in exc.value.detail

    def test_rejects_password_without_number(self, mock_db):
        data = UserCreate(email="test@test.com", password="NoNumberHere!")
        with pytest.raises(HTTPException) as exc:
            register_user(data, mock_db)
        assert exc.value.status_code == 400
        assert "number" in exc.value.detail

    def test_rejects_password_without_special_char(self, mock_db):
        data = UserCreate(email="test@test.com", password="NoSpecialChar1aaa")
        with pytest.raises(HTTPException) as exc:
            register_user(data, mock_db)
        assert exc.value.status_code == 400
        assert "special character" in exc.value.detail

    def test_rejects_password_with_spaces(self, mock_db):
        data = UserCreate(email="test@test.com", password="Has Spaces 1!")
        with pytest.raises(HTTPException) as exc:
            register_user(data, mock_db)
        assert exc.value.status_code == 400
        assert "no spaces" in exc.value.detail

    def test_rejects_duplicate_email(self, mock_db, sample_user):
        data = UserCreate(email=sample_user.email, password="ValidP@ssword123")
        mock_db.query().filter().first.return_value = sample_user
        with pytest.raises(HTTPException) as exc:
            register_user(data, mock_db)
        assert exc.value.status_code == 400
        assert "already registered" in exc.value.detail

    def test_sets_empty_full_name_when_not_provided(self, mock_db):
        data = UserCreate(email="new@test.com", password="ValidP@ssword123")
        mock_db.query().filter().first.return_value = None
        user = register_user(data, mock_db)
        assert user.full_name == ""


class TestAuthenticateUser:
    def test_authenticates_valid_credentials(self, mock_db, sample_user):
        sample_user.hashed_password = hash_password("ValidP@ssword123")
        mock_db.query().filter().first.return_value = sample_user
        user = authenticate_user(sample_user.email, "ValidP@ssword123", mock_db)
        assert user.id == sample_user.id

    def test_rejects_wrong_password(self, mock_db, sample_user):
        sample_user.hashed_password = hash_password("ValidP@ssword123")
        mock_db.query().filter().first.return_value = sample_user
        with pytest.raises(HTTPException) as exc:
            authenticate_user(sample_user.email, "WrongP@ss1", mock_db)
        assert exc.value.status_code == 401

    def test_rejects_nonexistent_user(self, mock_db):
        mock_db.query().filter().first.return_value = None
        with pytest.raises(HTTPException) as exc:
            authenticate_user("noone@test.com", "AnyP@ss1", mock_db)
        assert exc.value.status_code == 401


class TestPasswordReset:
    def test_create_token_succeeds(self, mock_db, sample_user):
        token = create_password_reset_token(sample_user, mock_db)
        assert token is not None
        assert len(token) > 10
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_reset_with_valid_token(self, mock_db, sample_user, sample_reset_token):
        mock_db.query().filter().first.side_effect = [sample_reset_token, sample_user]
        result = reset_password("valid-reset-token-123", "NewV@lidPass123", mock_db)
        assert result.id == sample_user.id
        assert sample_reset_token.used is True
        mock_db.commit.assert_called_once()

    def test_reset_with_expired_token(self, mock_db, sample_user):
        expired = PasswordResetToken(
            id="expired-id",
            user_id=sample_user.id,
            token="expired-token",
            expires_at=datetime.utcnow() - timedelta(hours=2),
            used=False,
        )
        mock_db.query().filter().first.return_value = None
        with pytest.raises(HTTPException) as exc:
            reset_password("expired-token", "NewV@lidPass123", mock_db)
        assert exc.value.status_code == 400
        assert "Invalid or expired" in exc.value.detail

    def test_reset_with_used_token(self, mock_db, sample_user):
        used_token = PasswordResetToken(
            id="used-id",
            user_id=sample_user.id,
            token="used-token",
            expires_at=datetime.utcnow() + timedelta(hours=1),
            used=True,
        )
        mock_db.query().filter().first.return_value = None
        with pytest.raises(HTTPException) as exc:
            reset_password("used-token", "NewV@lidPass123", mock_db)
        assert exc.value.status_code == 400

    def test_reset_with_missing_user(self, mock_db, sample_reset_token):
        mock_db.query().filter().first.side_effect = [sample_reset_token, None]
        with pytest.raises(HTTPException) as exc:
            reset_password("valid-reset-token-123", "NewV@lidPass123", mock_db)
        assert exc.value.status_code == 400
        assert "User not found" in exc.value.detail


class TestSendResetEmail:
    @patch("resend.Emails.send")
    def test_sends_email_successfully(self, mock_send, monkeypatch):
        monkeypatch.setattr("app.auth.settings.RESEND_API_KEY", "re_test")
        monkeypatch.setattr("app.auth.settings.FRONTEND_URL", "http://localhost:5173")
        monkeypatch.setattr("app.auth.settings.SMTP_FROM_EMAIL", "noreply@test.com")
        mock_send.return_value = {"id": "email-123"}
        result = send_reset_email("user@test.com", "reset-token-123")
        assert result is True
        mock_send.assert_called_once()

    @patch("resend.Emails.send")
    def test_handles_api_error(self, mock_send, monkeypatch):
        monkeypatch.setattr("app.auth.settings.RESEND_API_KEY", "re_test")
        monkeypatch.setattr("app.auth.settings.FRONTEND_URL", "http://localhost:5173")
        monkeypatch.setattr("app.auth.settings.SMTP_FROM_EMAIL", "noreply@test.com")
        mock_send.side_effect = Exception("API error")
        result = send_reset_email("user@test.com", "reset-token-123")
        assert result is False

    @patch("resend.Emails.send")
    def test_handles_exception(self, mock_send, monkeypatch):
        monkeypatch.setattr("app.auth.settings.RESEND_API_KEY", "re_test")
        monkeypatch.setattr("app.auth.settings.FRONTEND_URL", "http://localhost:5173")
        monkeypatch.setattr("app.auth.settings.SMTP_FROM_EMAIL", "noreply@test.com")
        mock_send.side_effect = Exception("Network error")
        result = send_reset_email("user@test.com", "reset-token-123")
        assert result is False

    def test_returns_false_when_not_configured(self, monkeypatch):
        monkeypatch.setattr("app.auth.settings.RESEND_API_KEY", "")
        monkeypatch.setattr("app.auth.settings.POSTMARK_API_TOKEN", "")
        monkeypatch.setattr("app.auth.settings.SMTP_PASSWORD", "")
        result = send_reset_email("user@test.com", "token")
        assert result is False


class TestPydanticModels:
    def test_user_create_defaults(self):
        data = UserCreate(email="a@b.com", password="TestP@ss1234")
        assert data.full_name == ""

    def test_forgot_password_request(self):
        data = ForgotPasswordRequest(email="a@b.com")
        assert data.email == "a@b.com"

    def test_reset_password_request(self):
        data = ResetPasswordRequest(token="abc", new_password="NewP@ss1234")
        assert data.token == "abc"
        assert data.new_password == "NewP@ss1234"
