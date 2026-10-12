"""Free vs Turbo plans and daily credit metering."""
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func

from app.career.models import CreditUsage, JobAlert, SeekerProfile

def _price(env: str, default: float) -> float:
    try:
        return round(float(os.getenv(env, default)), 2)
    except ValueError:
        return default


def _price_inr(env: str, default: int) -> int:
    try:
        return max(1, int(float(os.getenv(env, default))))
    except ValueError:
        return default


# Turbo billing periods. Prices are overridable via env (TURBO_PRICE_MONTHLY / _QUARTERLY / _ANNUAL in USD
# for PayPal, TURBO_PRICE_INR_MONTHLY / _QUARTERLY / _ANNUAL in whole rupees for manual UPI);
# `days` is how long one payment extends the plan.
BILLING_PERIODS = {
    "monthly": {"id": "monthly", "label": "Monthly", "months": 1, "days": 30,
                "price_usd": _price("TURBO_PRICE_MONTHLY", 2.99),
                "price_inr": _price_inr("TURBO_PRICE_INR_MONTHLY", 199)},
    "quarterly": {"id": "quarterly", "label": "Quarterly", "months": 3, "days": 90,
                  "price_usd": _price("TURBO_PRICE_QUARTERLY", 6.99),
                  "price_inr": _price_inr("TURBO_PRICE_INR_QUARTERLY", 499)},
    "annual": {"id": "annual", "label": "Annual", "months": 12, "days": 365,
               "price_usd": _price("TURBO_PRICE_ANNUAL", 19.99),
               "price_inr": _price_inr("TURBO_PRICE_INR_ANNUAL", 1599)},
}
DEFAULT_PERIOD = "monthly"


def billing_options() -> list[dict]:
    """Periods with per-month price and savings vs. paying monthly."""
    upi = billing_mode() == "upi_manual"
    key = "price_inr" if upi else "price_usd"
    monthly = BILLING_PERIODS["monthly"][key]
    out = []
    for p in BILLING_PERIODS.values():
        per_month = round(p[key] / p["months"], 2)
        savings = round(100 * (1 - per_month / monthly)) if monthly else 0
        out.append({**p, "per_month_usd": round(p["price_usd"] / p["months"], 2),
                    "per_month_inr": round(p["price_inr"] / p["months"]), "savings_pct": max(0, savings)})
    return out


def extend_turbo(profile: SeekerProfile, period: str) -> None:
    """Grant Turbo for one billing period, stacking on top of a still-active expiry."""
    now = datetime.utcnow()
    base = profile.plan_expires_at if profile.plan_expires_at and profile.plan_expires_at > now else now
    profile.plan = "turbo"
    profile.plan_expires_at = base + timedelta(days=BILLING_PERIODS[period]["days"])


PLANS = {
    "free": {
        "id": "free", "name": "Free", "price_usd": 0, "daily_credits": 2, "max_alerts": 1,
        "features": ["2 AI credits per day", "Basic resume help", "Job dashboard and swipe feed",
                     "Basic job tracking", "1 daily job alert", "Chrome autofill", "Ad-supported"],
    },
    "turbo": {
        "id": "turbo", "name": "Turbo", "price_usd": BILLING_PERIODS["monthly"]["price_usd"],
        "daily_credits": None, "max_alerts": 20,
        "features": ["Unlimited AI credits and applications", "No ads", "Full AI resume tailoring",
                     "Insider Connections", "Priority deep matching", "Up to 20 job alerts",
                     "Background Agent Mode (auto-apply)"],
    },
}


def checkout_custom_id(client_id: str, period: str) -> str:
    return f"career|{client_id}|{period}"


def period_from_capture(capture: dict, client_id: str) -> Optional[str]:
    """Validate a PayPal capture for this client and return the billing period it paid for.
    Returns None when the capture is incomplete, belongs to someone else, or the amount is short."""
    if not capture or capture.get("status") != "COMPLETED":
        return None
    unit = (capture.get("purchase_units") or [{}])[0]
    parts = (unit.get("custom_id") or "").split("|")
    if len(parts) < 2 or parts[0] != "career" or parts[1] != client_id:
        return None
    period = parts[2] if len(parts) > 2 else DEFAULT_PERIOD   # orders created before periods existed
    if period not in BILLING_PERIODS:
        return None
    captures = (unit.get("payments") or {}).get("captures") or []
    if captures:
        try:
            paid = float(captures[0]["amount"]["value"])
        except (KeyError, TypeError, ValueError):
            return None
        if paid + 0.001 < BILLING_PERIODS[period]["price_usd"]:
            return None
    return period

