"""Admin access and admin endpoints (users, plans, system, crawl).

An admin is a logged-in user with ``users.is_admin``. Bootstrap the first one with ``ADMIN_EMAILS`` (users
with those emails are promoted when they log in or call an admin endpoint) or with
``python -m app.career.make_admin you@example.com``. ``X-Admin-Token`` == ``ADMIN_TOKEN`` still works as a
fallback for scripts and for setups without accounts."""
import hmac
import os
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.career import plans, scheduler
from app.career.identity import user_client_id, user_from_bearer
from app.career.llm import llm_available
from app.career.models import PaymentRequest, PlatformJob, SeekerProfile, TrackedApplication
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/career/admin", tags=["career-admin"])


def bootstrap_admin_emails() -> set[str]:
    return {e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()}


def sync_bootstrap_admin(user: User, db: Session) -> None:
    """Promote users listed in ADMIN_EMAILS. Never demotes."""
    if not user.is_admin and (user.email or "").lower() in bootstrap_admin_emails():
        user.is_admin = True
        db.commit()


@dataclass
class AdminActor:
    user: Optional[User]
    via: str   # jwt | token


def require_admin(
    authorization: Optional[str] = Header(default=None),
    x_admin_token: str = Header(default="", alias="X-Admin-Token"),
    db: Session = Depends(get_db),
) -> AdminActor:
    if x_admin_token:
        expected = os.getenv("ADMIN_TOKEN", "")
        if not expected:
            raise HTTPException(status_code=503, detail="Admin token login is not configured (set ADMIN_TOKEN).")
        if not hmac.compare_digest(x_admin_token.encode(), expected.encode()):
            raise HTTPException(status_code=401, detail="Invalid admin token.")
        return AdminActor(user=None, via="token")
    user = user_from_bearer(authorization, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Admin login required.")
    sync_bootstrap_admin(user, db)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admins only.")
    return AdminActor(user=user, via="jwt")


# ------------------------------------------------------------- endpoints --

def _profile_summary(profile: Optional[SeekerProfile], db: Session) -> dict:
    if profile is None:
        return {"plan": "free", "plan_expires_at": None, "has_resume": False, "applications": 0}
    apps = db.query(func.count(TrackedApplication.id)).filter(TrackedApplication.client_id == profile.client_id).scalar()
    return {
        "plan": plans.effective_plan(profile),
        "plan_expires_at": profile.plan_expires_at.isoformat() if profile.plan_expires_at else None,
        "has_resume": bool(profile.resume_text),
        "applications": apps or 0,
    }


def _user_dict(user: User, db: Session) -> dict:
    client_id = user_client_id(user)
    return {
        "id": user.id, "email": user.email, "full_name": user.full_name, "is_admin": bool(user.is_admin),
        "created_at": user.created_at.isoformat() if user.created_at else None, "client_id": client_id,
        **_profile_summary(db.get(SeekerProfile, client_id), db),
    }


@router.get("/me")
def admin_me(actor: AdminActor = Depends(require_admin)):
    return {"is_admin": True, "via": actor.via,
            "email": actor.user.email if actor.user else None}


@router.get("/users")
def admin_users(q: str = Query("", max_length=200), limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0),
                _: AdminActor = Depends(require_admin), db: Session = Depends(get_db)):
    query = db.query(User)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(User.email.ilike(like), User.full_name.ilike(like)))
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "users": [_user_dict(u, db) for u in users]}


class UserUpdate(BaseModel):
    is_admin: bool


@router.patch("/users/{user_id}")
def admin_update_user(user_id: str, body: UserUpdate, actor: AdminActor = Depends(require_admin),
                      db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if actor.user is not None and actor.user.id == user.id and not body.is_admin:
        raise HTTPException(status_code=400, detail="You can't remove your own admin access.")
    user.is_admin = body.is_admin
    db.commit()
    return _user_dict(user, db)


class PlanOverride(BaseModel):
    plan: Literal["free", "turbo"]
    days: Optional[int] = Field(default=None, ge=1, le=3650)   # turbo: extend from now (or current expiry)
    expires_at: Optional[datetime] = None                      # turbo: exact expiry instead of days


@router.patch("/profiles/{client_id}/plan")
def admin_set_plan(client_id: str, body: PlanOverride, _: AdminActor = Depends(require_admin),
                   db: Session = Depends(get_db)):
    """Override any profile's plan: account profiles (u_<user id>) or anonymous browser ids."""
    profile = db.get(SeekerProfile, client_id)
    if profile is None:
        if not client_id.startswith("u_") or db.get(User, client_id[2:]) is None:
            raise HTTPException(status_code=404, detail="Profile not found")
        user = db.get(User, client_id[2:])
        profile = SeekerProfile(client_id=client_id, full_name=user.full_name or "", email=user.email or "")
        db.add(profile)
    if body.plan == "free":
        profile.plan, profile.plan_expires_at = "free", None
    else:
        if body.expires_at:
            expires = body.expires_at.replace(tzinfo=None)
        else:
            now = datetime.utcnow()
            base = profile.plan_expires_at if profile.plan == "turbo" and profile.plan_expires_at and profile.plan_expires_at > now else now
            expires = base + timedelta(days=body.days or 30)
        if expires <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="Expiry must be in the future.")
        profile.plan, profile.plan_expires_at = "turbo", expires
    db.commit()
    return {"client_id": client_id, **_profile_summary(profile, db)}


@router.get("/system")
def admin_system(_: AdminActor = Depends(require_admin), db: Session = Depends(get_db)):
    turbo = db.query(func.count(SeekerProfile.client_id)).filter(
        SeekerProfile.plan == "turbo",
        or_(SeekerProfile.plan_expires_at.is_(None), SeekerProfile.plan_expires_at > datetime.utcnow())).scalar()
    return {
        "users": db.query(func.count(User.id)).scalar() or 0,
        "profiles": db.query(func.count(SeekerProfile.client_id)).scalar() or 0,
        "turbo_profiles": turbo or 0,
        "jobs_active": db.query(func.count(PlatformJob.id)).filter(PlatformJob.active.is_(True)).scalar() or 0,
        "pending_payments": db.query(func.count(PaymentRequest.id)).filter(PaymentRequest.status == "pending").scalar() or 0,
        "llm": llm_available(),
        "billing_mode": plans.billing_mode(),
        "ingestion": scheduler.status(),
    }


@router.post("/ingest")
def admin_ingest(include_network: bool = True, _: AdminActor = Depends(require_admin)):
    if scheduler.status()["running"]:
        return {"started": False, "status": scheduler.status()}
    threading.Thread(target=scheduler.run_once, kwargs={"include_network": include_network}, daemon=True).start()
    return {"started": True}
