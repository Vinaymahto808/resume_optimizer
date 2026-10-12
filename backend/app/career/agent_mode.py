"""Background Agent Mode: apply to matching jobs without clicks.

After each ingestion run (and on demand) the agent picks new jobs that pass the
seeker's rules, runs the auto-apply agent on each, and queues the result:

    queued -> prepared -> needs_review -> submitted | failed

Default behaviour is "prepare and notify": every packet waits for the user.
Unattended submission is only offered for ATS types with predictable public
forms (Greenhouse, Lever), only behind the explicit auto_submit opt-in, and
never when the posting is unverified or required answers are missing. Those
tasks are handed to the user's own browser (Chrome extension), which reports
the outcome back; the server never posts applications itself.
"""
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException

from app.career import agents, plans
from app.career.autofill import profile_values
from app.career.matching import ProfileContext, job_to_dict, score_job
from app.career.models import (
    AgentSettings, AgentTask, JobDecision, PlatformJob, SeekerProfile, TrackedApplication,
)

logger = logging.getLogger(__name__)

STATUSES = ("queued", "prepared", "needs_review", "submitted", "failed")
AUTO_SUBMIT_ATS = {"greenhouse", "lever"}
# Answers almost every ATS form requires. Missing any of them blocks unattended submission.
REQUIRED_ANSWERS = {
    "first_name": "First name", "last_name": "Last name", "email": "Email", "phone": "Phone",
    "work_authorized": "Work authorization", "needs_sponsorship": "Visa sponsorship",
}
CANDIDATE_SCAN = 2000


# ------------------------------------------------------------ settings ----

