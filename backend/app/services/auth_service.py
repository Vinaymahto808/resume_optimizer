import secrets
import logging
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models import RefreshToken

logger = logging.getLogger(__name__)


def _hash_token(token: str) -> str:
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()


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


def rotate_refresh_token(old_raw: str, db: Session) -> tuple[str, str]:
    from app.auth import create_access_token

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
