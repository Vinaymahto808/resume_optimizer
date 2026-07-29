"""
Credential Vault — Fernet-encrypted credential storage for job portal logins.

Stores email/password, OAuth tokens, API keys, and cookies encrypted at rest.
Only decrypts when actively needed for browser automation.
"""

import os
import json
import base64
import hashlib
import logging
from datetime import datetime
from typing import Optional
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User
from app.models_extended import UserCredential, CredentialType, JobPortal

logger = logging.getLogger(__name__)


def _derive_vault_key() -> bytes:
    secret = settings.SECRET_KEY or settings.GROQ_API_KEY or "dev-fallback-key-change-in-prod"
    derived = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(derived)


class CredentialVault:
    def __init__(self, db: Session):
        self.db = db
        self._fernet = Fernet(_derive_vault_key())

    def store(
        self,
        user_id: str,
        portal: JobPortal,
        credentials: dict,
        credential_type: CredentialType = CredentialType.EMAIL_PASSWORD,
        label: str = "",
        expires_at: Optional[datetime] = None,
    ) -> UserCredential:
        plaintext = json.dumps(credentials)
        encrypted = self._fernet.encrypt(plaintext.encode()).decode()

        existing = (
            self.db.query(UserCredential)
            .filter(
                UserCredential.user_id == user_id,
                UserCredential.portal == portal,
                UserCredential.label == label,
            )
            .first()
        )

        if existing:
            existing.encrypted_data = encrypted
            existing.credential_type = credential_type
            existing.expires_at = expires_at
            existing.is_active = True
            self.db.commit()
            self.db.refresh(existing)
            logger.info("Updated credential %s for user %s portal %s", existing.id, user_id, portal.value)
            return existing

        cred = UserCredential(
            user_id=user_id,
            portal=portal,
            credential_type=credential_type,
            encrypted_data=encrypted,
            label=label or f"{portal.value}_default",
            expires_at=expires_at,
        )
        self.db.add(cred)
        self.db.commit()
        self.db.refresh(cred)
        logger.info("Stored credential %s for user %s portal %s", cred.id, user_id, portal.value)
        return cred

    def retrieve(self, credential_id: str, user_id: str) -> Optional[dict]:
        cred = (
            self.db.query(UserCredential)
            .filter(
                UserCredential.id == credential_id,
                UserCredential.user_id == user_id,
                UserCredential.is_active == True,
            )
            .first()
        )
        if not cred:
            return None

        if cred.expires_at and cred.expires_at < datetime.utcnow():
            logger.warning("Credential %s expired", credential_id)
            return None

        try:
            decrypted = self._fernet.decrypt(cred.encrypted_data.encode()).decode()
            creds = json.loads(decrypted)

            cred.last_used_at = datetime.utcnow()
            self.db.commit()

            return {
                "id": cred.id,
                "portal": cred.portal.value,
                "credential_type": cred.credential_type.value,
                "label": cred.label,
                "credentials": creds,
            }
        except Exception as e:
            logger.error("Failed to decrypt credential %s: %s", credential_id, e)
            return None

    def get_for_portal(self, user_id: str, portal: JobPortal,
                       label: str = "") -> Optional[dict]:
        query = (
            self.db.query(UserCredential)
            .filter(
                UserCredential.user_id == user_id,
                UserCredential.portal == portal,
                UserCredential.is_active == True,
            )
        )
        if label:
            query = query.filter(UserCredential.label == label)
        cred = query.first()
        if not cred:
            return None
        return self.retrieve(cred.id, user_id)

    def list_credentials(self, user_id: str) -> list[dict]:
        creds = (
            self.db.query(UserCredential)
            .filter(UserCredential.user_id == user_id, UserCredential.is_active == True)
            .all()
        )
        return [
            {
                "id": c.id,
                "portal": c.portal.value,
                "credential_type": c.credential_type.value,
                "label": c.label,
                "has_data": bool(c.encrypted_data),
                "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
                "expires_at": c.expires_at.isoformat() if c.expires_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in creds
        ]

    def revoke(self, credential_id: str, user_id: str) -> bool:
        cred = (
            self.db.query(UserCredential)
            .filter(
                UserCredential.id == credential_id,
                UserCredential.user_id == user_id,
            )
            .first()
        )
        if not cred:
            return False
        cred.is_active = False
        self.db.commit()
        logger.info("Revoked credential %s", credential_id)
        return True

    def delete(self, credential_id: str, user_id: str) -> bool:
        cred = (
            self.db.query(UserCredential)
            .filter(
                UserCredential.id == credential_id,
                UserCredential.user_id == user_id,
            )
            .first()
        )
        if not cred:
            return False
        self.db.delete(cred)
        self.db.commit()
        logger.info("Deleted credential %s", credential_id)
        return True
