import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from app.profile_analyzer import analyze_profile
from app.job_recommender import recommend_jobs
from app.linkedin_scraper import fetch_profile_text
from app.ats_analyzer import analyze_ats
from app.resume_parser import extract_text_from_resume

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["legacy"])

MAX_TEXT_LENGTH = 50_000
MAX_URL_LENGTH = 2000
MAX_FILE_SIZE = 10 * 1024 * 1024

class AnalyzeRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=MAX_TEXT_LENGTH)

class FetchRequest(BaseModel):
    url: str = Field(min_length=5, max_length=MAX_URL_LENGTH)

class ATSRequest(BaseModel):
    resume_text: str = Field(min_length=10, max_length=MAX_TEXT_LENGTH)

@router.post("/analyze")
def profile_analyze(req: AnalyzeRequest):
    try:
        result = analyze_profile(req.profile_text)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/fetch-profile")
def linkedin_fetch(req: FetchRequest):
    try:
        result = fetch_profile_text(req.url)
        return result
    except Exception as e:
        logger.error(f"Fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recommend-jobs")
def job_recommend(req: AnalyzeRequest):
    try:
        matches = recommend_jobs(req.profile_text, min_match=10, top_n=12)
        return {"success": True, "data": matches}
    except Exception as e:
        logger.error(f"Recommend error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ats-analyze")
def ats_analyze_resume(req: ATSRequest):
    try:
        result = analyze_ats(req.resume_text)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"ATS error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-resume")
async def legacy_upload_resume(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    ext = file.filename.lower().split(".")[-1] if "." in file.filename else ""
    if ext not in ("pdf", "doc", "docx"):
        raise HTTPException(status_code=400, detail="Unsupported format. Please upload PDF or DOC/DOCX.")
    try:
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large. Max size is {MAX_FILE_SIZE // (1024*1024)}MB.")
        result = extract_text_from_resume(file.filename, contents, ext)
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Extraction failed"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
