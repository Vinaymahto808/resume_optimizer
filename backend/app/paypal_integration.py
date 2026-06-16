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

router = APIRouter(prefix="/api/payments/paypal", tags=["paypal"])

PAYPAL_API = "https://api-m.sandbox.paypal.com" if settings.PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"

PLAN_MAP = {
    "price_pro_monthly": PlanTier.PRO,
    "price_enterprise_monthly": PlanTier.ENTERPRISE,
}

AMOUNT_MAP = {
    "price_pro_monthly": "10.00",
    "price_enterprise_monthly": "30.00",
}

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

@router.post("/create-order")
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

@router.post("/capture-order")
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

@router.post("/webhook")
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