def get_settings(db, client_id: str) -> AgentSettings:
    row = db.get(AgentSettings, client_id)
    if row is None:
        row = AgentSettings(client_id=client_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def settings_dict(row: AgentSettings) -> dict:
    return {
        "enabled": bool(row.enabled), "min_match": row.min_match, "roles": json.loads(row.roles or "[]"),
        "locations": json.loads(row.locations or "[]"), "remote_only": bool(row.remote_only),
        "h1b_only": bool(row.h1b_only), "daily_cap": row.daily_cap, "auto_submit": bool(row.auto_submit),
        "auto_submit_ats": sorted(AUTO_SUBMIT_ATS),
        "last_run_at": row.last_run_at.isoformat() if row.last_run_at else None,
    }


def update_settings(db, profile: SeekerProfile, data: dict) -> AgentSettings:
    row = get_settings(db, profile.client_id)
    if data.get("enabled") or data.get("auto_submit"):
        plans.require_feature(profile, "agent_mode")
    for key in ("roles", "locations"):
        if key in data:
            data[key] = json.dumps([s.strip() for s in data[key] if s and s.strip()])
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    return row


# --------------------------------------------------------------- tasks ----

def _log(task: AgentTask, step: str, status: str, detail: str = "") -> None:
    entries = json.loads(task.log or "[]")
    entries.append({"at": datetime.utcnow().isoformat(), "step": step, "status": status, "detail": detail})
    task.log = json.dumps(entries[-50:])


def _set_status(task: AgentTask, status: str, reason: str = "") -> None:
    task.status = status
    task.reason = reason[:300]
    task.updated_at = datetime.utcnow()


def task_dict(db, task: AgentTask, include_log: bool = True) -> dict:
    job = db.get(PlatformJob, task.job_id)
    out = {
        "id": task.id, "job_id": task.job_id, "application_id": task.application_id, "status": task.status,
        "match_score": task.match_score, "submit_channel": task.submit_channel, "reason": task.reason,
        "day": task.day, "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        "job": job_to_dict(job) if job else None,
    }
    if include_log:
        out["log"] = json.loads(task.log or "[]")
    return out


def task_or_404(db, client_id: str, task_id: str) -> AgentTask:
    task = db.get(AgentTask, task_id)
    if not task or task.client_id != client_id:
        raise HTTPException(status_code=404, detail="Agent task not found")
    return task


def missing_answers(profile: SeekerProfile) -> list[str]:
    values = profile_values(profile)
    return [label for key, label in REQUIRED_ANSWERS.items() if not str(values.get(key) or "").strip()]


def today_summary(db, client_id: str) -> dict:
    rows = db.query(AgentTask.status).filter(AgentTask.client_id == client_id, AgentTask.day == plans.today()).all()
    counts = {s: 0 for s in STATUSES}
    for (status,) in rows:
        counts[status] = counts.get(status, 0) + 1
    return {"day": plans.today(), "total": len(rows), "by_status": counts}


# ------------------------------------------------------------ selection ----

def _passes_rules(rules: dict, job: PlatformJob) -> bool:
    if not job.verified or not job.active:
        return False
    if rules["remote_only"] and not job.remote:
        return False
    if rules["h1b_only"] and not job.h1b_sponsor:
        return False
    title = (job.title or "").lower()
    if rules["roles"] and not any(r.lower() in title for r in rules["roles"]):
        return False
    loc = (job.location or "").lower()
    if rules["locations"] and not job.remote and not any(l.lower() in loc for l in rules["locations"]):
        return False
    return True


def pick_jobs(db, profile: SeekerProfile, rules: dict, limit: int) -> list[tuple[PlatformJob, int]]:
    if limit <= 0:
        return []
    cid = profile.client_id
    excluded = {jid for (jid,) in db.query(AgentTask.job_id).filter(AgentTask.client_id == cid).all()}
    excluded |= {jid for (jid,) in db.query(JobDecision.job_id).filter(JobDecision.client_id == cid).all()}
    excluded |= {jid for (jid,) in db.query(TrackedApplication.job_id).filter(
        TrackedApplication.client_id == cid, TrackedApplication.job_id.isnot(None)).all()}
    jobs = db.query(PlatformJob).filter(PlatformJob.active.is_(True), PlatformJob.verified.is_(True)).order_by(
        PlatformJob.ingested_at.desc()).limit(CANDIDATE_SCAN).all()
    ctx = ProfileContext(profile)
    picked = []
    for job in jobs:
        if job.id in excluded or not _passes_rules(rules, job):
            continue
        match = score_job(ctx, job)
        if match["score"] >= rules["min_match"] and not match.get("sponsorship_blocked"):
            picked.append((job, match["score"]))
    picked.sort(key=lambda jm: -jm[1])
    return picked[:limit]


# ------------------------------------------------------------- running ----

def process_task(db, profile: SeekerProfile, row: AgentSettings, task: AgentTask, job: PlatformJob) -> None:
    """Advance one queued task as far as the rules allow."""
    if not job.verified:
        _log(task, "verify", "stopped", "Posting failed verification")
        _set_status(task, "failed", "Posting failed verification: " + ", ".join(json.loads(job.verification_flags or "[]")))
        return
    _log(task, "verify", "done", "Listing verified")
    try:
        plans.charge(db, profile, "auto_apply")
    except HTTPException as exc:
        _log(task, "credits", "stopped", str(exc.detail))
        _set_status(task, "failed", "Out of AI credits")
        raise
    try:
        result = agents.auto_apply(db, profile, job, row.min_match)
    except Exception as exc:
        logger.exception("Agent auto_apply failed for %s", job.id)
        plans.refund(db, profile, "auto_apply")
        _log(task, "prepare", "error", "Could not prepare the application")
        _set_status(task, "failed", f"Preparation error: {exc.__class__.__name__}")
        return
    for step in result["steps"]:
        _log(task, step["step"], step["status"], step.get("detail", ""))
    if result["status"] != "ready":
        plans.refund(db, profile, "auto_apply")
        _set_status(task, "failed", result["steps"][-1].get("detail", "Skipped"))
        return
    task.application_id = result["application"]["id"]
    _set_status(task, "prepared")

    missing = missing_answers(profile)
    ats = (job.ats_platform or "").lower()
    if missing:
        _log(task, "review", "blocked", "Missing required answers: " + ", ".join(missing))
        _set_status(task, "needs_review", "Add these to your profile: " + ", ".join(missing))
    elif not row.auto_submit:
        _log(task, "review", "waiting", "Packet ready. Review and submit.")
        _set_status(task, "needs_review", "Ready for your review")
    elif ats not in AUTO_SUBMIT_ATS:
        _log(task, "review", "waiting", f"Auto-submit isn't supported for {ats or 'this site'}")
        _set_status(task, "needs_review", "This site needs a manual submit")
    else:
        task.submit_channel = "extension"
        _log(task, "submit", "pending", f"Queued for unattended {ats} submission in your browser")


def run_for_client(db, profile: SeekerProfile, row: Optional[AgentSettings] = None, force: bool = False) -> dict:
    row = row or get_settings(db, profile.client_id)
    if not (row.enabled or force):
        return {"skipped": "Agent is off"}
    if plans.effective_plan(profile) != "turbo":
        return {"skipped": "Agent Mode is a Turbo feature"}
    if len((profile.resume_text or "").strip()) < 50:
        return {"skipped": "Add your resume first"}
    rules = settings_dict(row)
    used = today_summary(db, profile.client_id)["total"]
    picked = pick_jobs(db, profile, rules, row.daily_cap - used)
    stats = {"queued": 0, "needs_review": 0, "pending_submit": 0, "failed": 0}
    for job, score in picked:
        task = AgentTask(client_id=profile.client_id, job_id=job.id, match_score=score, day=plans.today())
        _log(task, "queued", "done", f"{score}% match")
        db.add(task)
        db.commit()
        stats["queued"] += 1
        try:
            process_task(db, profile, row, task, job)
        except HTTPException:
            db.commit()
            stats["failed"] += 1
            break
        db.commit()
        if task.status == "needs_review":
            stats["needs_review"] += 1
        elif task.status == "failed":
            stats["failed"] += 1
        elif task.submit_channel == "extension":
            stats["pending_submit"] += 1
    row.last_run_at = datetime.utcnow()
    db.commit()
    if stats["needs_review"] and profile.email:
        _notify(profile, stats)
    return stats


def _notify(profile: SeekerProfile, stats: dict) -> None:
    try:
        from app.notification_service import Notification, get_notification_service
        get_notification_service().send(Notification(
            to_email=profile.email, subject=f"{stats['needs_review']} applications ready for review",
            body=(f"Hi {profile.full_name or 'there'},\n\nYour ProfileOptimizer agent prepared "
                  f"{stats['needs_review']} application(s) that need a quick review before they go out. "
                  "Open the Agent panel to check and submit them."),
            notification_type="agent_review"))
    except Exception as exc:
        logger.warning("Agent notification failed: %s", exc)


def run_all(db) -> int:
    """Scheduler entry point: run every enabled agent. Returns the number of tasks queued."""
    total = 0
    for row in db.query(AgentSettings).filter(AgentSettings.enabled.is_(True)).all():
        profile = db.get(SeekerProfile, row.client_id)
        if not profile:
            continue
        try:
            total += run_for_client(db, profile, row).get("queued", 0)
        except Exception as exc:
            db.rollback()
            logger.exception("Agent run failed for %s: %s", row.client_id, exc)
    return total


# --------------------------------------------------------- user actions ----

def resolve(db, profile: SeekerProfile, task: AgentTask, outcome: str, detail: str = "", source: str = "user") -> AgentTask:
    """Close a task: 'submitted' (user or extension confirmed) or 'failed' (dismissed / extension error)."""
    if source == "extension" and (task.status != "prepared" or task.submit_channel != "extension"):
        raise HTTPException(status_code=409, detail="Task isn't waiting for a browser submission")
    if outcome == "submitted":
        if task.status not in ("prepared", "needs_review"):
            raise HTTPException(status_code=409, detail=f"Can't submit a task that is {task.status}")
        app = db.get(TrackedApplication, task.application_id) if task.application_id else None
        if app and app.client_id == profile.client_id and app.stage == "Wishlist":
            app.stage = "Applied"
            app.applied_at = datetime.utcnow()
        _log(task, "submit", "done", detail or ("Submitted from your browser" if source == "extension" else "Marked submitted"))
        _set_status(task, "submitted")
    else:
        _log(task, "submit" if source == "extension" else "dismiss", "failed", detail or "Dismissed")
        if source == "extension":
            # Browser submission failed: fall back to a manual review rather than dropping the job.
            task.submit_channel = ""
            _set_status(task, "needs_review", detail or "Automatic submit failed. Please submit manually.")
        else:
            _set_status(task, "failed", detail or "Dismissed by you")
    db.commit()
    return task


def pending_submissions(db, client_id: str) -> list[AgentTask]:
    return db.query(AgentTask).filter(AgentTask.client_id == client_id, AgentTask.status == "prepared",
                                      AgentTask.submit_channel == "extension").order_by(AgentTask.created_at).limit(10).all()
