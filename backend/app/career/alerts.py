"""Early-posting job alerts: after each ingestion run, score new postings
against every alert's filters and the owner's resume, store hits, and email a
digest when an address is set."""
import logging
from datetime import datetime

from app.career.matching import ProfileContext, score_job
from app.career.models import AlertHit, JobAlert, PlatformJob, SeekerProfile

logger = logging.getLogger(__name__)


def _matches_filters(alert: JobAlert, job: PlatformJob) -> bool:
    if alert.remote_only and not job.remote:
        return False
    if alert.h1b_only and not job.h1b_sponsor:
        return False
    if not job.verified:
        return False
    if alert.location and alert.location.lower() not in (job.location or "").lower() and not job.remote:
        return False
    if alert.query:
        hay = f"{job.title} {job.company} {job.skills}".lower()
        if not all(term in hay for term in alert.query.lower().split()):
            return False
    return True


def evaluate_alert(db, alert: JobAlert, profile: SeekerProfile) -> list[AlertHit]:
    since = alert.last_checked_at or alert.created_at
    jobs = db.query(PlatformJob).filter(PlatformJob.active.is_(True), PlatformJob.ingested_at > since).limit(2000).all()
    ctx = ProfileContext(profile)
    hits = []
    seen = {jid for (jid,) in db.query(AlertHit.job_id).filter(AlertHit.alert_id == alert.id).all()}
    for job in jobs:
        if job.id in seen or not _matches_filters(alert, job):
            continue
        score = score_job(ctx, job)["score"] if ctx.resume_text else 0
        if ctx.resume_text and score < alert.min_match:
            continue
        hit = AlertHit(alert_id=alert.id, client_id=alert.client_id, job_id=job.id, match_score=score)
        db.add(hit)
        hits.append((hit, job))
    alert.last_checked_at = datetime.utcnow()
    db.commit()
    if hits and alert.email:
        _send_digest(alert, profile, hits)
    return [h for h, _ in hits]


def _send_digest(alert: JobAlert, profile: SeekerProfile, hits) -> None:
    try:
        from app.notification_service import Notification, get_notification_service
        top = sorted(hits, key=lambda hj: -hj[0].match_score)[:10]
        body = "\n".join(f"- {job.title} at {job.company} ({job.location or 'Remote'}) {hit.match_score}% match\n  {job.url}"
                         for hit, job in top)
        get_notification_service().send(Notification(
            to_email=alert.email, subject=f"{len(hits)} new jobs for \"{alert.name}\"",
            body=f"Hi {profile.full_name or 'there'},\n\nNew postings matching your alert:\n\n{body}\n\nApply early!",
            notification_type="job_alert"))
    except Exception as exc:
        logger.warning("Alert digest failed: %s", exc)


def evaluate_all(db) -> int:
    total = 0
    for alert in db.query(JobAlert).all():
        profile = db.get(SeekerProfile, alert.client_id)
        if profile:
            total += len(evaluate_alert(db, alert, profile))
    return total
