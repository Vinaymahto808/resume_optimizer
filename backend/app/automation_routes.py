"""
Automation API Routes — wires together all automation layer services.

Endpoints:
- /api/automation/llm/* — LLM executor, usage stats
- /api/automation/prompts/* — prompt registry CRUD
- /api/automation/applications/* — application state machine
- /api/automation/credentials/* — credential vault
- /api/automation/queue/* — job queue management
- /api/automation/jobs/* — job board search
- /api/automation/browser/* — browser automation
- /api/automation/notifications/* — notification service
- /api/automation/analytics/* — metrics & audit
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from app.auth import get_current_user
from app.database import get_db
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/automation", tags=["Automation Layer"])


# ─────────────────────────────────────────────
# LLM Executor
# ─────────────────────────────────────────────

class LLMRequest(BaseModel):
    prompt: str
    provider: str = "groq"
    model: str = ""
    temperature: float = 0.7
    max_tokens: int = 2000
    json_mode: bool = False


@router.post("/llm/call")
def llm_call(req: LLMRequest, user=Depends(get_current_user)):
    from app.llm_executor import get_llm, LLMProvider
    try:
        provider = LLMProvider(req.provider)
    except ValueError:
        provider = LLMProvider.GROQ

    executor = get_llm(provider=provider, model=req.model)
    if req.json_mode:
        response = executor.execute_json(req.prompt, req.temperature, req.max_tokens)
    else:
        response = executor.execute(req.prompt, req.temperature, req.max_tokens)

    return {
        "success": response.success,
        "content": response.content,
        "parsed_json": response.parsed_json,
        "provider": response.provider,
        "model": response.model,
        "tokens_used": response.tokens_used,
        "latency_ms": round(response.latency_ms, 2),
        "cost_usd": round(response.cost_usd, 6),
        "cached": response.cached,
        "error": response.error,
    }


@router.get("/llm/usage")
def llm_usage_stats(user=Depends(get_current_user)):
    from app.llm_executor import get_usage_stats
    return get_usage_stats()


# ─────────────────────────────────────────────
# Prompt Registry
# ─────────────────────────────────────────────

@router.get("/prompts")
def list_prompts(user=Depends(get_current_user)):
    from app.prompt_registry import list_all_prompts
    return list_all_prompts()


class PromptRenderRequest(BaseModel):
    category: str
    version: str = ""
    variables: dict = {}


@router.post("/prompts/render")
def render_prompt(req: PromptRenderRequest, user=Depends(get_current_user)):
    from app.prompt_registry import get_registry, PromptCategory
    try:
        cat = PromptCategory(req.category)
    except ValueError:
        raise HTTPException(400, f"Unknown category: {req.category}")
    try:
        text = get_registry().render(cat, version=req.version, **req.variables)
        return {"success": True, "prompt": text}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/prompts/{category}/validate")
def validate_prompt_output(category: str, output: str = Query(...), user=Depends(get_current_user)):
    from app.prompt_registry import get_registry, PromptCategory
    try:
        cat = PromptCategory(category)
    except ValueError:
        raise HTTPException(400, f"Unknown category: {category}")
    return get_registry().validate_output(cat, output)


# ─────────────────────────────────────────────
# Application State Machine
# ─────────────────────────────────────────────

class CreateApplicationRequest(BaseModel):
    job_title: str
    company_name: str
    job_url: str = ""
    job_description: str = ""
    portal: str = "generic"
    resume_id: str = ""


class TransitionRequest(BaseModel):
    new_status: str
    details: dict = {}


@router.post("/applications")
def create_application(req: CreateApplicationRequest, user=Depends(get_current_user),
                       db: Session = Depends(get_db)):
    from app.application_state_machine import ApplicationStateMachine
    from app.models_extended import JobPortal
    try:
        portal = JobPortal(req.portal)
    except ValueError:
        portal = JobPortal.GENERIC

    sm = ApplicationStateMachine(db)
    app = sm.create(
        user_id=user["sub"],
        job_title=req.job_title,
        company_name=req.company_name,
        job_url=req.job_url,
        job_description=req.job_description,
        portal=portal,
        resume_id=req.resume_id,
    )
    return {
        "success": True,
        "application": {
            "id": app.id,
            "job_title": app.job_title,
            "company_name": app.company_name,
            "status": app.status.value,
            "portal": app.portal.value,
            "created_at": app.created_at.isoformat() if app.created_at else None,
        },
    }


@router.get("/applications")
def list_applications(
    status: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.application_state_machine import ApplicationStateMachine, ApplicationStatus
    sm = ApplicationStateMachine(db)
    status_enum = None
    if status:
        try:
            status_enum = ApplicationStatus(status)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status}")

    apps = sm.list_by_user(user["sub"], status=status_enum, limit=limit, offset=offset)
    return {
        "success": True,
        "applications": [
            {
                "id": a.id,
                "job_title": a.job_title,
                "company_name": a.company_name,
                "status": a.status.value,
                "portal": a.portal.value,
                "ats_match_score": a.ats_match_score,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "applied_at": a.applied_at.isoformat() if a.applied_at else None,
            }
            for a in apps
        ],
        "total": len(apps),
    }


@router.get("/applications/{app_id}")
def get_application(app_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.application_state_machine import ApplicationStateMachine
    sm = ApplicationStateMachine(db)
    app = sm.get(app_id, user_id=user["sub"])
    if not app:
        raise HTTPException(404, "Application not found")

    events = sm.get_events(app_id)
    return {
        "success": True,
        "application": {
            "id": app.id,
            "job_title": app.job_title,
            "company_name": app.company_name,
            "status": app.status.value,
            "portal": app.portal.value,
            "job_url": app.job_url,
            "ats_match_score": app.ats_match_score,
            "tailored_resume_text": app.tailored_resume_text,
            "tailored_cover_letter": app.tailored_cover_letter,
            "extracted_keywords": app.extracted_keywords or [],
            "error_message": app.error_message,
            "retry_count": app.retry_count,
            "created_at": app.created_at.isoformat() if app.created_at else None,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
        },
        "events": events,
    }


@router.post("/applications/{app_id}/transition")
def transition_application(app_id: str, req: TransitionRequest,
                           user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.application_state_machine import ApplicationStateMachine, ApplicationStatus
    sm = ApplicationStateMachine(db)
    try:
        new_status = ApplicationStatus(req.new_status)
    except ValueError:
        raise HTTPException(400, f"Invalid status: {req.new_status}")
    try:
        app = sm.transition(app_id, new_status, details=req.details, user_id=user["sub"])
        return {
            "success": True,
            "application": {
                "id": app.id,
                "status": app.status.value,
            },
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/applications/stats")
def application_stats(user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.application_state_machine import ApplicationStateMachine
    sm = ApplicationStateMachine(db)
    return sm.get_stats(user["sub"])


# ─────────────────────────────────────────────
# Credential Vault
# ─────────────────────────────────────────────

class StoreCredentialRequest(BaseModel):
    portal: str
    credential_type: str = "email_password"
    credentials: dict
    label: str = ""


@router.post("/credentials")
def store_credential(req: StoreCredentialRequest, user=Depends(get_current_user),
                     db: Session = Depends(get_db)):
    from app.credential_vault import CredentialVault
    from app.models_extended import JobPortal, CredentialType
    try:
        portal = JobPortal(req.portal)
    except ValueError:
        raise HTTPException(400, f"Unknown portal: {req.portal}")
    try:
        ctype = CredentialType(req.credential_type)
    except ValueError:
        ctype = CredentialType.EMAIL_PASSWORD

    vault = CredentialVault(db)
    cred = vault.store(
        user_id=user["sub"],
        portal=portal,
        credentials=req.credentials,
        credential_type=ctype,
        label=req.label,
    )
    return {"success": True, "credential_id": cred.id, "label": cred.label}


@router.get("/credentials")
def list_credentials(user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.credential_vault import CredentialVault
    vault = CredentialVault(db)
    return {"success": True, "credentials": vault.list_credentials(user["sub"])}


@router.get("/credentials/{cred_id}")
def get_credential(cred_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.credential_vault import CredentialVault
    vault = CredentialVault(db)
    creds = vault.retrieve(cred_id, user["sub"])
    if not creds:
        raise HTTPException(404, "Credential not found or expired")
    return {"success": True, **creds}


@router.delete("/credentials/{cred_id}")
def delete_credential(cred_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.credential_vault import CredentialVault
    vault = CredentialVault(db)
    if not vault.delete(cred_id, user["sub"]):
        raise HTTPException(404, "Credential not found")
    return {"success": True}


# ─────────────────────────────────────────────
# Job Queue
# ─────────────────────────────────────────────

class EnqueueJobRequest(BaseModel):
    job_type: str
    payload: dict
    priority: int = 1
    portal: str = ""


@router.post("/queue/enqueue")
def enqueue_job(req: EnqueueJobRequest, user=Depends(get_current_user)):
    from app.job_queue import job_queue, JobPriority
    try:
        priority = JobPriority(req.priority)
    except ValueError:
        priority = JobPriority.NORMAL

    job = job_queue.enqueue(
        job_type=req.job_type,
        payload=req.payload,
        priority=priority,
        portal=req.portal,
        user_id=user["sub"],
    )
    return {"success": True, "job": job.to_dict()}


@router.get("/queue/jobs")
def list_queue_jobs(
    status: Optional[str] = None,
    job_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    user=Depends(get_current_user),
):
    from app.job_queue import job_queue, JobStatus
    status_enum = None
    if status:
        try:
            status_enum = JobStatus(status)
        except ValueError:
            pass
    jobs = job_queue.list_jobs(status=status_enum, job_type=job_type,
                                user_id=user["sub"], limit=limit)
    return {"success": True, "jobs": jobs, "total": len(jobs)}


@router.get("/queue/stats")
def queue_stats(user=Depends(get_current_user)):
    from app.job_queue import job_queue
    return job_queue.get_stats()


# ─────────────────────────────────────────────
# Job Board Search
# ─────────────────────────────────────────────

class JobSearchRequest(BaseModel):
    query: str
    location: str = ""
    portal: str = "all"
    limit: int = 10


@router.post("/jobs/search")
def search_jobs(req: JobSearchRequest, user=Depends(get_current_user)):
    from app.job_board_clients import get_client, search_all_portals, check_all_portals
    if req.portal == "all":
        results = search_all_portals(req.query, req.location, req.limit)
        total = sum(len(jobs) for jobs in results.values())
        return {"success": True, "results": results, "total": total}

    try:
        client = get_client(req.portal)
    except ValueError:
        raise HTTPException(400, f"Unknown portal: {req.portal}")

    jobs = client.search_jobs(req.query, req.location, req.limit)
    return {
        "success": True,
        "results": {req.portal: [j.to_dict() for j in jobs]},
        "total": len(jobs),
    }


@router.get("/jobs/portal-status")
def portal_status(user=Depends(get_current_user)):
    from app.job_board_clients import check_all_portals
    return check_all_portals()


# ─────────────────────────────────────────────
# Browser Automation
# ─────────────────────────────────────────────

class BrowserSessionRequest(BaseModel):
    proxy: str = ""
    headless: bool = True


class BrowserNavigateRequest(BaseModel):
    url: str


class BrowserFillFormRequest(BaseModel):
    field_data: dict


@router.post("/browser/start")
async def start_browser_session(req: BrowserSessionRequest, user=Depends(get_current_user)):
    from app.browser_automation import create_browser_session
    session = await create_browser_session(proxy=req.proxy, headless=req.headless)
    return {"success": True, "session_id": session._fingerprint}


@router.post("/browser/{session_id}/navigate")
async def browser_navigate(session_id: str, req: BrowserNavigateRequest,
                           user=Depends(get_current_user)):
    from app.browser_automation import get_browser_session
    session = await get_browser_session(session_id)
    if not session:
        raise HTTPException(404, "Browser session not found")
    return await session.navigate(req.url)


@router.post("/browser/{session_id}/fill-form")
async def browser_fill_form(session_id: str, req: BrowserFillFormRequest,
                            user=Depends(get_current_user)):
    from app.browser_automation import get_browser_session
    session = await get_browser_session(session_id)
    if not session:
        raise HTTPException(404, "Browser session not found")
    filled = await session.fill_simple_form(req.field_data)
    return {"success": True, "filled_fields": list(filled.keys())}


@router.post("/browser/{session_id}/detect-captcha")
async def detect_captcha(session_id: str, user=Depends(get_current_user)):
    from app.browser_automation import get_browser_session
    session = await get_browser_session(session_id)
    if not session:
        raise HTTPException(404, "Browser session not found")
    has_captcha = await session.detect_captcha()
    return {"has_captcha": has_captcha}


@router.post("/browser/{session_id}/screenshot")
async def take_screenshot(session_id: str, user=Depends(get_current_user)):
    from app.browser_automation import get_browser_session
    session = await get_browser_session(session_id)
    if not session:
        raise HTTPException(404, "Browser session not found")
    path = await session.screenshot()
    return {"success": True, "path": path}


@router.post("/browser/{session_id}/submit")
async def browser_submit(session_id: str, user=Depends(get_current_user)):
    from app.browser_automation import get_browser_session
    session = await get_browser_session(session_id)
    if not session:
        raise HTTPException(404, "Browser session not found")
    return await session.submit_application()


@router.delete("/browser/{session_id}")
async def stop_browser(session_id: str, user=Depends(get_current_user)):
    from app.browser_automation import close_browser_session
    await close_browser_session(session_id)
    return {"success": True}


# ─────────────────────────────────────────────
# Notifications
# ─────────────────────────────────────────────

class NotificationRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    notification_type: str = "general"


@router.post("/notifications/send")
def send_notification(req: NotificationRequest, user=Depends(get_current_user)):
    from app.notification_service import get_notification_service, Notification
    svc = get_notification_service()
    return svc.send(Notification(
        to_email=req.to_email,
        subject=req.subject,
        body=req.body,
        notification_type=req.notification_type,
    ))


# ─────────────────────────────────────────────
# Analytics & Metrics
# ─────────────────────────────────────────────

@router.get("/analytics/metrics")
def get_metrics(user=Depends(get_current_user)):
    from app.analytics_service import get_metrics
    return get_metrics()


@router.get("/analytics/events")
def get_events(event_type: str = "", limit: int = Query(50, le=200),
               user=Depends(get_current_user)):
    from app.analytics_service import get_analytics
    return get_analytics().get_recent_events(event_type=event_type, limit=limit)


@router.post("/analytics/flush")
def flush_analytics(user=Depends(get_current_user)):
    from app.analytics_service import get_analytics
    get_analytics().flush()
    return {"success": True}
