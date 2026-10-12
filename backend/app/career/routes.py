import json
import os
import re
import secrets
import threading
from datetime import datetime, timedelta
from typing import Literal, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.career import (
    agent_mode, agents, alerts, autofill, connections, matching, plans, recruiter, resume_builder, scheduler, tools,
)
from app.career.identity import (
    EXTENSION_TOKEN_PREFIX, Identity, client_id_header, get_profile, hash_token, resolve_identity, set_resume,
)
from app.career.ingestion import ensure_seeded
from app.career.llm import llm_available
from app.career.models import (
    AgentTask, AlertHit, Candidate, ChatMessage, Connection, ExtensionToken, JobAlert, JobDecision, PlatformJob,
    RecruiterRole,
    SeekerProfile, TrackedApplication,
)
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/api/career", tags=["career"])

MAX_TEXT = 50_000


# ------------------------------------------------------------- helpers ----

def _job_or_404(db: Session, job_id: str) -> PlatformJob:
    job = db.get(PlatformJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


def _app_or_404(db: Session, profile: SeekerProfile, app_id: str) -> TrackedApplication:
    app = db.get(TrackedApplication, app_id)
    if not app or app.client_id != profile.client_id:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def _role_or_404(db: Session, client_id: str, role_id: str) -> RecruiterRole:
    role = db.get(RecruiterRole, role_id)
    if not role or role.client_id != client_id:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


def _candidate_or_404(db: Session, client_id: str, cand_id: str) -> tuple[Candidate, RecruiterRole]:
    cand = db.get(Candidate, cand_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand, _role_or_404(db, client_id, cand.role_id)


def _require_resume(profile: SeekerProfile, override: str = "") -> str:
    text = (override or profile.resume_text or "").strip()
    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Add your resume first (Resume review or Profile).")
    return text


class JobRef(BaseModel):
    job_id: Optional[str] = None
    job_description: str = Field(default="", max_length=MAX_TEXT)
    title: str = Field(default="", max_length=300)
    company: str = Field(default="", max_length=200)


def _job_context(db: Session, ref: JobRef) -> tuple[str, str, str, Optional[PlatformJob]]:
    if ref.job_id:
        job = _job_or_404(db, ref.job_id)
        return f"{job.title}\n{job.description}", job.title, job.company, job
    if len(ref.job_description.strip()) < 30:
        raise HTTPException(status_code=400, detail="Provide a job_id or a job description.")
    return ref.job_description, ref.title or "the role", ref.company or "the company", None


def _metered(db: Session, profile: SeekerProfile, action: str, fn):
    plans.charge(db, profile, action)
    try:
        return fn()
    except Exception:
        plans.refund(db, profile, action)
        raise


# ------------------------------------------------------- profile & plan ----

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=200)
    headline: Optional[str] = Field(default=None, max_length=300)
    linkedin: Optional[str] = Field(default=None, max_length=500)
    github: Optional[str] = Field(default=None, max_length=500)
    portfolio: Optional[str] = Field(default=None, max_length=500)
    school: Optional[str] = Field(default=None, max_length=200)
    resume_text: Optional[str] = Field(default=None, max_length=MAX_TEXT)
    preferences: Optional[dict] = None
    open_to_recruiters: Optional[bool] = None


def profile_dict(db: Session, profile: SeekerProfile) -> dict:
    return {
        "client_id": profile.client_id, "full_name": profile.full_name, "email": profile.email,
        "phone": profile.phone, "location": profile.location, "headline": profile.headline,
        "linkedin": profile.linkedin, "github": profile.github, "portfolio": profile.portfolio,
        "school": profile.school, "has_resume": bool(profile.resume_text),
        "resume_chars": len(profile.resume_text or ""), "preferences": matching.parse_prefs(profile),
        "open_to_recruiters": bool(profile.open_to_recruiters), "plan": plans.plan_status(db, profile),
    }


@router.get("/me")
def get_me(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    return profile_dict(db, profile)


@router.put("/me")
def update_me(body: ProfileUpdate, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if "resume_text" in data:
        set_resume(profile, data.pop("resume_text") or "")
    if "preferences" in data:
        merged = {**matching.parse_prefs(profile), **(data.pop("preferences") or {})}
        profile.preferences = json.dumps(merged)
    for key, value in data.items():
        setattr(profile, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    return profile_dict(db, profile)


@router.get("/plans")
def list_plans():
    return {"plans": list(plans.PLANS.values()), "billing_periods": plans.billing_options(),
            "action_costs": plans.ACTION_COSTS, "billing_mode": plans.billing_mode()}


BillingPeriod = Literal["monthly", "quarterly", "annual"]


class CheckoutRequest(BaseModel):
    period: BillingPeriod = "monthly"


class UpgradeRequest(BaseModel):
    order_id: str = Field(default="", max_length=64)
    period: BillingPeriod = "monthly"   # used in dev mode; PayPal orders carry their own period


def _paypal_api() -> str:
    return "https://api-m.sandbox.paypal.com" if settings.PAYPAL_MODE == "sandbox" else "https://api-m.paypal.com"


@router.post("/plan/checkout")
def plan_checkout(body: CheckoutRequest = CheckoutRequest(), profile: SeekerProfile = Depends(get_profile)):
    if plans.billing_mode() != "paypal":
        return {"mode": plans.billing_mode(), "approval_url": None}
    period = plans.BILLING_PERIODS[body.period]
    from app.paypal_integration import get_access_token
    token = get_access_token()
    resp = httpx.post(f"{_paypal_api()}/v2/checkout/orders", headers={"Authorization": f"Bearer {token}"}, json={
        "intent": "CAPTURE",
        "purchase_units": [{"custom_id": plans.checkout_custom_id(profile.client_id, body.period),
                            "description": f"ProfileOptimizer Turbo ({period['label'].lower()})",
                            "amount": {"currency_code": "USD", "value": f"{period['price_usd']:.2f}"}}],
        "application_context": {"return_url": f"{settings.FRONTEND_URL}/?turbo=success",
                                "cancel_url": f"{settings.FRONTEND_URL}/?turbo=cancel"},
    }, timeout=20)
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="Could not start PayPal checkout")
    order = resp.json()
    url = next((l["href"] for l in order.get("links", []) if l.get("rel") in ("approve", "payer-action")), None)
    return {"mode": "paypal", "order_id": order.get("id"), "approval_url": url}


@router.post("/plan/upgrade")
def plan_upgrade(body: UpgradeRequest, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    mode = plans.billing_mode()
    if mode == "disabled":
        raise HTTPException(status_code=503, detail="Payments are not configured.")
    if mode == "upi_manual":
        raise HTTPException(status_code=409, detail="Pay by UPI and submit your payment proof for review.")
    period = body.period
    if mode == "paypal":
        if not body.order_id:
            raise HTTPException(status_code=400, detail="order_id is required")
        from app.paypal_integration import get_access_token
        resp = httpx.post(f"{_paypal_api()}/v2/checkout/orders/{body.order_id}/capture",
                          headers={"Authorization": f"Bearer {get_access_token()}", "Content-Type": "application/json"},
                          timeout=20)
        capture = resp.json() if resp.status_code in (200, 201, 422) else {}
        period = plans.period_from_capture(capture, profile.client_id)
        if not period:
            raise HTTPException(status_code=402, detail="Payment was not completed.")
    plans.extend_turbo(profile, period)
    db.commit()
    return plans.plan_status(db, profile)


@router.post("/plan/cancel")
def plan_cancel(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    profile.plan = "free"
    profile.plan_expires_at = None
    db.commit()
    return plans.plan_status(db, profile)


@router.get("/system")
def system_status(db: Session = Depends(get_db)):
    from app.career import vectors
    return {"llm": llm_available(), "embeddings": "openai" if settings.OPENAI_API_KEY else "local-hashed",
            "vector_dim": vectors.LOCAL_DIM, "ingestion": scheduler.status(),
            "jobs": db.query(PlatformJob.id).filter(PlatformJob.active.is_(True)).count(),
            # Public landing-page counters: real numbers from the job index, never marketing figures.
            "jobs_new_today": db.query(PlatformJob.id).filter(
                PlatformJob.active.is_(True),
                PlatformJob.ingested_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)).count(),
            "jobs_h1b": db.query(PlatformJob.id).filter(PlatformJob.active.is_(True), PlatformJob.h1b_sponsor.is_(True)).count(),
            "companies": db.query(PlatformJob.company).filter(PlatformJob.active.is_(True)).distinct().count()}


# ---------------------------------------------------------------- jobs ----

@router.get("/jobs")
def list_jobs(
    query: str = Query("", max_length=200), location: str = Query("", max_length=100),
    remote_only: bool = False, h1b_only: bool = False, verified_only: bool = True, min_match: int = 0,
    feed: bool = False, posted_within_days: Optional[int] = None, sort: Literal["match", "recent"] = "match",
    seniority: Literal["", "intern", "entry", "mid", "senior", "lead"] = "",
    limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0),
    profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db),
):
    ensure_seeded(db)
    return matching.search_jobs(
        db, matching.ProfileContext(profile), query=query, location=location, remote_only=remote_only,
        h1b_only=h1b_only, verified_only=verified_only, min_match=min_match,
        exclude_decided_for=profile.client_id if feed else "", posted_within_days=posted_within_days,
        sort=sort, limit=limit, offset=offset, seniority=seniority)


@router.get("/jobs/stats")
def job_stats(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    ensure_seeded(db)
    return agents.stats_for_dashboard(db, profile)


@router.post("/jobs/ingest")
def trigger_ingest(include_network: bool = True, _: str = Depends(client_id_header)):
    if scheduler.status()["running"]:
        return {"started": False, "status": scheduler.status()}
    threading.Thread(target=scheduler.run_once, kwargs={"include_network": include_network}, daemon=True).start()
    return {"started": True}


@router.get("/jobs/ingest/status")
def ingest_status():
    return scheduler.status()


@router.get("/cron/ingest")
def cron_ingest(authorization: str = Header(default="")):
    """Serverless replacement for the background thread: Vercel Cron calls this on a schedule
    and sends `Authorization: Bearer $CRON_SECRET`. Runs inline because a serverless
    function can't keep a thread alive after the response."""
    secret = os.getenv("CRON_SECRET", "")
    if not secret or not secrets.compare_digest(authorization, f"Bearer {secret}"):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return scheduler.run_once(include_network=True)


@router.get("/jobs/{job_id}")
def job_detail(job_id: str, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    job = _job_or_404(db, job_id)
    match = matching.score_job(matching.ProfileContext(profile), job) if profile.resume_text else None
    data = matching.job_to_dict(job, match, include_description=True)
    decision = db.query(JobDecision).filter(JobDecision.client_id == profile.client_id, JobDecision.job_id == job_id).first()
    data["decision"] = decision.decision if decision else None
    tracked = db.query(TrackedApplication).filter(TrackedApplication.client_id == profile.client_id,
                                                  TrackedApplication.job_id == job_id).first()
    data["application_id"] = tracked.id if tracked else None
    return data


@router.post("/jobs/{job_id}/deep-match")
def job_deep_match(job_id: str, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    job = _job_or_404(db, job_id)
    _require_resume(profile)
    return _metered(db, profile, "deep_match", lambda: matching.deep_match(matching.ProfileContext(profile), job))


class DecisionBody(BaseModel):
    decision: Literal["like", "pass"]


@router.post("/jobs/{job_id}/decision")
def job_decision(job_id: str, body: DecisionBody, profile: SeekerProfile = Depends(get_profile),
                 db: Session = Depends(get_db)):
    job = _job_or_404(db, job_id)
    row = db.query(JobDecision).filter(JobDecision.client_id == profile.client_id, JobDecision.job_id == job_id).first()
    if row:
        row.decision = body.decision
    else:
        db.add(JobDecision(client_id=profile.client_id, job_id=job_id, decision=body.decision))
    db.commit()
    application = agents.application_dict(agents.save_job_to_tracker(db, profile, job)) if body.decision == "like" else None
    return {"decision": body.decision, "application": application}


class JobImport(BaseModel):
    """A posting the user is viewing in their own browser (LinkedIn, Naukri, Wellfound, ...), captured by the extension."""
    url: str = Field(min_length=8, max_length=2000)
    title: str = Field(min_length=2, max_length=300)
    company: str = Field(min_length=1, max_length=200)
    location: str = Field(default="", max_length=200)
    description: str = Field(default="", max_length=MAX_TEXT)
    site: str = Field(default="", max_length=60)
    salary_text: str = Field(default="", max_length=200)
    posted_at: Optional[str] = Field(default=None, max_length=40)


@router.post("/jobs/import")
def import_job(body: JobImport, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    from urllib.parse import urlparse
    from app.career.enrichment import parse_salary
    from app.career.ingestion import RawPosting, _parse_dt, clean_html, fingerprint, upsert_posting

    if urlparse(body.url).scheme not in ("http", "https"):
        raise HTTPException(status_code=422, detail="The job URL must start with http(s)://")
    site = re.sub(r"[^a-z0-9.-]", "", (body.site or urlparse(body.url).netloc).lower())[:60] or "web"
    fp = fingerprint(body.title, body.company, body.location)
    prior = db.query(PlatformJob).filter(PlatformJob.fingerprint == fp).first()
    existed, was_active = prior is not None, bool(prior and prior.active)
    smin, smax = parse_salary(body.salary_text) if body.salary_text else (None, None)
    raw = RawPosting(source=f"user:{site}", source_id=body.url[:300], title=body.title.strip(), company=body.company.strip(),
                     location=body.location.strip(), url=body.url, description=clean_html(body.description),
                     posted_at=_parse_dt(body.posted_at), salary_min=smin, salary_max=smax)
    upsert_posting(db, raw)
    job = db.query(PlatformJob).filter(PlatformJob.fingerprint == fp).first()
    # Postings captured from a page the user was viewing stay out of the shared feed; a job we already
    # crawl from a public board keeps whatever state the crawler gave it.
    job.active = was_active if existed else False
    db.commit()
    app = agents.save_job_to_tracker(db, profile, job)
    match = matching.score_job(matching.ProfileContext(profile), job) if profile.resume_text else None
    return {"job": matching.job_to_dict(job, match), "application": agents.application_dict(app), "existing": existed}


@router.delete("/jobs/decisions")
def reset_decisions(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    deleted = db.query(JobDecision).filter(JobDecision.client_id == profile.client_id,
                                           JobDecision.decision == "pass").delete()
    db.commit()
    return {"reset": deleted}


# ---------------------------------------------------- resume & AI tools ----

# ------------------------------------------------------- resume builder ----

def _structured_payload(db: Session, profile: SeekerProfile) -> dict:
    doc, source, updated = resume_builder.current(db, profile)
    return {"resume": doc.model_dump(), "source": source, "updated_at": updated.isoformat() if updated else None,
            "templates": list(resume_builder.LATEX_TEMPLATES)}


@router.get("/resume/structured")
def structured_resume_get(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    return _structured_payload(db, profile)


@router.put("/resume/structured")
def structured_resume_put(body: resume_builder.ResumeDoc, profile: SeekerProfile = Depends(get_profile),
                          db: Session = Depends(get_db)):
    resume_builder.save(db, profile, body)
    return {**_structured_payload(db, profile), "profile": profile_dict(db, profile)}


@router.post("/resume/structured/parse")
async def structured_resume_parse(file: Optional[UploadFile] = File(default=None), resume_text: str = Form(default=""),
                                  save: bool = Form(default=False), profile: SeekerProfile = Depends(get_profile),
                                  db: Session = Depends(get_db)):
    """Parse an uploaded resume (PDF/DOCX/TXT) or pasted text into the structured form. Saves only when asked."""
    text = resume_text.strip()
    if file is not None and file.filename:
        from app.resume_parser import extract_text_from_resume
        raw = await file.read()
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if len(raw) > 10 * 1024 * 1024 or ext not in {"pdf", "docx", "doc", "txt"}:
            raise HTTPException(status_code=415, detail="Upload a PDF, DOCX or TXT file under 10 MB.")
        parsed = extract_text_from_resume(file.filename, raw, ext, settings.GROQ_API_KEY)
        if not parsed.get("success") or not parsed.get("text"):
            raise HTTPException(status_code=422, detail=parsed.get("error", "Could not read that file."))
        text = parsed["text"]
    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Upload a resume file or paste at least a few lines of resume text.")
    if len(text) > MAX_TEXT:
        raise HTTPException(status_code=413, detail="Resume text too long")
    doc = resume_builder.parse_text(text)
    if save:
        resume_builder.save(db, profile, doc)
        return {**_structured_payload(db, profile), "profile": profile_dict(db, profile)}
    return {"resume": doc.model_dump(), "source": "parsed", "updated_at": None,
            "templates": list(resume_builder.LATEX_TEMPLATES)}


class RecheckBody(BaseModel):
    resume_text: str = Field(default="", max_length=MAX_TEXT)   # empty: the user's saved (builder) resume
    job_description: str = Field(default="", max_length=MAX_TEXT)
    job_title: str = Field(default="", max_length=300)


@router.post("/resume/recheck")
def resume_recheck(body: RecheckBody, profile: SeekerProfile = Depends(get_profile)):
    """Re-score a resume with the same scorer as uploaded scans (so before/after are comparable),
    plus an optional deterministic match against a job description. Not metered: no LLM involved."""
    from app.ats_scorer import score_text
    from app.ats_stages import job_match
    text = (body.resume_text or profile.resume_text or "").strip()
    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Add your resume first (upload it or fill in the Resume editor).")
    report = score_text(text)
    issues = [{"id": c["id"], "label": c.get("label", c["id"]), "detail": c.get("detail", "")}
              for c in report["tier1_checks"] + report["tier2_checks"] if not c.get("passed")]
    return {
        "ats_score": min(max(round(report["unified_score"]), 0), 100),
        "atsparse_score": report["atsparse_score"], "human_quality_score": report["human_quality_score"],
        "breakdown": report["breakdown"], "suggestions": report["all_suggestions"][:8], "issues": issues,
        "keywords_found": report["keywords_found"], "keywords_missing": report["keywords_missing"],
        "word_count": report["word_count"],
        "job_match": job_match(text, body.job_description, body.job_title),
    }


@router.get("/resume/structured/export")
def structured_resume_export(format: Literal["pdf", "docx", "txt"] = "pdf", template: str = Query(default="classic", max_length=40),
                             profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    from fastapi.responses import Response
    doc, _, _ = resume_builder.current(db, profile)
    if doc.is_empty():
        raise HTTPException(status_code=400, detail="Your resume is empty. Add some content first.")
    stem = re.sub(r"[^A-Za-z0-9]+", "_", doc.fullName).strip("_") or "resume"
    if format == "pdf":
        content, engine = resume_builder.export_pdf(doc, template)
        media, headers = "application/pdf", {"X-Resume-Engine": engine}
    elif format == "docx":
        content, headers = resume_builder.export_docx(doc), {}
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        content, media, headers = resume_builder.to_text(doc).encode("utf-8"), "text/plain; charset=utf-8", {}
    headers["Content-Disposition"] = f'attachment; filename="{stem}_Resume.{format}"'
    return Response(content=content, media_type=media, headers=headers)


class TailorBody(JobRef):
    resume_text: str = Field(default="", max_length=MAX_TEXT)
    bullets: Optional[list[str]] = None
    application_id: Optional[str] = None


@router.post("/resume/tailor")
def tailor(body: TailorBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    resume = _require_resume(profile, body.resume_text)
    job_text, title, company, _ = _job_context(db, body)
    result = _metered(db, profile, "tailor_resume",
                      lambda: tools.tailor_resume(resume, job_text, title, company, body.bullets))
    if body.application_id:
        app = _app_or_404(db, profile, body.application_id)
        app.tailored_resume = result["tailored_resume"]
        db.commit()
    return result


class CoverBody(JobRef):
    tone: str = Field(default="confident and warm", max_length=80)
    application_id: Optional[str] = None
    resume_text: str = Field(default="", max_length=MAX_TEXT)


@router.post("/cover-letter")
def cover(body: CoverBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    resume = _require_resume(profile, body.resume_text)
    job_text, title, company, _ = _job_context(db, body)
    result = _metered(db, profile, "cover_letter",
                      lambda: tools.cover_letter(resume, job_text, profile.full_name, title, company, body.tone))
    if body.application_id:
        app = _app_or_404(db, profile, body.application_id)
        app.cover_letter = result["cover_letter"]
        db.commit()
    return result


@router.post("/interview/questions")
def interview_qs(body: JobRef, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    job_text, title, company, _ = _job_context(db, body)
    return _metered(db, profile, "interview_questions",
                    lambda: tools.interview_questions(job_text, title, company, profile.resume_text or ""))


class FeedbackBody(BaseModel):
    question: str = Field(min_length=5, max_length=1000)
    answer: str = Field(min_length=10, max_length=8000)
    title: str = Field(default="", max_length=300)


@router.post("/interview/feedback")
def interview_fb(body: FeedbackBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    return _metered(db, profile, "interview_feedback",
                    lambda: tools.interview_feedback(body.question, body.answer, body.title))


class SalaryBody(BaseModel):
    job_id: Optional[str] = None
    title: str = ""
    offer: Optional[int] = None


@router.post("/salary")
def salary(body: SalaryBody, db: Session = Depends(get_db), _: str = Depends(client_id_header)):
    job = _job_or_404(db, body.job_id) if body.job_id else None
    return tools.salary_guidance(job.title if job else (body.title or "this role"),
                                 job.salary_min if job else None, job.salary_max if job else None, body.offer)


# ------------------------------------------------------------- tracker ----

STAGES = Literal["Wishlist", "Applied", "Screen", "Technical", "Offer", "Rejected"]


class ApplicationCreate(BaseModel):
    role: str = Field(min_length=1, max_length=300)
    company: str = Field(min_length=1, max_length=200)
    location: str = ""
    url: str = ""
    ats: str = ""
    stage: STAGES = "Wishlist"
    salary_range: str = ""
    notes: str = Field(default="", max_length=5000)
    job_id: Optional[str] = None


class ApplicationUpdate(BaseModel):
    stage: Optional[STAGES] = None
    notes: Optional[str] = Field(default=None, max_length=5000)
    salary_range: Optional[str] = None
    url: Optional[str] = None


@router.get("/applications")
def list_applications(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    apps = db.query(TrackedApplication).filter(TrackedApplication.client_id == profile.client_id).order_by(
        TrackedApplication.updated_at.desc()).all()
    return {"applications": [agents.application_dict(a) for a in apps]}


@router.post("/applications")
def create_application(body: ApplicationCreate, profile: SeekerProfile = Depends(get_profile),
                       db: Session = Depends(get_db)):
    if body.job_id:
        app = agents.save_job_to_tracker(db, profile, _job_or_404(db, body.job_id), stage=body.stage)
        return agents.application_dict(app)
    app = TrackedApplication(client_id=profile.client_id, role=body.role, company=body.company,
                             location=body.location, url=body.url, ats=body.ats, stage=body.stage,
                             salary_range=body.salary_range, notes=body.notes,
                             applied_at=datetime.utcnow() if body.stage != "Wishlist" else None)
    db.add(app)
    db.commit()
    db.refresh(app)
    return agents.application_dict(app)


@router.patch("/applications/{app_id}")
def update_application(app_id: str, body: ApplicationUpdate, profile: SeekerProfile = Depends(get_profile),
                       db: Session = Depends(get_db)):
    app = _app_or_404(db, profile, app_id)
    data = body.model_dump(exclude_unset=True)
    if data.get("stage") and data["stage"] != "Wishlist" and not app.applied_at:
        app.applied_at = datetime.utcnow()
    for key, value in data.items():
        setattr(app, key, value)
    db.commit()
    return agents.application_dict(app)


@router.delete("/applications/{app_id}")
def delete_application(app_id: str, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    db.delete(_app_or_404(db, profile, app_id))
    db.commit()
    return {"deleted": True}


@router.get("/applications/{app_id}/packet")
def application_packet(app_id: str, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    app = _app_or_404(db, profile, app_id)
    return {"application": agents.application_dict(app), "tailored_resume": app.tailored_resume,
            "cover_letter": app.cover_letter}


class AutoApplyBody(BaseModel):
    job_id: str
    min_match: int = Field(default=0, ge=0, le=100)


@router.post("/auto-apply")
def auto_apply(body: AutoApplyBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    job = _job_or_404(db, body.job_id)
    _require_resume(profile)
    return _metered(db, profile, "auto_apply", lambda: agents.auto_apply(db, profile, job, body.min_match))


# ----------------------------------------------------- company insights ----

@router.get("/companies/insights")
def company_insights(name: str = Query(min_length=2, max_length=200), profile: SeekerProfile = Depends(get_profile),
                     db: Session = Depends(get_db)):
    from app.career.insights import company_insights as build
    ensure_seeded(db)
    return build(db, profile, name)


# ------------------------------------------------- background agent mode ----

class AgentSettingsBody(BaseModel):
    enabled: Optional[bool] = None
    min_match: Optional[int] = Field(default=None, ge=0, le=100)
    roles: Optional[list[str]] = Field(default=None, max_length=20)
    locations: Optional[list[str]] = Field(default=None, max_length=20)
    remote_only: Optional[bool] = None
    h1b_only: Optional[bool] = None
    daily_cap: Optional[int] = Field(default=None, ge=1, le=50)
    auto_submit: Optional[bool] = None


class AgentResolveBody(BaseModel):
    outcome: Literal["submitted", "failed"]
    detail: str = Field(default="", max_length=300)


def _agent_overview(db: Session, profile: SeekerProfile) -> dict:
    row = agent_mode.get_settings(db, profile.client_id)
    return {"settings": agent_mode.settings_dict(row), "today": agent_mode.today_summary(db, profile.client_id),
            "missing_answers": agent_mode.missing_answers(profile),
            "turbo": plans.effective_plan(profile) == "turbo"}


@router.get("/agent")
def agent_get(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    return _agent_overview(db, profile)


@router.put("/agent")
def agent_update(body: AgentSettingsBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_unset=True, exclude_none=True)
    for key in ("roles", "locations"):
        if key in data and any(len(s) > 100 for s in data[key]):
            raise HTTPException(status_code=422, detail=f"Each {key[:-1]} must be 100 characters or fewer.")
    agent_mode.update_settings(db, profile, data)
    return _agent_overview(db, profile)


@router.post("/agent/run")
def agent_run(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    plans.require_feature(profile, "agent_mode")
    ensure_seeded(db)
    stats = agent_mode.run_for_client(db, profile, force=True)
    return {"stats": stats, **_agent_overview(db, profile)}


@router.get("/agent/tasks")
def agent_tasks(scope: Literal["today", "all"] = "today", limit: int = Query(default=50, ge=1, le=200),
                profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    q = db.query(AgentTask).filter(AgentTask.client_id == profile.client_id)
    if scope == "today":
        q = q.filter(AgentTask.day == plans.today())
    rows = q.order_by(AgentTask.created_at.desc()).limit(limit).all()
    return {"tasks": [agent_mode.task_dict(db, t, include_log=False) for t in rows]}


@router.get("/agent/tasks/{task_id}")
def agent_task(task_id: str, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    return agent_mode.task_dict(db, agent_mode.task_or_404(db, profile.client_id, task_id))


@router.post("/agent/tasks/{task_id}/resolve")
def agent_task_resolve(task_id: str, body: AgentResolveBody, profile: SeekerProfile = Depends(get_profile),
                       db: Session = Depends(get_db)):
    task = agent_mode.task_or_404(db, profile.client_id, task_id)
    return agent_mode.task_dict(db, agent_mode.resolve(db, profile, task, body.outcome, body.detail))


# Chrome extension hand-off for opted-in unattended submissions.
@router.get("/agent/submissions")
def agent_submissions(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    out = []
    for task in agent_mode.pending_submissions(db, profile.client_id):
        app = db.get(TrackedApplication, task.application_id) if task.application_id else None
        out.append({**agent_mode.task_dict(db, task, include_log=False),
                    "packet": json.loads(app.autofill_packet) if app and app.autofill_packet else None})
    return {"submissions": out}


@router.post("/agent/tasks/{task_id}/result")
def agent_task_result(task_id: str, body: AgentResolveBody, profile: SeekerProfile = Depends(get_profile),
                      db: Session = Depends(get_db)):
    task = agent_mode.task_or_404(db, profile.client_id, task_id)
    return agent_mode.task_dict(db, agent_mode.resolve(db, profile, task, body.outcome, body.detail, source="extension"))


# ------------------------------------------------------------- copilot ----

class ChatBody(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


FREE_DAILY_MESSAGES = 30


@router.post("/copilot/chat")
def copilot_chat(body: ChatBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    if plans.effective_plan(profile) == "free":
        start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        sent = db.query(ChatMessage).filter(ChatMessage.client_id == profile.client_id, ChatMessage.role == "user",
                                            ChatMessage.created_at >= start).count()
        if sent >= FREE_DAILY_MESSAGES:
            raise HTTPException(status_code=402, detail=f"Free plan includes {FREE_DAILY_MESSAGES} Sage messages a day.")
    ensure_seeded(db)
    return agents.orion_chat(db, profile, body.message.strip())


@router.get("/copilot/history")
def copilot_history(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    rows = db.query(ChatMessage).filter(ChatMessage.client_id == profile.client_id).order_by(
        ChatMessage.created_at.asc()).limit(200).all()
    return {"messages": [{"id": m.id, "role": m.role, "content": m.content,
                          "created_at": m.created_at.isoformat()} for m in rows]}


@router.delete("/copilot/history")
def clear_copilot(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    db.query(ChatMessage).filter(ChatMessage.client_id == profile.client_id).delete()
    db.commit()
    return {"cleared": True}


# --------------------------------------------------------- connections ----

class ConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    company: str = Field(default="", max_length=200)
    position: str = Field(default="", max_length=200)
    email: str = ""
    profile_url: str = ""
    school: str = ""
    relationship: Literal["connection", "alumni", "colleague"] = "connection"


def _conn_dict(c: Connection) -> dict:
    return {"id": c.id, "name": c.name, "company": c.company, "position": c.position, "email": c.email,
            "profile_url": c.profile_url, "school": c.school, "relationship": c.relationship}


@router.get("/connections")
def list_connections(company: str = "", profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    q = db.query(Connection).filter(Connection.client_id == profile.client_id)
    if company:
        q = q.filter(Connection.company.ilike(f"%{company}%"))
    rows = q.order_by(Connection.company, Connection.name).limit(500).all()
    total = db.query(Connection).filter(Connection.client_id == profile.client_id).count()
    return {"total": total, "connections": [_conn_dict(c) for c in rows]}


@router.post("/connections")
def add_connection(body: ConnectionCreate, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    connections.import_connections(db, profile.client_id, [body.model_dump()])
    return {"added": True}


@router.post("/connections/import")
async def import_connections_csv(file: UploadFile = File(...), profile: SeekerProfile = Depends(get_profile),
                                 db: Session = Depends(get_db)):
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (10 MB max).")
    rows = connections.parse_linkedin_csv(raw)
    if not rows:
        raise HTTPException(status_code=400, detail="No connections found. Upload LinkedIn's Connections.csv export.")
    added = connections.import_connections(db, profile.client_id, rows, school=profile.school or "")
    return {"parsed": len(rows), "added": added}


@router.delete("/connections/{conn_id}")
def delete_connection(conn_id: str, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    conn = db.get(Connection, conn_id)
    if not conn or conn.client_id != profile.client_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(conn)
    db.commit()
    return {"deleted": True}


@router.get("/jobs/{job_id}/insiders")
def job_insiders(job_id: str, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    job = _job_or_404(db, job_id)
    insiders = agents.find_insiders(db, profile, job.company)
    locked = plans.effective_plan(profile) != "turbo"
    return {"company": job.company, "count": len(insiders), "locked": locked,
            "insiders": [] if locked else insiders}


class ReferralBody(BaseModel):
    job_id: str


@router.post("/connections/{conn_id}/referral-message")
def referral(conn_id: str, body: ReferralBody, profile: SeekerProfile = Depends(get_profile),
             db: Session = Depends(get_db)):
    plans.require_feature(profile, "insider_connections")
    conn = db.get(Connection, conn_id)
    if not conn or conn.client_id != profile.client_id:
        raise HTTPException(status_code=404, detail="Connection not found")
    job = _job_or_404(db, body.job_id)
    message = _metered(db, profile, "referral_message", lambda: tools.referral_message(
        conn.name, conn.position, job.company, job.title, conn.relationship, profile.full_name, profile.headline))
    return {"message": message, "connection": _conn_dict(conn)}


# -------------------------------------------------------------- alerts ----

class AlertCreate(BaseModel):
    name: str = Field(default="My alert", max_length=100)
    query: str = Field(default="", max_length=200)
    location: str = Field(default="", max_length=100)
    remote_only: bool = False
    h1b_only: bool = False
    min_match: int = Field(default=60, ge=0, le=100)
    email: str = Field(default="", max_length=200)


def _alert_dict(a: JobAlert, unseen: int = 0) -> dict:
    return {"id": a.id, "name": a.name, "query": a.query, "location": a.location, "remote_only": a.remote_only,
            "h1b_only": a.h1b_only, "min_match": a.min_match, "email": a.email, "unseen": unseen,
            "last_checked_at": a.last_checked_at.isoformat() if a.last_checked_at else None}


@router.get("/alerts")
def list_alerts(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    rows = db.query(JobAlert).filter(JobAlert.client_id == profile.client_id).all()
    out = []
    for a in rows:
        unseen = db.query(AlertHit).filter(AlertHit.alert_id == a.id, AlertHit.seen.is_(False)).count()
        out.append(_alert_dict(a, unseen))
    return {"alerts": out}


@router.post("/alerts")
def create_alert(body: AlertCreate, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    status = plans.plan_status(db, profile)
    if status["alerts_used"] >= status["alerts_limit"]:
        raise HTTPException(status_code=402, detail=f"Your plan allows {status['alerts_limit']} alert(s). Upgrade to Turbo for more.")
    ensure_seeded(db)
    # Look back a week so a new alert immediately shows recent early postings.
    alert = JobAlert(client_id=profile.client_id, last_checked_at=datetime.utcnow() - timedelta(days=7), **body.model_dump())
    db.add(alert)
    db.commit()
    db.refresh(alert)
    alerts.evaluate_alert(db, alert, profile)
    return _alert_dict(alert)


@router.delete("/alerts/{alert_id}")
def delete_alert(alert_id: str, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    alert = db.get(JobAlert, alert_id)
    if not alert or alert.client_id != profile.client_id:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.query(AlertHit).filter(AlertHit.alert_id == alert_id).delete()
    db.delete(alert)
    db.commit()
    return {"deleted": True}


@router.get("/alerts/hits")
def alert_hits(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    hits = db.query(AlertHit).filter(AlertHit.client_id == profile.client_id).order_by(
        AlertHit.created_at.desc()).limit(100).all()
    jobs = {j.id: j for j in db.query(PlatformJob).filter(PlatformJob.id.in_([h.job_id for h in hits])).all()} if hits else {}
    return {"hits": [{"id": h.id, "alert_id": h.alert_id, "seen": h.seen, "match_score": h.match_score,
                      "created_at": h.created_at.isoformat(), "job": matching.job_to_dict(jobs[h.job_id])}
                     for h in hits if h.job_id in jobs]}


@router.post("/alerts/hits/seen")
def mark_hits_seen(profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    db.query(AlertHit).filter(AlertHit.client_id == profile.client_id, AlertHit.seen.is_(False)).update({"seen": True})
    db.commit()
    return {"ok": True}


# ------------------------------------------------ extension pairing ----

def _token_status(db: Session, client_id: str) -> dict:
    row = db.query(ExtensionToken).filter(ExtensionToken.client_id == client_id, ExtensionToken.revoked.is_(False))         .order_by(ExtensionToken.created_at.desc()).first()
    if row is None:
        return {"active": False}
    return {"active": True, "hint": row.hint, "created_at": row.created_at.isoformat(),
            "last_used_at": row.last_used_at.isoformat() if row.last_used_at else None}


def _not_from_extension(identity: Identity) -> None:
    if identity.via == "extension":
        raise HTTPException(status_code=403, detail="Manage pairing codes from the web app.")


@router.get("/extension/token")
def extension_token_status(identity: Identity = Depends(resolve_identity), db: Session = Depends(get_db)):
    return _token_status(db, identity.client_id)


@router.post("/extension/token")
def create_extension_token(identity: Identity = Depends(resolve_identity), db: Session = Depends(get_db)):
    """Issue a new pairing code (shown once) and revoke any previous one for this profile."""
    _not_from_extension(identity)
    db.query(ExtensionToken).filter(ExtensionToken.client_id == identity.client_id,
                                    ExtensionToken.revoked.is_(False)).update({"revoked": True})
    raw = EXTENSION_TOKEN_PREFIX + secrets.token_urlsafe(24)
    db.add(ExtensionToken(client_id=identity.client_id, token_hash=hash_token(raw), hint=raw[-4:]))
    db.commit()
    return {"token": raw, **_token_status(db, identity.client_id)}


@router.delete("/extension/token")
def revoke_extension_token(identity: Identity = Depends(resolve_identity), db: Session = Depends(get_db)):
    _not_from_extension(identity)
    revoked = db.query(ExtensionToken).filter(ExtensionToken.client_id == identity.client_id,
                                              ExtensionToken.revoked.is_(False)).update({"revoked": True})
    db.commit()
    return {"revoked": revoked}


# ------------------------------------------------- autofill (extension) ----

class FormField(BaseModel):
    id: str = Field(max_length=200)
    tag: str = ""
    type: str = ""
    name: str = ""
    dom_id: str = ""
    label: str = Field(default="", max_length=500)
    placeholder: str = ""
    aria_label: str = ""
    autocomplete: str = ""
    options: list[str] = []


class AutofillBody(BaseModel):
    url: str = Field(default="", max_length=2000)
    fields: list[FormField] = Field(max_length=300)
    application_id: Optional[str] = None


@router.post("/autofill/map")
def autofill_map(body: AutofillBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    app = None
    if body.application_id:
        app = _app_or_404(db, profile, body.application_id)
    elif body.url:
        base = body.url.split("?")[0].rstrip("/")
        candidates = db.query(TrackedApplication).filter(TrackedApplication.client_id == profile.client_id,
                                                         TrackedApplication.url != "").all()
        app = next((a for a in candidates if a.url and (base.startswith(a.url.split("?")[0].rstrip("/"))
                                                       or a.url.split("?")[0].rstrip("/").startswith(base))), None)
    job = {"title": app.role, "company": app.company} if app else None
    result = autofill.map_fields(profile, [f.model_dump() for f in body.fields], job=job,
                                 cover_letter=app.cover_letter if app else "")
    result["application"] = agents.application_dict(app) if app else None
    return result


@router.get("/autofill/profile")
def autofill_profile(profile: SeekerProfile = Depends(get_profile)):
    return {"values": autofill.profile_values(profile), "has_resume": bool(profile.resume_text)}


class MarkAppliedBody(BaseModel):
    url: str = ""
    application_id: Optional[str] = None
    role: str = ""
    company: str = ""


@router.post("/autofill/applied")
def autofill_applied(body: MarkAppliedBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    """Called by the extension after the user submits a form: moves the tracker entry to Applied."""
    app = _app_or_404(db, profile, body.application_id) if body.application_id else None
    if app is None and body.url:
        app = db.query(TrackedApplication).filter(TrackedApplication.client_id == profile.client_id,
                                                  TrackedApplication.url == body.url).first()
    if app is None:
        app = TrackedApplication(client_id=profile.client_id, role=body.role or "Application",
                                 company=body.company or "Unknown company", url=body.url)
        db.add(app)
    app.stage = "Applied" if app.stage == "Wishlist" else app.stage
    app.applied_at = app.applied_at or datetime.utcnow()
    db.commit()
    return agents.application_dict(app)


# ----------------------------------------------------------- recruiter ----

class RoleCreate(BaseModel):
    title: str = Field(min_length=2, max_length=300)
    company: str = Field(default="", max_length=200)
    location: str = Field(default="", max_length=200)
    description: str = Field(min_length=30, max_length=MAX_TEXT)


@router.get("/recruiter/dashboard")
def recruiter_dashboard(client_id: str = Depends(client_id_header), db: Session = Depends(get_db)):
    return recruiter.dashboard(db, client_id)


@router.post("/recruiter/roles")
def recruiter_create_role(body: RoleCreate, client_id: str = Depends(client_id_header), db: Session = Depends(get_db)):
    role = recruiter.create_role(db, client_id, body.title, body.company, body.location, body.description)
    return recruiter.role_dict(db, role)


@router.get("/recruiter/roles/{role_id}")
def recruiter_role(role_id: str, verdict: str = "", client_id: str = Depends(client_id_header),
                   db: Session = Depends(get_db)):
    role = _role_or_404(db, client_id, role_id)
    q = db.query(Candidate).filter(Candidate.role_id == role_id)
    if verdict:
        q = q.filter(Candidate.fraud_verdict == verdict)
    cands = sorted(q.all(), key=lambda c: (c.fraud_verdict == "high_risk", -(c.match_score or 0)))
    return {"role": recruiter.role_dict(db, role), "candidates": [recruiter.candidate_dict(c) for c in cands]}


@router.delete("/recruiter/roles/{role_id}")
def recruiter_delete_role(role_id: str, client_id: str = Depends(client_id_header), db: Session = Depends(get_db)):
    role = _role_or_404(db, client_id, role_id)
    db.query(Candidate).filter(Candidate.role_id == role_id).delete()
    db.delete(role)
    db.commit()
    return {"deleted": True}


@router.post("/recruiter/roles/{role_id}/candidates")
async def recruiter_add_candidates(
    role_id: str, files: list[UploadFile] = File(default=[]), resume_text: str = Form(default=""),
    name: str = Form(default=""), client_id: str = Depends(client_id_header), db: Session = Depends(get_db),
):
    from app.resume_parser import extract_text_from_resume
    role = _role_or_404(db, client_id, role_id)
    added, errors = [], []
    for upload in files[:25]:
        raw = await upload.read()
        ext = (upload.filename or "").rsplit(".", 1)[-1].lower()
        if len(raw) > 10 * 1024 * 1024 or ext not in {"pdf", "docx", "doc", "txt"}:
            errors.append({"file": upload.filename, "error": "Unsupported or too large"})
            continue
        parsed = extract_text_from_resume(upload.filename, raw, ext, settings.GROQ_API_KEY)
        if not parsed.get("success") or not parsed.get("text"):
            errors.append({"file": upload.filename, "error": parsed.get("error", "Could not read file")})
            continue
        added.append(recruiter.add_candidate(db, role, parsed["text"]))
    if resume_text.strip():
        if len(resume_text) > MAX_TEXT:
            raise HTTPException(status_code=413, detail="Resume text too long")
        added.append(recruiter.add_candidate(db, role, resume_text.strip(), name=name.strip()))
    if not added and not errors:
        raise HTTPException(status_code=400, detail="Upload resumes or paste resume text.")
    return {"added": [recruiter.candidate_dict(c) for c in added], "errors": errors}


@router.post("/recruiter/roles/{role_id}/source")
def recruiter_source(role_id: str, client_id: str = Depends(client_id_header), db: Session = Depends(get_db)):
    role = _role_or_404(db, client_id, role_id)
    added = recruiter.source_from_platform(db, role)
    return {"added": [recruiter.candidate_dict(c) for c in added]}


@router.get("/recruiter/candidates/{cand_id}")
def recruiter_candidate(cand_id: str, client_id: str = Depends(client_id_header), db: Session = Depends(get_db)):
    cand, _ = _candidate_or_404(db, client_id, cand_id)
    return recruiter.candidate_dict(cand, include_resume=True)


@router.post("/recruiter/candidates/{cand_id}/outreach")
def recruiter_outreach(cand_id: str, client_id: str = Depends(client_id_header), db: Session = Depends(get_db)):
    cand, role = _candidate_or_404(db, client_id, cand_id)
    draft = recruiter.draft_outreach(role, cand)
    cand.outreach_message = draft["body"]
    db.commit()
    return draft


class ContactBody(BaseModel):
    subject: str = Field(min_length=1, max_length=300)
    body: str = Field(min_length=10, max_length=5000)
    send: bool = False


@router.post("/recruiter/candidates/{cand_id}/contact")
def recruiter_contact(cand_id: str, body: ContactBody, client_id: str = Depends(client_id_header),
                      db: Session = Depends(get_db)):
    cand, _ = _candidate_or_404(db, client_id, cand_id)
    if cand.fraud_verdict == "high_risk":
        raise HTTPException(status_code=409, detail="This candidate failed fraud checks. Review before contacting.")
    delivery = recruiter.send_outreach(cand, body.subject, body.body) if body.send else {"success": True, "provider": "draft"}
    if not delivery.get("success"):
        raise HTTPException(status_code=502, detail=delivery.get("error", "Could not send"))
    cand.outreach_message = body.body
    cand.status = "contacted"
    db.commit()
    return {"candidate": recruiter.candidate_dict(cand), "delivery": delivery}


class CandidateUpdate(BaseModel):
    status: Literal["sourced", "contacted", "interviewing", "rejected", "hired"]


@router.patch("/recruiter/candidates/{cand_id}")
def recruiter_update_candidate(cand_id: str, body: CandidateUpdate, client_id: str = Depends(client_id_header),
                               db: Session = Depends(get_db)):
    cand, _ = _candidate_or_404(db, client_id, cand_id)
    cand.status = body.status
    db.commit()
    return recruiter.candidate_dict(cand)
