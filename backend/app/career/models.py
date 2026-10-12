import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, LargeBinary, String, Text, UniqueConstraint, text,
)

from sqlalchemy.orm import deferred

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class PlatformJob(Base):
    """A normalized, de-duplicated job posting from any connector."""
    __tablename__ = "platform_jobs"

    id = Column(String, primary_key=True, default=_uuid)
    fingerprint = Column(String, unique=True, index=True, nullable=False)
    source = Column(String, nullable=False)          # greenhouse, lever, remotive, seed, ...
    source_id = Column(String, default="")
    title = Column(String, nullable=False)
    company = Column(String, nullable=False, index=True)
    location = Column(String, default="")
    remote = Column(Boolean, default=False)
    url = Column(String, default="")
    description = Column(Text, default="")
    skills = Column(Text, default="[]")              # JSON list
    seniority = Column(String, default="mid")
    employment_type = Column(String, default="full-time")
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    ats_platform = Column(String, default="")
    h1b_sponsor = Column(Boolean, default=False)
    h1b_signal = Column(String, default="unknown")   # history | stated | denied | unknown
    verified = Column(Boolean, default=True)
    verification_flags = Column(Text, default="[]")  # JSON list
    embedding = Column(Text, default="")             # JSON list[float]
    posted_at = Column(DateTime, default=datetime.utcnow, index=True)
    ingested_at = Column(DateTime, default=datetime.utcnow, index=True)
    active = Column(Boolean, default=True)


class SeekerProfile(Base):
    __tablename__ = "platform_profiles"

    client_id = Column(String, primary_key=True)
    full_name = Column(String, default="")
    email = Column(String, default="")
    phone = Column(String, default="")
    location = Column(String, default="")
    headline = Column(String, default="")
    linkedin = Column(String, default="")
    github = Column(String, default="")
    portfolio = Column(String, default="")
    school = Column(String, default="")
    resume_text = Column(Text, default="")
    resume_embedding = Column(Text, default="")
    preferences = Column(Text, default="{}")         # JSON: roles, locations, remote, min_salary, needs_sponsorship, ...
    open_to_recruiters = Column(Boolean, default=False)
    plan = Column(String, default="free")            # free | turbo
    plan_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JobDecision(Base):
    """Swipe result for a job: like (save) or pass."""
    __tablename__ = "platform_job_decisions"
    __table_args__ = (UniqueConstraint("client_id", "job_id", name="uq_decision_client_job"),)

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    job_id = Column(String, ForeignKey("platform_jobs.id"), nullable=False)
    decision = Column(String, nullable=False)        # like | pass
    created_at = Column(DateTime, default=datetime.utcnow)


class TrackedApplication(Base):
    __tablename__ = "platform_applications"

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    job_id = Column(String, ForeignKey("platform_jobs.id"), nullable=True)
    role = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, default="")
    url = Column(String, default="")
    ats = Column(String, default="")
    stage = Column(String, default="Wishlist")       # Wishlist | Applied | Screen | Technical | Offer | Rejected
    match_score = Column(Integer, default=0)
    salary_range = Column(String, default="")
    notes = Column(Text, default="")
    tailored_resume = Column(Text, default="")
    cover_letter = Column(Text, default="")
    autofill_packet = Column(Text, default="")       # JSON prepared by the auto-apply agent
    applied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JobAlert(Base):
    __tablename__ = "platform_alerts"

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    name = Column(String, default="My alert")
    query = Column(String, default="")
    location = Column(String, default="")
    remote_only = Column(Boolean, default=False)
    h1b_only = Column(Boolean, default=False)
    min_match = Column(Integer, default=60)
    email = Column(String, default="")
    last_checked_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)


class AlertHit(Base):
    __tablename__ = "platform_alert_hits"
    __table_args__ = (UniqueConstraint("alert_id", "job_id", name="uq_alert_job"),)

    id = Column(String, primary_key=True, default=_uuid)
    alert_id = Column(String, ForeignKey("platform_alerts.id"), index=True, nullable=False)
    client_id = Column(String, index=True, nullable=False)
    job_id = Column(String, ForeignKey("platform_jobs.id"), nullable=False)
    match_score = Column(Integer, default=0)
    seen = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Connection(Base):
    """A person the seeker knows (imported from a LinkedIn export or added by hand)."""
    __tablename__ = "platform_connections"

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    company = Column(String, default="", index=True)
    position = Column(String, default="")
    email = Column(String, default="")
    profile_url = Column(String, default="")
    school = Column(String, default="")
    relationship = Column(String, default="connection")  # connection | alumni | colleague
    created_at = Column(DateTime, default=datetime.utcnow)


class CreditUsage(Base):
    __tablename__ = "platform_credit_usage"

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    action = Column(String, nullable=False)
    cost = Column(Integer, default=1)
    day = Column(String, index=True, nullable=False)  # YYYY-MM-DD (UTC)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatMessage(Base):
    __tablename__ = "platform_chat_messages"

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)            # user | assistant
    content = Column(Text, nullable=False)
    tool_calls = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)


class RecruiterRole(Base):
    __tablename__ = "platform_recruiter_roles"

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    company = Column(String, default="")
    location = Column(String, default="")
    description = Column(Text, default="")
    skills = Column(Text, default="[]")
    status = Column(String, default="open")
    created_at = Column(DateTime, default=datetime.utcnow)


