import stripe
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.config import settings
from app.database import get_db
from app.models import User, Subscription, PlanTier, SubscriptionStatus
from app.auth import get_current_user

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/payments", tags=["payments"])

class CreateCheckoutSession(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str

class PriceResponse(BaseModel):
    id: str
    name: str
    description: str
    price_id: str
    amount: int
    currency: str
    features: list[str]

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

@router.get("/prices")
def get_prices():
    return PRICES

@router.post("/create-checkout-session")
def create_checkout_session(
    data: CreateCheckoutSession,
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
        db.commit()
        return {"url": data.success_url}

    if data.price_id not in ["price_pro_monthly", "price_enterprise_monthly"]:
        raise HTTPException(status_code=400, detail="Invalid price")

    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    if not sub:
        customer = stripe.Customer.create(email=user.email)
        sub = Subscription(user_id=user.id, stripe_customer_id=customer.id, plan=PlanTier.FREE)
        db.add(sub)
        db.commit()
        db.refresh(sub)

    customer_id = sub.stripe_customer_id
    if not customer_id:
        customer = stripe.Customer.create(email=user.email)
        sub.stripe_customer_id = customer.id
        db.commit()
        customer_id = customer.id

    checkout = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": data.price_id, "quantity": 1}],
        mode="subscription",
        success_url=data.success_url,
        cancel_url=data.cancel_url,
        metadata={"user_id": user.id},
    )
    return {"url": checkout.url}

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"]["user_id"]
        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if sub:
            sub.stripe_subscription_id = session.get("subscription")
            sub.status = SubscriptionStatus.ACTIVE
            price_id = session.get("line_items", {}).get("data", [{}])[0].get("price", {}).get("id", "")
            if "enterprise" in (price_id or ""):
                sub.plan = PlanTier.ENTERPRISE
            else:
                sub.plan = PlanTier.PRO
            db.commit()

    elif event["type"] == "customer.subscription.updated":
        stripe_sub = event["data"]["object"]
        sub = db.query(Subscription).filter(
            Subscription.stripe_subscription_id == stripe_sub["id"]
        ).first()
        if sub:
            status = stripe_sub["status"]
            if status == "active":
                sub.status = SubscriptionStatus.ACTIVE
            elif status == "past_due":
                sub.status = SubscriptionStatus.PAST_DUE
            elif status == "canceled":
                sub.status = SubscriptionStatus.CANCELED
                sub.plan = PlanTier.FREE
            if stripe_sub.get("current_period_end"):
                sub.current_period_end = datetime.fromtimestamp(stripe_sub["current_period_end"])
            db.commit()

    return {"status": "ok"}

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
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")
    stripe.Subscription.modify(sub.stripe_subscription_id, cancel_at_period_end=True)
    return {"status": "canceled_at_period_end"}
