import json
import uuid
from datetime import datetime
from app.resume_tailor import tailor_resume
from app.job_keyword_extractor import extract_keywords
from app.cover_letter_generator import generate_cover_letter


applications_store = {}


def run_auto_apply(
    resume_text: str,
    job_description: str,
    company_name: str = "",
    job_title: str = "",
    user_name: str = "",
    user_email: str = "",
    current_role: str = "",
    experience: str = "",
    skills: str = "",
) -> dict:
    application_id = str(uuid.uuid4())[:8]
    timestamp = datetime.utcnow().isoformat() + "Z"

    step1 = extract_keywords(job_description)
    step2 = tailor_resume(resume_text, job_description)
    step3 = generate_cover_letter(
        user_name=user_name,
        current_role=current_role,
        experience=experience,
        skills=skills,
        company_name=company_name,
        job_title=job_title,
        job_description=job_description,
    )

    application = {
        "application_id": f"APP-{application_id}",
        "status": "completed",
        "company": company_name or "Unknown Company",
        "job_title": job_title or "Unknown Position",
        "submitted_at": timestamp,
        "steps": {
            "keyword_extraction": {
                "status": "completed" if step1.get("success") else "failed",
                "data": step1,
            },
            "resume_tailoring": {
                "status": "completed" if step2.get("success") else "failed",
                "data": {
                    "match_score": step2.get("match_score", 0),
                    "changes_made": step2.get("changes_made", []),
                    "keywords_added": step2.get("keywords_added", []),
                    "tailored_resume": step2.get("tailored_resume", ""),
                },
            },
            "cover_letter": {
                "status": "completed" if step3.get("success") else "failed",
                "data": {
                    "cover_letter": step3.get("cover_letter", ""),
                    "key_points": step3.get("key_points", []),
                },
            },
        },
        "summary": {
            "ats_match_score": step2.get("match_score", 0),
            "keywords_extracted": len(step1.get("resume_keywords", [])),
            "resume_tailored": step2.get("success", False),
            "cover_letter_generated": step3.get("success", False),
        },
    }

    applications_store[application_id] = application

    return {
        "success": True,
        "application": application,
    }


def get_application(application_id: str) -> dict:
    app = applications_store.get(application_id)
    if app:
        return {"success": True, "application": app}
    return {"success": False, "error": "Application not found"}


def list_applications() -> dict:
    return {
        "success": True,
        "applications": list(applications_store.values()),
        "total": len(applications_store),
    }


def tailor_only(resume_text: str, job_description: str,
                company_name: str = "", job_title: str = "") -> dict:
    keywords_result = extract_keywords(job_description)
    tailor_result = tailor_resume(resume_text, job_description)

    return {
        "success": True,
        "tailored_resume": tailor_result.get("tailored_resume", ""),
        "match_score": tailor_result.get("match_score", 0),
        "changes_made": tailor_result.get("changes_made", []),
        "keywords_added": tailor_result.get("keywords_added", []),
        "jd_keywords": keywords_result.get("resume_keywords", []),
        "technical_skills": keywords_result.get("technical_skills", []),
        "soft_skills": keywords_result.get("soft_skills", []),
        "role_level": keywords_result.get("role_level", "mid"),
    }
