"""
Application State Machine — DB-backed job application lifecycle tracking.

State transitions:
  draft → tailored → queued → applying → applied → screening → interview → offer
                                        ↘ rejected
                                        ↘ failed (with retries)
  Any state → withdrawn

Features:
- Enforced valid transitions
- Event history per application
- Deduplication (same user + company + title)
- Retry logic for transient failures
"""

import logging
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.models_extended import (
    JobApplication, ApplicationEvent, ApplicationStatus, JobPortal,
)

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[ApplicationStatus, set[ApplicationStatus]] = {
    ApplicationStatus.DRAFT: {ApplicationStatus.TAILORED, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.TAILORED: {ApplicationStatus.QUEUED, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.QUEUED: {ApplicationStatus.APPLYING, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.APPLYING: {
        ApplicationStatus.APPLIED,
        ApplicationStatus.FAILED,
        ApplicationStatus.WITHDRAWN,
    },
    ApplicationStatus.APPLIED: {
        ApplicationStatus.SCREENING,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
    },
    ApplicationStatus.SCREENING: {
        ApplicationStatus.INTERVIEW,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
    },
    ApplicationStatus.INTERVIEW: {
        ApplicationStatus.OFFER,
        ApplicationStatus.REJECTED,
        ApplicationStatus.WITHDRAWN,
    },
    ApplicationStatus.OFFER: {ApplicationStatus.WITHDRAWN},
    ApplicationStatus.REJECTED: set(),
    ApplicationStatus.WITHDRAWN: set(),
    ApplicationStatus.FAILED: {ApplicationStatus.QUEUED, ApplicationStatus.WITHDRAWN},
}


class ApplicationStateMachine:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: str,
        job_title: str,
        company_name: str,
        job_url: str = "",
        job_description: str = "",
        portal: JobPortal = JobPortal.GENERIC,
        resume_id: str = "",
    ) -> JobApplication:
        existing = self._find_duplicate(user_id, company_name, job_title)
        if existing:
            logger.info("Duplicate application found: %s", existing.id)
            return existing

        app = JobApplication(
            user_id=user_id,
            job_title=job_title,
            company_name=company_name,
            job_url=job_url,
            job_description=job_description,
            portal=portal,
            resume_id=resume_id or None,
            status=ApplicationStatus.DRAFT,
        )
        self.db.add(app)
        self.db.commit()
        self.db.refresh(app)

        self._record_event(app.id, "created", None, ApplicationStatus.DRAFT)
        logger.info("Created application %s for %s at %s", app.id, job_title, company_name)
        return app

    def transition(
        self,
        application_id: str,
        new_status: ApplicationStatus,
        details: dict = None,
        user_id: str = "",
    ) -> JobApplication:
        app = self._get_app(application_id, user_id)
        if not app:
            raise ValueError(f"Application {application_id} not found")

        old_status = app.status
        allowed = VALID_TRANSITIONS.get(old_status, set())

        if new_status not in allowed:
            raise ValueError(
                f"Invalid transition: {old_status.value} → {new_status.value}. "
                f"Allowed: {[s.value for s in allowed]}"
            )

        app.status = new_status
        if new_status == ApplicationStatus.APPLIED:
            app.applied_at = datetime.utcnow()
        if new_status == ApplicationStatus.FAILED and details:
            app.error_message = details.get("error", "")
            app.retry_count += 1

        self.db.commit()

        self._record_event(
            application_id,
            "status_change",
            old_status,
            new_status,
            details or {},
        )

        logger.info("Application %s: %s → %s", application_id, old_status.value, new_status.value)
        return app

    def retry(self, application_id: str, user_id: str = "") -> JobApplication:
        app = self._get_app(application_id, user_id)
        if not app:
            raise ValueError(f"Application {application_id} not found")

        if app.retry_count >= app.max_retries:
            raise ValueError(f"Max retries ({app.max_retries}) exceeded for {application_id}")

        return self.transition(
            application_id,
            ApplicationStatus.QUEUED,
            details={"retry": True, "attempt": app.retry_count + 1},
            user_id=user_id,
        )

    def update_tailored_data(
        self,
        application_id: str,
        tailored_resume: str = "",
        cover_letter: str = "",
        keywords: list[str] = None,
        ats_score: float = 0,
    ):
        app = self.db.query(JobApplication).filter(JobApplication.id == application_id).first()
        if not app:
            return
        if tailored_resume:
            app.tailored_resume_text = tailored_resume
        if cover_letter:
            app.tailored_cover_letter = cover_letter
        if keywords:
            app.extracted_keywords = keywords
        if ats_score:
            app.ats_match_score = ats_score
        self.db.commit()

    def get(self, application_id: str, user_id: str = "") -> Optional[JobApplication]:
        return self._get_app(application_id, user_id)

    def list_by_user(
        self,
        user_id: str,
        status: Optional[ApplicationStatus] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[JobApplication]:
        query = (
            self.db.query(JobApplication)
            .filter(JobApplication.user_id == user_id)
            .order_by(JobApplication.created_at.desc())
        )
        if status:
            query = query.filter(JobApplication.status == status)
        return query.offset(offset).limit(limit).all()

    def get_events(self, application_id: str) -> list[dict]:
        events = (
            self.db.query(ApplicationEvent)
            .filter(ApplicationEvent.application_id == application_id)
            .order_by(ApplicationEvent.created_at.asc())
            .all()
        )
        return [
            {
                "id": e.id,
                "event_type": e.event_type,
                "old_status": e.old_status,
                "new_status": e.new_status,
                "details": e.details,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ]

    def get_stats(self, user_id: str) -> dict:
        apps = self.db.query(JobApplication).filter(JobApplication.user_id == user_id).all()
        total = len(apps)
        by_status = {}
        for a in apps:
            s = a.status.value
            by_status[s] = by_status.get(s, 0) + 1
        return {
            "total": total,
            "by_status": by_status,
            "applied": by_status.get("applied", 0),
            "interviews": by_status.get("interview", 0),
            "offers": by_status.get("offer", 0),
            "rejected": by_status.get("rejected", 0),
        }

    def _get_app(self, application_id: str, user_id: str = "") -> Optional[JobApplication]:
        query = self.db.query(JobApplication).filter(JobApplication.id == application_id)
        if user_id:
            query = query.filter(JobApplication.user_id == user_id)
        return query.first()

    def _find_duplicate(self, user_id: str, company: str, title: str) -> Optional[JobApplication]:
        return (
            self.db.query(JobApplication)
            .filter(
                JobApplication.user_id == user_id,
                JobApplication.company_name.ilike(company),
                JobApplication.job_title.ilike(title),
            )
            .first()
        )

    def _record_event(
        self,
        application_id: str,
        event_type: str,
        old_status: Optional[ApplicationStatus],
        new_status: ApplicationStatus,
        details: dict = None,
    ):
        event = ApplicationEvent(
            application_id=application_id,
            event_type=event_type,
            old_status=old_status.value if old_status else None,
            new_status=new_status.value,
            details=details or {},
        )
        self.db.add(event)
        self.db.commit()
