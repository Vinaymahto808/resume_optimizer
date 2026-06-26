import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from fastapi import HTTPException
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app
from app.auth import get_current_user
from app.database import get_db
from app.paypal_integration import (
    get_access_token, create_paypal_order, capture_paypal_order,
    create_checkout, get_subscription, cancel_subscription,
    PRICES, PLAN_MAP, AMOUNT_MAP,
)
from app.models import PlanTier, SubscriptionStatus


class TestPrices:
    def test_has_three_tiers(self):
        assert len(PRICES) == 3
        tiers = {p["id"] for p in PRICES}
        assert tiers == {"free", "basic", "pro"}

    def test_plan_map(self):
        assert PLAN_MAP["price_basic_monthly"] == PlanTier.PRO
        assert PLAN_MAP["price_pro_monthly"] == PlanTier.ENTERPRISE

    def test_amount_map(self):
        assert AMOUNT_MAP["price_basic_monthly"] == "5.00"
        assert AMOUNT_MAP["price_pro_monthly"] == "10.00"


class TestGetAccessToken:
    @patch("app.paypal_integration.httpx.post")
    @patch("app.paypal_integration.settings")
    def test_returns_token(self, mock_settings, mock_post):
        mock_settings.PAYPAL_CLIENT_ID = "client-id"
        mock_settings.PAYPAL_CLIENT_SECRET = "secret"
        mock_settings.PAYPAL_MODE = "sandbox"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"access_token": "paypal-token"}
        mock_post.return_value = mock_response

        token = get_access_token()
        assert token == "paypal-token"

    @patch("app.paypal_integration.settings")
    def test_returns_none_when_not_configured(self, mock_settings):
        mock_settings.PAYPAL_CLIENT_ID = ""
        mock_settings.PAYPAL_CLIENT_SECRET = ""
        assert get_access_token() is None

    @patch("app.paypal_integration.httpx.post")
    @patch("app.paypal_integration.settings")
    def test_returns_none_on_api_error(self, mock_settings, mock_post):
        mock_settings.PAYPAL_CLIENT_ID = "client-id"
        mock_settings.PAYPAL_CLIENT_SECRET = "secret"
        mock_settings.PAYPAL_MODE = "sandbox"
        mock_post.side_effect = Exception("API error")

        assert get_access_token() is None


class TestEndpoints:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    @pytest.fixture
    def mock_user(self):
        user = MagicMock()
        user.id = "user-id"
        user.email = "test@test.com"
        return user

    @patch("app.paypal_integration.get_current_user")
    def test_get_prices(self, mock_user, client):
        response = client.get("/api/payments/prices")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

    @patch("app.paypal_integration.get_access_token")
    @patch("app.paypal_integration.httpx.post")
    def test_create_paypal_order(self, mock_post, mock_token, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        mock_token.return_value = "valid-token"
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "id": "ORDER123",
            "links": [{"rel": "payer-action", "href": "https://paypal.com/checkout"}],
        }
        mock_post.return_value = mock_response

        response = client.post(
            "/api/payments/paypal/create-order",
            json={
                "price_id": "price_basic_monthly",
                "success_url": "http://localhost:5173/success",
                "cancel_url": "http://localhost:5173/cancel",
            },
        )
        app.dependency_overrides.clear()
        assert response.status_code == 200
        assert response.json()["order_id"] == "ORDER123"

    def test_create_paypal_order_invalid_price(self, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        response = client.post(
            "/api/payments/paypal/create-order",
            json={
                "price_id": "invalid",
                "success_url": "http://localhost:5173/success",
                "cancel_url": "http://localhost:5173/cancel",
            },
        )
        app.dependency_overrides.clear()
        assert response.status_code == 400

    def test_get_subscription_exists(self, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        mock_db = MagicMock()
        mock_sub = MagicMock()
        mock_sub.plan = PlanTier.PRO
        mock_sub.status = SubscriptionStatus.ACTIVE
        mock_sub.current_period_end = MagicMock()
        mock_sub.current_period_end.isoformat.return_value = "2026-01-01T00:00:00"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_sub
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/payments/subscription")
        app.dependency_overrides.clear()
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "pro"

    def test_get_subscription_none(self, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.get("/api/payments/subscription")
        app.dependency_overrides.clear()
        assert response.status_code == 200
        data = response.json()
        assert data["plan"] == "free"

    def test_cancel_subscription(self, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        mock_db = MagicMock()
        mock_sub = MagicMock()
        mock_sub.plan = PlanTier.PRO
        mock_sub.status = SubscriptionStatus.ACTIVE
        mock_db.query.return_value.filter.return_value.first.return_value = mock_sub
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post("/api/payments/cancel")
        app.dependency_overrides.clear()
        assert response.status_code == 200
        assert response.json()["status"] == "canceled"

    def test_cancel_no_subscription(self, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post("/api/payments/cancel")
        app.dependency_overrides.clear()
        assert response.status_code == 400

    def test_create_checkout_free(self, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post(
            "/api/payments/create-checkout-session",
            json={
                "price_id": "free",
                "success_url": "http://localhost:5173/success",
                "cancel_url": "http://localhost:5173/cancel",
            },
        )
        app.dependency_overrides.clear()
        assert response.status_code == 200
        assert response.json()["url"] == "http://localhost:5173/success"

    @patch("app.paypal_integration.get_access_token")
    def test_create_checkout_pro_no_token(self, mock_token, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        mock_token.return_value = None
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = None
        app.dependency_overrides[get_db] = lambda: mock_db

        response = client.post(
            "/api/payments/create-checkout-session",
            json={
                "price_id": "price_pro_monthly",
                "success_url": "http://localhost:5173/success",
                "cancel_url": "http://localhost:5173/cancel",
            },
        )
        app.dependency_overrides.clear()
        assert response.status_code == 200
        assert response.json()["dev_bypass"] is True

    def test_create_checkout_invalid_price(self, client):
        app.dependency_overrides[get_current_user] = lambda: MagicMock(id="user-id")
        response = client.post(
            "/api/payments/create-checkout-session",
            json={
                "price_id": "invalid",
                "success_url": "http://localhost:5173/success",
                "cancel_url": "http://localhost:5173/cancel",
            },
        )
        app.dependency_overrides.clear()
        assert response.status_code == 400
