"""
Extended database models for job application automation.

Adds: JobApplication, ApplicationEvent, UserCredential, PromptTemplateRecord,
LLMUsageLog — all wired into the existing SQLAlchemy Base.
"""

import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, Enum as SAEnum, JSON, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database import Base


class ApplicationStatus(str, enum.Enum):
    DRAFT = "draft"
    TAILORED = "tailored"
    QUEUED = "queued"
    APPLYING = "applying"
    APPLIED = "applied"
    SCREENING = "screening"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    FAILED = "failed"


class JobPortal(str, enum.Enum):
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    NAUKRI = "naukri"
    GLASSDOOR = "glassdoor"
    WELLFOUND = "wellfound"
    DICE = "dice"
    CUTSHORT = "cutshort"
    GENERIC = "generic"


class CredentialType(str, enum.Enum):
    EMAIL_PASSWORD = "email_password"
    OAUTH_TOKEN = "oauth_token"
    API_KEY = "api_key"
    COOKIES = "cookies"


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    resume_id = Column(String, ForeignKey("resumes.id"), nullable=True)

    job_title = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    job_url = Column(String, nullable=True)
    job_description = Column(Text, nullable=True)
    portal = Column(SAEnum(JobPortal), default=JobPortal.GENERIC)

    status = Column(SAEnum(ApplicationStatus), default=ApplicationStatus.DRAFT, index=True)
    ats_match_score = Column(Float, nullable=True)

    tailored_resume_text = Column(Text, nullable=True)
    tailored_cover_letter = Column(Text, nullable=True)
    extracted_keywords = Column(JSON, default=list)

    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)

    applied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    resume = relationship("Resume")
    events = relationship("ApplicationEvent", back_populates="application",
                          order_by="ApplicationEvent.created_at")

    __table_args__ = (
        UniqueConstraint("user_id", "company_name", "job_title",
                         name="uq_user_company_job"),
    )


class ApplicationEvent(Base):
    __tablename__ = "application_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    application_id = Column(String, ForeignKey("job_applications.id"),
                            nullable=False, index=True)
    event_type = Column(String, nullable=False)
    old_status = Column(String, nullable=True)
    new_status = Column(String, nullable=True)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    application = relationship("JobApplication", back_populates="events")


class UserCredential(Base):
    __tablename__ = "user_credentials"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    portal = Column(SAEnum(JobPortal), nullable=False)
    credential_type = Column(SAEnum(CredentialType), default=CredentialType.EMAIL_PASSWORD)

    encrypted_data = Column(Text, nullable=False)
    label = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("user_id", "portal", "label",
                         name="uq_user_portal_label"),
    )


class LLMUsageLog(Base):
    __tablename__ = "llm_usage_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    prompt_category = Column(String, nullable=True)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    latency_ms = Column(Float, default=0.0)
    cached = Column(Boolean, default=False)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class BrowserSession(Base):
    __tablename__ = "browser_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    portal = Column(SAEnum(JobPortal), nullable=False)
    status = Column(String, default="active")
    proxy_used = Column(String, nullable=True)
    fingerprint_id = Column(String, nullable=True)
    pages_visited = Column(Integer, default=0)
    forms_filled = Column(Integer, default=0)
    applications_submitted = Column(Integer, default=0)
    errors = Column(JSON, default=list)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)

    user = relationship("User")
