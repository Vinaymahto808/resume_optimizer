"""Who is calling /api/career.

Three ways to identify, checked in this order:
1. ``Authorization: Bearer <JWT>`` from the main app's login: the career profile is ``u_<user id>``.
2. ``X-Extension-Token: pox_...``: a revocable pairing token issued to a profile for the Chrome extension.
3. ``X-Client-Id``: an anonymous per-browser id (prototype UI and older extension installs).

``u_`` ids are reserved for accounts, so an anonymous caller can't claim a user's profile just by knowing
their user id."""
import hashlib
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.career import vectors
from app.career.models import ExtensionToken, SeekerProfile
from app.config import settings
from app.database import get_db
from app.models import User

_CLIENT_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
USER_PREFIX = "u_"
EXTENSION_TOKEN_PREFIX = "pox_"


@dataclass
class Identity:
    client_id: str
    user: Optional[User] = None
    via: str = "client_id"   # jwt | extension | client_id


def user_client_id(user: User) -> str:
    return f"{USER_PREFIX}{user.id}"


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def user_from_bearer(authorization: Optional[str], db: Session) -> Optional[User]:
    """Return the user for a Bearer JWT, None when no Authorization header was sent.
    A header that is present but invalid is an error, never a silent fallback to anonymous."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Invalid Authorization header.")
    try:
        payload = jwt.decode(token.strip(), settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Your session has expired. Please log in again.")
    user_id = payload.get("sub")
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


def resolve_identity(
    authorization: Optional[str] = Header(default=None),
    x_extension_token: str = Header(default="", alias="X-Extension-Token"),
    x_client_id: str = Header(default="", alias="X-Client-Id"),
    db: Session = Depends(get_db),
) -> Identity:
    user = user_from_bearer(authorization, db)
    if user is not None:
        return Identity(client_id=user_client_id(user), user=user, via="jwt")

    if x_extension_token:
        row = db.query(ExtensionToken).filter(ExtensionToken.token_hash == hash_token(x_extension_token),
                                              ExtensionToken.revoked.is_(False)).first()
        if row is None:
            raise HTTPException(status_code=401, detail="This pairing code was revoked or is invalid. Pair the extension again.")
        if not row.last_used_at or (datetime.utcnow() - row.last_used_at).total_seconds() > 300:
            row.last_used_at = datetime.utcnow()
            db.commit()
        return Identity(client_id=row.client_id, via="extension")

    if not _CLIENT_ID_RE.match(x_client_id or ""):
        raise HTTPException(status_code=400, detail="Missing or invalid X-Client-Id header.")
    if x_client_id.startswith(USER_PREFIX):
        raise HTTPException(status_code=401, detail="Log in to use this account.")
    return Identity(client_id=x_client_id)


def client_id_header(identity: Identity = Depends(resolve_identity)) -> str:
    return identity.client_id


def get_profile(identity: Identity = Depends(resolve_identity), db: Session = Depends(get_db)) -> SeekerProfile:
    profile = db.get(SeekerProfile, identity.client_id)
    if profile is None:
        # A fresh browser fires several requests at once; only one insert wins.
        seed = {}
        if identity.user is not None:
            seed = {"full_name": identity.user.full_name or "", "email": identity.user.email or ""}
        try:
            db.add(SeekerProfile(client_id=identity.client_id, **seed))
            db.commit()
        except IntegrityError:
            db.rollback()
        profile = db.get(SeekerProfile, identity.client_id, populate_existing=True)
    return profile


def set_resume(profile: SeekerProfile, resume_text: str) -> None:
    resume_text = (resume_text or "").strip()
    if resume_text == (profile.resume_text or ""):
        return
    profile.resume_text = resume_text
    profile.resume_embedding = vectors.dumps(vectors.embed(resume_text)) if resume_text else ""
