"""Username + password sign-in for the admin console, separate from user accounts.

Configure with environment variables:
    ADMIN_USERNAME        login name (default "admin")
    ADMIN_PASSWORD_HASH   bcrypt hash of the password; make one with `python -m app.career.admin_password`
    ADMIN_PASSWORD        plain password, accepted instead of the hash for local development only

A successful sign-in returns a signed session token (12 hours) that the console sends as X-Admin-Token.
The token carries a fingerprint of the password hash, so changing the password ends every session.
Failed attempts are recorded per IP; 10 failures in 15 minutes lock that IP out for 15 minutes.
"""
import hashlib
import hmac
import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

SESSION_HOURS = 12
MAX_FAILURES = 10
LOCKOUT = timedelta(minutes=15)
_SCOPE = "admin-console"
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def admin_username() -> str:
    return os.getenv("ADMIN_USERNAME", "admin").strip() or "admin"


def _password_hash() -> str:
    return os.getenv("ADMIN_PASSWORD_HASH", "").strip()


def _plain_password() -> str:
    # Never in production: a plain password in the deployment's environment is easy to leak.
    return "" if settings.RUN_ENV == "production" else os.getenv("ADMIN_PASSWORD", "")


def configured() -> bool:
    return bool(_password_hash() or _plain_password())


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def check_credentials(username: str, password: str) -> bool:
    user_ok = hmac.compare_digest(username.strip().lower().encode(), admin_username().lower().encode())
    stored = _password_hash()
    if stored:
        try:
            pass_ok = _pwd.verify(password, stored)
        except (ValueError, TypeError):   # malformed hash in the environment
            pass_ok = False
    else:
        plain = _plain_password()
        pass_ok = bool(plain) and hmac.compare_digest(password.encode(), plain.encode())
    return user_ok and pass_ok


def _fingerprint() -> str:
    source = _password_hash() or _plain_password()
    return hashlib.sha256(f"{admin_username()}|{source}".encode()).hexdigest()[:16]


def issue_session() -> dict:
    expires = datetime.utcnow() + timedelta(hours=SESSION_HOURS)
    token = jwt.encode({"sub": admin_username(), "scope": _SCOPE, "pv": _fingerprint(), "exp": expires},
                       settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {"token": token, "expires_at": expires.isoformat(), "username": admin_username()}


def verify_session(token: str) -> Optional[str]:
    """The admin username for a valid, unexpired session token from issue_session(), else None."""
    if not configured() or token.count(".") != 2:
        return None
    try:
        claims = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
    if claims.get("scope") != _SCOPE or not hmac.compare_digest(str(claims.get("pv", "")), _fingerprint()):
        return None
    return claims.get("sub")


def client_ip(forwarded_for: str, real_ip: str, fallback: str) -> str:
    """Vercel puts the caller first in X-Forwarded-For."""
    first = (forwarded_for or "").split(",")[0].strip()
    return first or (real_ip or "").strip() or fallback or "unknown"


def locked_out(db, ip: str) -> bool:
    from app.career.models import AdminLoginAttempt
    since = datetime.utcnow() - LOCKOUT
    failures = db.query(AdminLoginAttempt).filter(AdminLoginAttempt.ip == ip,
                                                   AdminLoginAttempt.created_at >= since).count()
    return failures >= MAX_FAILURES


def record_failure(db, ip: str) -> None:
    from app.career.models import AdminLoginAttempt
    db.add(AdminLoginAttempt(ip=ip))
    # Keep the table small: anything older than the lockout window no longer matters.
    db.query(AdminLoginAttempt).filter(AdminLoginAttempt.created_at < datetime.utcnow() - LOCKOUT * 4).delete()
    db.commit()


def clear_failures(db, ip: str) -> None:
    from app.career.models import AdminLoginAttempt
    db.query(AdminLoginAttempt).filter(AdminLoginAttempt.ip == ip).delete()
    db.commit()
