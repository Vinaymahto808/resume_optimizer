import os
import uuid
import logging
import tempfile
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.database import get_db
from app.models import User, Resume, PlanTier, Subscription
from app.auth import get_current_user
from app.config import settings
from app.ats_scorer import generate_dual_score_report, parse_resume
from app.resume_parser import extract_text_from_resume
from app.profile_analyzer import analyze_profile
from app.job_recommender import recommend_jobs
from app.linkedin_scraper import scrape_public_profile
from app.unified_profile import normalize_resume_text, normalize_linkedin_data, merge_profiles, profile_to_embedding_text
from app.rewrite_service import rewrite_bullet, rewrite_headline, rewrite_summary, generate_suggestions
from app.checklist import generate_optimization_checklist, build_action_plan, format_checklist_for_frontend
from app.task_manager import task_manager, run_ats_scan_task, run_full_audit_task
from app.skill_taxonomy import extract_skills, categorize_skills, score_skill_coverage
from app.embedding_service import compute_similarity_score, generate_embedding

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["v1"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024

class UnifiedScanResponse(BaseModel):
    task_id: str
    status: str
    message: str

class ScanStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int
    result: Optional[dict] = None

class RewriteBulletRequest(BaseModel):
    original_text: str = Field(min_length=5, max_length=2000)
    job_description: str = ""
    profile_context: str = ""

class RewriteHeadlineRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=50000)
    target_role: str = ""

class RewriteSummaryRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=50000)
    target_role: str = ""

class LinkedInScrapeRequest(BaseModel):
    url: str = Field(min_length=5, max_length=2000)

class MatchJobsRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=50000)
    min_match: float = 10.0
    top_n: int = 12

class SkillMatchRequest(BaseModel):
    profile_skills: list[str]
    job_skills: list[str]

class AnalyzeProfileRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=50000)

class ChecklistRequest(BaseModel):
    profile_text: Optional[str] = None
    ats_result: Optional[dict] = None
    target_role: str = ""

class UnifiedIngestRequest(BaseModel):
    resume_text: str = Field(min_length=10, max_length=50000)
    linkedin_url: str = ""

class SkillsExtractRequest(BaseModel):
    text: str = Field(min_length=10, max_length=50000)

class JobAnalyzeRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=50000)
    top_n: int = 5

def get_user_plan(user: User, db: Session) -> PlanTier:
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    return sub.plan if sub and sub.plan else PlanTier.FREE

def check_scan_limit(user: User, db: Session) -> bool:
    plan = get_user_plan(user, db)
    if plan == PlanTier.FREE:
        count = db.query(Resume).filter(Resume.user_id == user.id).count()
        return count < 1
    return True

@router.post("/upload", response_model=UnifiedScanResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files allowed")

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")

        if not check_scan_limit(user, db):
            raise HTTPException(status_code=403, detail="Free tier: 1 scan only. Upgrade to Pro.")

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        file_id = str(uuid.uuid4())
        file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}{ext}")
        with open(file_path, "wb") as f:
            f.write(content)

        task = task_manager.create_task("ats_scan", {"file_path": file_path})
        task_manager.start_processing(task.task_id, run_ats_scan_task)

        resume = Resume(
            user_id=user.id,
            filename=file.filename or "resume" + ext,
            file_path=file_path,
            ats_score=None,
            raw_text="",
            keywords_found="",
            keywords_missing="",
            suggestions="",
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)

        task.params["resume_id"] = resume.id

        return UnifiedScanResponse(
            task_id=task.task_id,
            status=task.status,
            message="Resume uploaded successfully. Scan in progress.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scan/{task_id}/status", response_model=ScanStatusResponse)
