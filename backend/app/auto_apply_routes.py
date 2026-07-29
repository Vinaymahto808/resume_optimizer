from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.config import settings
from app.models import User
from app.database import get_db
from sqlalchemy.orm import Session
from app.auto_apply_orchestrator import (
    run_auto_apply,
    get_application,
    list_applications,
    tailor_only,
)

router = APIRouter(prefix="/api/auto-apply", tags=["Auto Apply"])


class TailorRequest(BaseModel):
    resume_text: str
    job_description: str
    company_name: Optional[str] = ""
    job_title: Optional[str] = ""


class AutoApplyRequest(BaseModel):
    resume_text: str
    job_description: str
    company_name: Optional[str] = ""
    job_title: Optional[str] = ""
    user_name: Optional[str] = ""
    user_email: Optional[str] = ""
    current_role: Optional[str] = ""
    experience: Optional[str] = ""
    skills: Optional[str] = ""


class ExtractKeywordsRequest(BaseModel):
    job_description: str


class CoverLetterRequest(BaseModel):
    user_name: Optional[str] = ""
    current_role: Optional[str] = ""
    experience: Optional[str] = ""
    skills: Optional[str] = ""
    company_name: str
    job_title: str
    job_description: str


@router.post("/tailor")
def tailor_resume_endpoint(req: TailorRequest, user=Depends(get_current_user)):
    if not req.resume_text or not req.job_description:
        raise HTTPException(status_code=400, detail="resume_text and job_description are required")
    result = tailor_only(
        resume_text=req.resume_text,
        job_description=req.job_description,
        company_name=req.company_name,
        job_title=req.job_title,
    )
    return result


@router.post("/apply")
def auto_apply_endpoint(req: AutoApplyRequest, user=Depends(get_current_user)):
    if not req.resume_text or not req.job_description:
        raise HTTPException(status_code=400, detail="resume_text and job_description are required")
    result = run_auto_apply(
        resume_text=req.resume_text,
        job_description=req.job_description,
        company_name=req.company_name,
        job_title=req.job_title,
        user_name=req.user_name or user.get("full_name", ""),
        user_email=req.user_email or user.get("email", ""),
        current_role=req.current_role,
        experience=req.experience,
        skills=req.skills,
    )
    return result


@router.post("/extract-keywords")
def extract_keywords_endpoint(req: ExtractKeywordsRequest, user=Depends(get_current_user)):
    if not req.job_description:
        raise HTTPException(status_code=400, detail="job_description is required")
    from app.job_keyword_extractor import extract_keywords
    result = extract_keywords(req.job_description)
    return result


@router.post("/cover-letter")
def generate_cover_letter_endpoint(req: CoverLetterRequest, user=Depends(get_current_user)):
    if not req.job_description:
        raise HTTPException(status_code=400, detail="job_description is required")
    from app.cover_letter_generator import generate_cover_letter
    result = generate_cover_letter(
        user_name=req.user_name,
        current_role=req.current_role,
        experience=req.experience,
        skills=req.skills,
        company_name=req.company_name,
        job_title=req.job_title,
        job_description=req.job_description,
    )
    return result


@router.get("/applications")
def list_applications_endpoint(user=Depends(get_current_user)):
    return list_applications()


@router.get("/applications/{application_id}")
def get_application_endpoint(application_id: str, user=Depends(get_current_user)):
    result = get_application(application_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail="Application not found")
    return result


class PipelineRequest(BaseModel):
    resume_text: str
    user_name: Optional[str] = ""
    current_role: Optional[str] = ""
    experience: Optional[str] = ""
    skills: Optional[str] = ""
    max_jobs: Optional[int] = 5
    min_match: Optional[int] = 40
    auto_enqueue: Optional[bool] = True


@router.post("/pipeline")
def run_pipeline_endpoint(
    req: PipelineRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not req.resume_text or len(req.resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume text must be at least 50 characters")
    from app.auto_apply_pipeline import run_pipeline
    result = run_pipeline(
        resume_text=req.resume_text,
        user_id=user.id,
        user_name=req.user_name or user.full_name or "",
        current_role=req.current_role,
        experience=req.experience,
        skills=req.skills,
        max_jobs=req.max_jobs,
        min_match=req.min_match,
        auto_enqueue=req.auto_enqueue,
        db=db,
    )
    return {
        "success": True,
        "total_jobs_found": result.total_jobs_found,
        "jobs_processed": result.jobs_processed,
        "jobs_succeeded": result.jobs_succeeded,
        "jobs_failed": result.jobs_failed,
        "jobs_queued": result.jobs_queued,
        "resume_words": result.resume_words,
        "error": result.error,
        "results": [
            {
                "job_title": r.job_title,
                "company": r.company,
                "portal": r.portal,
                "match_pct": r.match_pct,
                "status": r.status,
                "application_id": r.application_id,
                "tailored_resume": r.tailored_resume,
                "cover_letter": r.cover_letter,
                "keywords_added": r.keywords_added,
                "ats_score": r.ats_score,
                "queued": r.queued,
                "error": r.error,
            }
            for r in result.results
        ],
    }


@router.post("/pipeline/upload")
async def run_pipeline_with_upload(
    file: UploadFile = File(...),
    user_name: str = "",
    current_role: str = "",
    experience: str = "",
    skills: str = "",
    max_jobs: int = 5,
    min_match: int = 40,
    auto_enqueue: bool = True,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "docx", "doc", "txt"):
        raise HTTPException(status_code=400, detail="Unsupported file format. Use PDF, DOCX, or TXT.")
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    from app.resume_parser import extract_text_from_resume
    parsed = extract_text_from_resume(file.filename, file_bytes, ext, groq_api_key=settings.GROQ_API_KEY)
    if not parsed.get("success"):
        raise HTTPException(status_code=400, detail=f"Failed to parse resume: {parsed.get('error', 'unknown')}")
    resume_text = parsed["text"]
    from app.auto_apply_pipeline import run_pipeline
    result = run_pipeline(
        resume_text=resume_text,
        user_id=user.id,
        user_name=user_name or user.full_name or "",
        current_role=current_role,
        experience=experience,
        skills=skills,
        max_jobs=max_jobs,
        min_match=min_match,
        auto_enqueue=auto_enqueue,
        db=db,
    )
    return {
        "success": True,
        "resume_parsed": True,
        "resume_words": result.resume_words,
        "total_jobs_found": result.total_jobs_found,
        "jobs_processed": result.jobs_processed,
        "jobs_succeeded": result.jobs_succeeded,
        "jobs_failed": result.jobs_failed,
        "jobs_queued": result.jobs_queued,
        "error": result.error,
        "results": [
            {
                "job_title": r.job_title,
                "company": r.company,
                "portal": r.portal,
                "match_pct": r.match_pct,
                "status": r.status,
                "application_id": r.application_id,
                "tailored_resume": r.tailored_resume,
                "cover_letter": r.cover_letter,
                "keywords_added": r.keywords_added,
                "ats_score": r.ats_score,
                "queued": r.queued,
                "error": r.error,
            }
            for r in result.results
        ],
    }