class Candidate(Base):
    __tablename__ = "platform_candidates"

    id = Column(String, primary_key=True, default=_uuid)
    role_id = Column(String, ForeignKey("platform_recruiter_roles.id"), index=True, nullable=False)
    source = Column(String, default="upload")        # upload | platform
    seeker_client_id = Column(String, default="")
    name = Column(String, default="")
    email = Column(String, default="")
    phone = Column(String, default="")
    resume_text = Column(Text, default="")
    match_score = Column(Float, default=0)
    match_detail = Column(Text, default="{}")
    fraud_score = Column(Float, default=0)
    fraud_verdict = Column(String, default="unchecked")  # verified | review | high_risk | unchecked
    fraud_flags = Column(Text, default="[]")
    status = Column(String, default="sourced")       # sourced | contacted | interviewing | rejected | hired
    outreach_message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class PaymentRequest(Base):
    """Proof of a manual UPI payment, waiting for an admin to check it against the bank app."""
    __tablename__ = "platform_payment_requests"
    __table_args__ = (
        # At most one pending request per client, enforced by the database as well as the route.
        Index("uq_payment_one_pending", "client_id", unique=True,
              sqlite_where=text("status = 'pending'"), postgresql_where=text("status = 'pending'")),
    )

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    plan_period = Column(String, nullable=False)     # monthly | quarterly | annual
    amount_inr = Column(Integer, nullable=False)
    reference_code = Column(String, nullable=False, index=True)
    utr = Column(String, unique=True, nullable=False)
    screenshot_path = Column(String, nullable=False)  # file name (its extension gives the image type)
    # The image itself. Stored in the database because serverless disks (Vercel /tmp) don't persist;
    # older rows may only have a file under uploads/payments/.
    screenshot_data = deferred(Column(LargeBinary, nullable=True))  # loaded only when the image is opened
    email = Column(String, nullable=False)
    status = Column(String, default="pending", index=True)  # pending | approved | rejected
    reject_reason = Column(Text, default="")
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class UpiCredit(Base):
    """A UPI credit read from a bank SMS that the payee's phone forwarded to the SMS webhook.
    A pending PaymentRequest with the same UTR and at least this amount is approved automatically."""
    __tablename__ = "platform_upi_credits"

    id = Column(String, primary_key=True, default=_uuid)
    utr = Column(String, unique=True, nullable=False)
    amount_paise = Column(Integer, nullable=False)
    sender = Column(String, default="")
    message = Column(Text, default="")
    request_id = Column(String, nullable=True, index=True)   # PaymentRequest it approved, once matched
    received_at = Column(DateTime, default=datetime.utcnow, index=True)


class AgentSettings(Base):
    """Background Agent Mode rules for one seeker."""
    __tablename__ = "platform_agent_settings"

    client_id = Column(String, primary_key=True)
    enabled = Column(Boolean, default=False)
    min_match = Column(Integer, default=75)
    roles = Column(Text, default="[]")               # JSON list of title keywords
    locations = Column(Text, default="[]")           # JSON list of location substrings
    remote_only = Column(Boolean, default=False)
    h1b_only = Column(Boolean, default=False)
    daily_cap = Column(Integer, default=10)
    auto_submit = Column(Boolean, default=False)     # explicit opt-in; otherwise prepare and notify
    last_run_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgentTask(Base):
    """One job the background agent picked up: queued -> prepared -> needs_review -> submitted | failed."""
    __tablename__ = "platform_agent_tasks"
    __table_args__ = (UniqueConstraint("client_id", "job_id", name="uq_agent_client_job"),)

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    job_id = Column(String, ForeignKey("platform_jobs.id"), nullable=False)
    application_id = Column(String, ForeignKey("platform_applications.id"), nullable=True)
    status = Column(String, default="queued", index=True)
    match_score = Column(Integer, default=0)
    submit_channel = Column(String, default="")      # "" (user submits) | extension
    reason = Column(String, default="")              # why it needs review or failed
    log = Column(Text, default="[]")                 # JSON list of {at, step, status, detail}
    day = Column(String, index=True, nullable=False)  # YYYY-MM-DD (UTC) the task was queued
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExtensionToken(Base):
    """Revocable pairing code for the Chrome extension. Only the SHA-256 of the token is stored."""
    __tablename__ = "platform_extension_tokens"

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, index=True, nullable=False)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    hint = Column(String, default="")                # last 4 chars, to recognise it in the UI
    revoked = Column(Boolean, default=False)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class StructuredResume(Base):
    """The resume builder's structured resume (JSON matching the frontend ResumeData type)."""
    __tablename__ = "platform_structured_resumes"

    client_id = Column(String, primary_key=True)
    data = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CompanyBoard(Base):
    """A company careers board to crawl (DB-driven list; env lists seed it on first run)."""
    __tablename__ = "platform_company_boards"
    __table_args__ = (UniqueConstraint("ats", "slug", name="uq_board_ats_slug"),)

    id = Column(String, primary_key=True, default=_uuid)
    ats = Column(String, nullable=False, index=True)  # greenhouse | lever | ashby | workday | smartrecruiters
    slug = Column(String, nullable=False)             # board token / company id; workday: "<host>/<tenant>/<site>"
    name = Column(String, default="")                 # display name override
    active = Column(Boolean, default=True)
    source = Column(String, default="admin")          # admin | env | default
    last_crawled_at = Column(DateTime, nullable=True)
    last_status = Column(String, default="")          # ok | error: <reason>
    last_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AdminLoginAttempt(Base):
    """Failed admin sign-ins, for per-IP lockout. Kept in the database because serverless instances
    don't share memory."""
    __tablename__ = "platform_admin_login_attempts"

    id = Column(String, primary_key=True, default=_uuid)
    ip = Column(String, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
