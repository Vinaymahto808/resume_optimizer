import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User, Subscription, PlanTier, SubscriptionStatus
from app.auth import (
    register_user, authenticate_user, create_access_token,
    get_current_user, UserCreate, UpdateProfileRequest,
    ChangePasswordRequest, ForgotPasswordRequest,
    ResetPasswordRequest, create_password_reset_token,
    send_reset_email, reset_password, hash_password, verify_password,
)
from app.services.auth_service import create_refresh_token, rotate_refresh_token

logger = logging.getLogger(__name__)
router = APIRouter(tags=["auth"])


def _user_with_sub(user: User, db: Session) -> dict:
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "plan": sub.plan.value if sub and sub.plan else PlanTier.FREE.value,
        "subscription_status": sub.status.value if sub and sub.status else SubscriptionStatus.ACTIVE.value,
    }


@router.post("/api/auth/register")
def register(data: UserCreate, db: Session = Depends(get_db)):
    user = register_user(data, db)
    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token(user.id, db)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": _user_with_sub(user, db),
    }


@router.post("/api/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form.username, form.password, db)
    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token(user.id, db)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": _user_with_sub(user, db),
    }


@router.post("/api/auth/refresh")
def refresh_token_endpoint(refresh_token: str, db: Session = Depends(get_db)):
    new_access, new_refresh = rotate_refresh_token(refresh_token, db)
    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
    }


@router.get("/api/auth/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _user_with_sub(user, db)


@router.put("/api/auth/me")
def update_profile(data: UpdateProfileRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.full_name = data.full_name
    db.commit()
    db.refresh(user)
    return _user_with_sub(user, db)


@router.post("/api/auth/change-password")
def change_password(data: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 12:
        raise HTTPException(status_code=400, detail="New password must be at least 12 characters")
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


@router.post("/api/auth/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    extra = {}
    if user:
        token = create_password_reset_token(user, db)
        ok = send_reset_email(user.email, token)
        extra["dev_token"] = token
        extra["dev_link"] = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        if not ok:
            logger.error("Failed to send reset email to %s", data.email)
    return {"message": "If that email is registered, a reset link has been sent.", **extra}


@router.post("/api/auth/reset-password")
def reset_password_endpoint(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = reset_password(data.token, data.new_password, db)
    return {"message": "Password reset successfully"}
