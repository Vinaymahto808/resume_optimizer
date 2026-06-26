import re
import secrets
import logging
import httpx
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.config import settings
from app.database import get_db
from app.models import User, PasswordResetToken, RefreshToken

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str = ""


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: str, db: Session) -> str:
    raw = secrets.token_urlsafe(48)
    token_hash = _hash_token(raw)
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expire,
    )
    db.add(rt)
    db.commit()
    return raw


def _hash_token(token: str) -> str:
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()


def rotate_refresh_token(old_raw: str, db: Session) -> tuple[str, str]:
    token_hash = _hash_token(old_raw)
    record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == token_hash,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.utcnow(),
    ).first()
    if not record:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    record.revoked = True
    user_id = record.user_id
    new_access = create_access_token({"sub": user_id})
    new_refresh = create_refresh_token(user_id, db)
    db.commit()
    return new_access, new_refresh


def revoke_all_user_tokens(user_id: str, db: Session):
    records = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked == False,
    ).all()
    for r in records:
        r.revoked = True
    db.commit()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def register_user(data: UserCreate, db: Session) -> User:
    pw = data.password
    issues = []
    if len(pw) < 12:
        issues.append("at least 12 characters")
    if not re.search(r"[A-Z]", pw):
        issues.append("an uppercase letter")
    if not re.search(r"[a-z]", pw):
        issues.append("a lowercase letter")
    if not re.search(r"[0-9]", pw):
        issues.append("a number")
    if not re.search(r"[^A-Za-z0-9]", pw):
        issues.append("a special character")
    if re.search(r"\s", pw):
        issues.append("no spaces")
    if issues:
        raise HTTPException(status_code=400, detail="Password must include " + ", ".join(issues) + ".")
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name or "",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(email: str, password: str, db: Session) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def create_password_reset_token(user: User, db: Session) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=1)
    reset = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=expires_at,
    )
    db.add(reset)
    db.commit()
    return token


def send_reset_email(to_email: str, token: str) -> bool:
    api_token = settings.POSTMARK_API_TOKEN or settings.SMTP_PASSWORD
    if not api_token:
        logger.warning("Postmark not configured — cannot send reset email")
        return False

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    html = f"""\
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">
<tr><td style="background:#ffffff;border-radius:12px;padding:40px 32px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="text-align:center;padding-bottom:8px">
<span style="font-size:22px;font-weight:700;color:#1f2937">Profile<span style="color:#10b981">Optimizer</span></span>
</td></tr>
<tr><td style="text-align:center;padding-bottom:4px">
<h1 style="font-size:22px;font-weight:700;color:#1f2937;margin:0 0 8px">Reset your password</h1>
<p style="font-size:14px;color:#475569;margin:0 0 24px;line-height:1.5">
You requested a password reset. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
</p>
</td></tr>
<tr><td style="text-align:center;padding-bottom:24px">
<a href="{reset_link}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#10b981,#34d399);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">Reset Password</a>
</td></tr>
<tr><td style="text-align:center">
<p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.5">
If you didn't request this, you can safely ignore this email.<br>
Button not working? Paste this in your browser:<br>
<span style="color:#475569;word-break:break-all">{reset_link}</span>
</p>
</td></tr>
</table>
</td></tr>
<tr><td style="text-align:center;padding-top:16px">
<p style="font-size:11px;color:#94a3b8;margin:0">&copy; ProfileOptimizer &mdash; ATS Resume Checker</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""

    try:
        resp = httpx.post(
            "https://api.postmarkapp.com/email",
            headers={
                "X-Postmark-Server-Token": api_token,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "From": settings.SMTP_FROM_EMAIL,
                "To": to_email,
                "Subject": "Reset your ProfileOptimizer password",
                "HtmlBody": html,
                "TextBody": f"Reset your password\n\nClick: {reset_link}",
                "MessageStream": "outbound",
            },
            timeout=15,
        )
        if resp.is_success:
            return True
        logger.error("Postmark error for %s: %s %s", to_email, resp.status_code, resp.text)
        return False
    except Exception as e:
        logger.exception("Postmark exception for %s", to_email)
        return False


def reset_password(token: str, new_password: str, db: Session) -> User:
    reset = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token,
        PasswordResetToken.used == False,
        PasswordResetToken.expires_at > datetime.utcnow(),
    ).first()
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    user.hashed_password = hash_password(new_password)
    reset.used = True
    db.commit()
    return user
