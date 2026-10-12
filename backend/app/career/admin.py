"""Admin console access and endpoints (payments, users, plans, system, crawl).

Only the admin console's own sign-in grants access: ADMIN_USERNAME + password (see ``admin_auth``), sent as
an ``X-Admin-Token`` session. User accounts never get admin access, whatever their ``users.is_admin`` says.
``X-Admin-Token`` == ``ADMIN_TOKEN`` also works, for scripts, when that variable is set."""
import hmac
import os
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.career import admin_auth, plans, scheduler
from app.career.identity import user_client_id
from app.career.llm import llm_available
from app.career.models import PaymentRequest, PlatformJob, SeekerProfile, TrackedApplication
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/career/admin", tags=["career-admin"])


@dataclass
class AdminActor:
    via: str   # password | token


def require_admin(x_admin_token: str = Header(default="", alias="X-Admin-Token")) -> AdminActor:
    if not x_admin_token:
        raise HTTPException(status_code=401, detail="Admin sign-in required.")
    if admin_auth.verify_session(x_admin_token):
        return AdminActor(via="password")
    if x_admin_token.count(".") == 2:   # a session token that's expired, forged or from an old password
        raise HTTPException(status_code=401, detail="Admin session expired. Sign in again.")
    expected = os.getenv("ADMIN_TOKEN", "")
    if not expected or not hmac.compare_digest(x_admin_token.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Admin sign-in required.")
    return AdminActor(via="token")


# ------------------------------------------------------------- endpoints --

class AdminLoginBody(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


@router.post("/login")
def admin_login(body: AdminLoginBody, request: Request, db: Session = Depends(get_db),
                x_forwarded_for: str = Header(default=""), x_real_ip: str = Header(default="")):
    if not admin_auth.configured():
        raise HTTPException(status_code=503, detail="Admin sign-in isn't set up (set ADMIN_PASSWORD_HASH).")
    ip = admin_auth.client_ip(x_forwarded_for, x_real_ip, request.client.host if request.client else "")
    if admin_auth.locked_out(db, ip):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
    if not admin_auth.check_credentials(body.username, body.password):
        admin_auth.record_failure(db, ip)
        raise HTTPException(status_code=401, detail="Wrong username or password.")
    admin_auth.clear_failures(db, ip)
    return admin_auth.issue_session()


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
        "id": user.id, "email": user.email, "full_name": user.full_name,
        "created_at": user.created_at.isoformat() if user.created_at else None, "client_id": client_id,
        **_profile_summary(db.get(SeekerProfile, client_id), db),
    }


@router.get("/me")
def admin_me(actor: AdminActor = Depends(require_admin)):
    return {"is_admin": True, "via": actor.via}


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