# Credit cost per AI action. Actions not listed are free.
ACTION_COSTS = {
    "tailor_resume": 1,
    "cover_letter": 1,
    "auto_apply": 1,
    "interview_questions": 1,
    "interview_feedback": 1,
    "deep_match": 1,
    "referral_message": 1,
}

TURBO_ONLY = {"insider_connections", "agent_mode"}


def today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def effective_plan(profile: SeekerProfile) -> str:
    if profile.plan == "turbo" and (profile.plan_expires_at is None or profile.plan_expires_at > datetime.utcnow()):
        return "turbo"
    return "free"


def credits_used_today(db, client_id: str) -> int:
    used = db.query(func.coalesce(func.sum(CreditUsage.cost), 0)).filter(
        CreditUsage.client_id == client_id, CreditUsage.day == today()).scalar()
    return int(used or 0)


def plan_status(db, profile: SeekerProfile) -> dict:
    plan = PLANS[effective_plan(profile)]
    used = credits_used_today(db, profile.client_id)
    limit = plan["daily_credits"]
    alerts = db.query(func.count(JobAlert.id)).filter(JobAlert.client_id == profile.client_id).scalar() or 0
    return {
        "plan": plan["id"], "plan_name": plan["name"], "credits_used": used, "credits_limit": limit,
        "credits_remaining": None if limit is None else max(0, limit - used),
        "alerts_used": alerts, "alerts_limit": plan["max_alerts"],
        "expires_at": profile.plan_expires_at.isoformat() if profile.plan_expires_at else None,
        "billing_mode": billing_mode(),
        "payment": _latest_payment(db, profile.client_id),
    }


def _latest_payment(db, client_id: str) -> Optional[dict]:
    """The user's most recent manual UPI payment request, for the status badge on the plan card."""
    from app.career.payments import latest_request, request_dict
    req = latest_request(db, client_id)
    return request_dict(req) if req else None


def require_feature(profile: SeekerProfile, feature: str) -> None:
    if feature in TURBO_ONLY and effective_plan(profile) != "turbo":
        raise HTTPException(status_code=402, detail=f"{feature.replace('_', ' ').title()} is a Turbo feature.")


def charge(db, profile: SeekerProfile, action: str) -> None:
    """Record usage of a metered action, raising 402 when the free quota is spent.
    Call after input validation and before doing the expensive work."""
    cost = ACTION_COSTS.get(action, 0)
    if cost == 0:
        return
    plan = PLANS[effective_plan(profile)]
    if plan["daily_credits"] is not None:
        if credits_used_today(db, profile.client_id) + cost > plan["daily_credits"]:
            raise HTTPException(
                status_code=402,
                detail=f"You've used today's {plan['daily_credits']} free AI credits. "
                       "Upgrade to Turbo for unlimited use, or come back tomorrow.")
    db.add(CreditUsage(client_id=profile.client_id, action=action, cost=cost, day=today()))
    db.commit()


def refund(db, profile: SeekerProfile, action: str) -> None:
    row = db.query(CreditUsage).filter(
        CreditUsage.client_id == profile.client_id, CreditUsage.action == action, CreditUsage.day == today()
    ).order_by(CreditUsage.created_at.desc()).first()
    if row:
        db.delete(row)
        db.commit()


def billing_mode() -> str:
    """'paypal' when PayPal credentials are configured, 'upi_manual' when UPI_ID is set (pay by QR,
    admin approves), 'dev' for local testing (instant upgrade), 'disabled' in production otherwise."""
    from app.config import settings
    if settings.PAYPAL_CLIENT_ID and settings.PAYPAL_CLIENT_SECRET:
        return "paypal"
    if os.getenv("UPI_ID", "").strip():
        return "upi_manual"
    if settings.RUN_ENV != "production" or os.getenv("ALLOW_DEV_UPGRADE") == "1":
        return "dev"
    return "disabled"
