import base64
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx
from app.config import settings
from app.database import get_db
from app.models import User, Subscription, PlanTier, SubscriptionStatus
from app.auth import get_current_user

router = APIRouter(prefix="/api/payments", tags=["payments"])

PAYPAL_API = "https://api-m.sandbox.paypal.com" if settings.PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"

PLAN_MAP = {
    "price_pro_monthly": PlanTier.PRO,
    "price_enterprise_monthly": PlanTier.ENTERPRISE,
}

AMOUNT_MAP = {
    "price_pro_monthly": "10.00",
    "price_enterprise_monthly": "30.00",
}

PRICES = [
    {
        "id": "free",
        "name": "Free",
        "description": "Basic ATS scan",
        "price_id": "free",
        "amount": 0,
        "currency": "usd",
        "features": [
            "1 resume scan / month",
            "Basic ATS score",
            "5 suggestions",
        ],
    },
    {
        "id": "pro",
        "name": "Pro",
        "description": "Unlimited scans + detailed analysis",
        "price_id": "price_pro_monthly",
        "amount": 1000,
        "currency": "usd",
        "features": [
            "Unlimited resume scans",
            "Detailed ATS breakdown",
            "Keyword analysis",
            "Resume templates",
            "Priority support",
        ],
    },
    {
        "id": "enterprise",
        "name": "Enterprise",
        "description": "For teams & recruiters",
        "price_id": "price_enterprise_monthly",
        "amount": 3000,
        "currency": "usd",
        "features": [
            "Everything in Pro",
            "Bulk upload (50+)",
            "Team dashboard",
            "API access",
        ],
    },
]

class CreatePayPalOrder(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str

def get_access_token() -> str:
    auth = base64.b64encode(f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}".encode()).decode()
    resp = httpx.post(
        f"{PAYPAL_API}/v1/oauth2/token",
        headers={"Authorization": f"Basic {auth}"},
        data={"grant_type": "client_credentials"},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=500, detail="PayPal auth failed")
    return resp.json()["access_token"]

@router.post("/paypal/create-order")
def create_paypal_order(data: CreatePayPalOrder, user: User = Depends(get_current_user)):
    amount = AMOUNT_MAP.get(data.price_id)
    if not amount:
        raise HTTPException(status_code=400, detail="Invalid price")

    token = get_access_token()
    resp = httpx.post(
        f"{PAYPAL_API}/v2/checkout/orders",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "intent": "CAPTURE",
            "purchase_units": [{
                "amount": {"currency_code": "USD", "value": amount},
                "custom_id": f"{user.id}|{data.price_id}",
            }],
            "payment_source": {
                "paypal": {
                    "experience_context": {
                        "payment_method_preference": "IMMEDIATE_PAYMENT_REQUIRED",
                        "landing_page": "LOGIN",
                        "user_action": "PAY_NOW",
                        "return_url": data.success_url,
                        "cancel_url": data.cancel_url,
                    }
                }
            },
        },
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="PayPal order creation failed")

    order = resp.json()
    approval_url = next(
        (link["href"] for link in order.get("links", []) if link["rel"] == "payer-action"),
        None,
    )
    return {"order_id": order["id"], "approval_url": approval_url}

@router.post("/paypal/capture-order")
def capture_paypal_order(
    data: CreatePayPalOrder,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    token = get_access_token()
    resp = httpx.post(
        f"{PAYPAL_API}/v2/checkout/orders/{data.price_id}/capture",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="PayPal capture failed")

    capture = resp.json()
    if capture.get("status") != "COMPLETED":
        raise HTTPException(status_code=400, detail="Payment not completed")

    pu = capture["purchase_units"][0]
    custom_id = pu.get("custom_id", "")
    parts = custom_id.split("|")
    price_id = parts[1] if len(parts) == 2 else ""

    plan = PLAN_MAP.get(price_id, PlanTier.PRO)
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        sub = Subscription(user_id=user.id, plan=plan, status=SubscriptionStatus.ACTIVE)
        db.add(sub)
    else:
        sub.plan = plan
        sub.status = SubscriptionStatus.ACTIVE
    sub.current_period_end = datetime.utcnow()
    db.commit()

    return {"status": "active", "plan": plan.value}

@router.get("/prices")
def get_prices():
    return PRICES

@router.post("/create-checkout-session")
def create_checkout(
    data: CreatePayPalOrder,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.price_id == "free":
        sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
        if not sub:
            sub = Subscription(user_id=user.id, plan=PlanTier.FREE)
            db.add(sub)
        else:
            sub.plan = PlanTier.FREE
            sub.status = SubscriptionStatus.ACTIVE
        db.commit()
        return {"url": data.success_url}

    token = get_access_token()
    amount = AMOUNT_MAP.get(data.price_id)
    if not amount:
        raise HTTPException(status_code=400, detail="Invalid price")

    resp = httpx.post(
        f"{PAYPAL_API}/v2/checkout/orders",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        json={
            "intent": "CAPTURE",
            "purchase_units": [{
                "amount": {"currency_code": "USD", "value": amount},
                "custom_id": f"{user.id}|{data.price_id}",
            }],
            "payment_source": {
                "paypal": {
                    "experience_context": {
                        "payment_method_preference": "IMMEDIATE_PAYMENT_REQUIRED",
                        "landing_page": "LOGIN",
                        "user_action": "PAY_NOW",
                        "return_url": data.success_url,
                        "cancel_url": data.cancel_url,
                    }
                }
            },
        },
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="PayPal order creation failed")

    order = resp.json()
    approval_url = next(
        (link["href"] for link in order.get("links", []) if link["rel"] == "payer-action"),
        None,
    )
    return {"url": approval_url, "order_id": order["id"]}

@router.get("/subscription")
def get_subscription(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        return {"plan": "free", "status": "active"}
    return {
        "plan": sub.plan.value if sub.plan else "free",
        "status": sub.status.value if sub.status else "active",
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
    }

@router.post("/cancel")
def cancel_subscription(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub or sub.plan == PlanTier.FREE:
        raise HTTPException(status_code=400, detail="No active paid subscription")
    sub.plan = PlanTier.FREE
    sub.status = SubscriptionStatus.CANCELED
    db.commit()
    return {"status": "canceled"}

@router.post("/paypal/webhook")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    event_type = payload.get("event_type", "")
    if event_type == "PAYMENT.CAPTURE.COMPLETED":
        resource = payload.get("resource", {})
        custom_id = resource.get("custom_id", "")
        parts = custom_id.split("|")
        if len(parts) == 2:
            user_id, price_id = parts
            plan = PLAN_MAP.get(price_id, PlanTier.PRO)
            sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if not sub:
                sub = Subscription(user_id=user_id, plan=plan, status=SubscriptionStatus.ACTIVE)
                db.add(sub)
            else:
                sub.plan = plan
                sub.status = SubscriptionStatus.ACTIVE
            db.commit()
    return {"status": "ok"}