def get_scan_status(task_id: str):
    try:
        task = task_manager.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return ScanStatusResponse(
            task_id=task.task_id,
            status=task.status,
            progress=task.progress,
            result=task.result,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scan status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze")
def analyze(req: AnalyzeProfileRequest):
    try:
        result = analyze_profile(req.profile_text)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rewrite/bullet")
def rewrite_bullet_endpoint(req: RewriteBulletRequest):
    try:
        result = rewrite_bullet(
            req.original_text,
            job_description=req.job_description,
            profile_context=req.profile_context,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Rewrite bullet error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rewrite/headline")
def rewrite_headline_endpoint(req: RewriteHeadlineRequest):
    try:
        result = rewrite_headline(req.profile_text, target_role=req.target_role)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Rewrite headline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rewrite/summary")
def rewrite_summary_endpoint(req: RewriteSummaryRequest):
    try:
        result = rewrite_summary(req.profile_text, target_role=req.target_role)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Rewrite summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suggestions")
def suggestions(req: AnalyzeProfileRequest):
    try:
        result = generate_suggestions(req.profile_text)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Suggestions error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/linkedin/scrape")
def linkedin_scrape(req: LinkedInScrapeRequest):
    try:
        result = scrape_public_profile(req.url)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"LinkedIn scrape error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/linkedin/ingest")
def linkedin_ingest(req: LinkedInScrapeRequest):
    try:
        scraped = scrape_public_profile(req.url)
        if not scraped.get("success"):
            raise HTTPException(status_code=400, detail=scraped.get("error", "Failed to scrape LinkedIn profile"))
        unified = normalize_linkedin_data(scraped)
        embedding_text = profile_to_embedding_text(unified)
        return {
            "success": True,
            "data": unified.model_dump(),
            "embedding_text": embedding_text,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LinkedIn ingest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/upload-match")
async def jobs_upload_match(
    file: UploadFile = File(...),
    min_match: float = Query(10.0),
    top_n: int = Query(12),
):
    try:
        ext = os.path.splitext(file.filename or "")[1].lower()
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        if ext == ".txt":
            text = content.decode("utf-8", errors="replace").strip()
        else:
            parsed = extract_text_from_resume(file.filename or "resume" + ext, content, ext.lstrip("."))
            if not parsed.get("success"):
                raise HTTPException(status_code=400, detail=parsed.get("error", "Could not extract text from file"))
            text = (parsed.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="No text could be extracted from the file")
        matches = recommend_jobs(text, min_match=min_match, top_n=top_n)
        return {"success": True, "data": matches}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Job upload-match error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/match")
def jobs_match(req: MatchJobsRequest):
    try:
        matches = recommend_jobs(req.profile_text, min_match=req.min_match, top_n=req.top_n)
        return {"success": True, "data": matches}
    except Exception as e:
        logger.error(f"Job match error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/analyze")
def jobs_analyze(req: JobAnalyzeRequest):
    try:
        matches = recommend_jobs(req.profile_text, min_match=10, top_n=req.top_n)
        enriched = []
        for m in matches:
            job_text = m.get("job", "")
            similarity = compute_similarity_score(req.profile_text, job_text)
            matched_skills = m.get("matched_skills", [])
            missing_skills = m.get("missing_skills", [])
            skill_coverage = score_skill_coverage(matched_skills, missing_skills)
            enriched.append({
                "job": m.get("job"),
                "portal": m.get("portal", ""),
                "match_pct": m.get("match_pct", 0),
                "similarity_score": similarity,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills,
                "skill_coverage": skill_coverage,
            })
        enriched.sort(key=lambda x: x["match_pct"], reverse=True)
        return {"success": True, "data": enriched}
    except Exception as e:
        logger.error(f"Job analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/checklist")
def checklist(req: ChecklistRequest):
    try:
        if req.ats_result:
            result = generate_optimization_checklist(req.ats_result)
            formatted = format_checklist_for_frontend(result)
            return {"success": True, "data": formatted}
        elif req.profile_text:
            result = build_action_plan(req.profile_text, target_role=req.target_role)
            formatted = format_checklist_for_frontend(result.get("all_items", []))
            result["all_items"] = formatted
            return {"success": True, "data": result}
        else:
            raise HTTPException(status_code=400, detail="Provide either profile_text or ats_result")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Checklist error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skills/extract")
def skills_extract(req: SkillsExtractRequest):
    try:
        matched = extract_skills(req.text)
        categorized = categorize_skills(matched)
        return {
            "success": True,
            "data": {
                "skills": matched,
                "categories": categorized,
                "total": len(matched),
            },
        }
    except Exception as e:
        logger.error(f"Skills extract error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/skills/score")
def skills_score(req: SkillMatchRequest):
    try:
        result = score_skill_coverage(req.profile_skills, req.job_skills)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Skills score error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/unified/ingest")
def unified_ingest(req: UnifiedIngestRequest):
    try:
        resume_profile = normalize_resume_text(req.resume_text)
        linkedin_profile = None
        if req.linkedin_url:
            scraped = scrape_public_profile(req.linkedin_url)
            if scraped.get("success"):
                linkedin_profile = normalize_linkedin_data(scraped)

        if linkedin_profile:
            merged = merge_profiles(resume_profile, linkedin_profile)
        else:
            merged = resume_profile

        embedding_text = profile_to_embedding_text(merged)
        embedding = generate_embedding(embedding_text)

        return {
            "success": True,
            "data": merged.model_dump(),
            "embedding_text": embedding_text,
            "embedding": embedding,
        }
    except Exception as e:
        logger.error(f"Unified ingest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/unified/scan", response_model=UnifiedScanResponse)
def unified_scan(req: UnifiedIngestRequest):
    try:
        ingest = unified_ingest(req)
        profile_text = ingest["embedding_text"]
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write(profile_text)
            tmp_path = f.name

        task = task_manager.create_task("full_audit", {"file_path": tmp_path})
        task_manager.start_processing(task.task_id, run_full_audit_task)

        return UnifiedScanResponse(
            task_id=task.task_id,
            status=task.status,
            message="Full unified scan started. Poll /api/v1/scan/{task_id}/status for results.",
        )
    except Exception as e:
        logger.error(f"Unified scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
