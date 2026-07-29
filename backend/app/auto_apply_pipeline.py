import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.application_state_machine import ApplicationStateMachine, ApplicationStatus
from app.job_queue import job_queue, JobPriority
from app.job_recommender import recommend_jobs
from app.resume_tailor import tailor_resume
from app.cover_letter_generator import generate_cover_letter
from app.job_keyword_extractor import extract_keywords

logger = logging.getLogger(__name__)


@dataclass
class PipelineJobResult:
    job_title: str
    company: str
    portal: str
    match_pct: float
    status: str
    application_id: str = ""
    tailored_resume: str = ""
    cover_letter: str = ""
    keywords_added: list = field(default_factory=list)
    ats_score: float = 0
    error: str = ""
    queued: bool = False


@dataclass
class PipelineResult:
    total_jobs_found: int
    jobs_processed: int
    jobs_succeeded: int
    jobs_failed: int
    jobs_queued: int
    resume_words: int
    results: list = field(default_factory=list)
    error: str = ""


def run_pipeline(
    resume_text: str,
    user_id: str,
    user_name: str = "",
    current_role: str = "",
    experience: str = "",
    skills: str = "",
    max_jobs: int = 5,
    min_match: int = 40,
    auto_enqueue: bool = True,
    db: Session = None,
) -> PipelineResult:
    if not resume_text or len(resume_text.strip()) < 50:
        return PipelineResult(
            total_jobs_found=0, jobs_processed=0, jobs_succeeded=0,
            jobs_failed=0, jobs_queued=0, resume_words=0,
            error="Resume text too short (minimum 50 characters)",
        )

    resume_words = len(resume_text.split())

    try:
        matches = recommend_jobs(resume_text, min_match=min_match, top_n=max_jobs)
    except Exception as e:
        logger.exception("Job matching failed")
        return PipelineResult(
            total_jobs_found=0, jobs_processed=0, jobs_succeeded=0,
            jobs_failed=0, jobs_queued=0, resume_words=resume_words,
            error=f"Job matching failed: {str(e)}",
        )

    if not matches:
        return PipelineResult(
            total_jobs_found=0, jobs_processed=0, jobs_succeeded=0,
            jobs_failed=0, jobs_queued=0, resume_words=resume_words,
            error="No matching jobs found. Try lowering min_match or uploading a different resume.",
        )

    results = []
    succeeded = 0
    failed = 0
    queued = 0
    sm = ApplicationStateMachine(db) if db else None

    for match in matches[:max_jobs]:
        job = match.get("job", {})
        job_title = job.get("title", "Unknown")
        company = job.get("company", "Unknown")
        portal = job.get("portal", "generic")
        job_url = job.get("url", job.get("search_url", ""))
        job_desc = job.get("description", f"{job_title} at {company}")
        match_pct = match.get("match_pct", 0)

        result = PipelineJobResult(
            job_title=job_title, company=company, portal=portal,
            match_pct=match_pct, status="pending",
        )

        try:
            application_id = ""
            if sm:
                app_record = sm.create(
                    user_id=user_id,
                    job_title=job_title,
                    company_name=company,
                    job_url=job_url,
                    job_description=job_desc,
                    portal=portal,
                )
                application_id = app_record.id
                result.application_id = application_id

            tailored = tailor_resume(resume_text, job_desc)
            if tailored.get("success"):
                result.tailored_resume = tailored.get("tailored_resume", resume_text)
                result.keywords_added = tailored.get("keywords_added", [])
                result.ats_score = tailored.get("match_score", 0)
            else:
                result.tailored_resume = resume_text

            cl = generate_cover_letter(
                user_name=user_name or "Applicant",
                current_role=current_role,
                experience=experience,
                skills=skills,
                company_name=company,
                job_title=job_title,
                job_description=job_desc,
            )
            if cl.get("success"):
                result.cover_letter = cl.get("cover_letter", "")

            if sm and application_id:
                sm.update_tailored_data(
                    application_id=application_id,
                    tailored_resume=result.tailored_resume,
                    cover_letter=result.cover_letter,
                    keywords=result.keywords_added,
                    ats_score=result.ats_score,
                )
                sm.transition(
                    application_id=application_id,
                    new_status=ApplicationStatus.TAILORED,
                    details={"match_pct": match_pct, "keywords_count": len(result.keywords_added)},
                    user_id=user_id,
                )

            if auto_enqueue and db:
                try:
                    job_queue.enqueue(
                        job_type="auto_apply",
                        payload={
                            "application_id": application_id,
                            "job_title": job_title,
                            "company": company,
                            "portal": portal,
                            "job_url": job_url,
                            "tailored_resume": result.tailored_resume[:500],
                            "cover_letter": result.cover_letter[:500],
                        },
                        priority=JobPriority.NORMAL,
                        portal=portal,
                        user_id=user_id,
                    )
                    queued += 1
                    result.queued = True
                    if sm and application_id:
                        sm.transition(
                            application_id=application_id,
                            new_status=ApplicationStatus.QUEUED,
                            user_id=user_id,
                        )
                except Exception as qe:
                    logger.warning("Failed to enqueue job for %s: %s", company, qe)

            result.status = "success"
            succeeded += 1

        except Exception as e:
            logger.exception("Pipeline failed for %s at %s", job_title, company)
            result.status = "failed"
            result.error = str(e)
            failed += 1
            if sm and result.application_id:
                try:
                    sm.transition(
                        application_id=result.application_id,
                        new_status=ApplicationStatus.FAILED,
                        details={"error": str(e)},
                        user_id=user_id,
                    )
                except Exception:
                    pass

        results.append(result)

    return PipelineResult(
        total_jobs_found=len(matches),
        jobs_processed=len(results),
        jobs_succeeded=succeeded,
        jobs_failed=failed,
        jobs_queued=queued,
        resume_words=resume_words,
        results=results,
    )
