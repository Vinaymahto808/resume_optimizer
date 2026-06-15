import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.config import settings
from app.gemini_helper import analyze_with_gemini, match_job_with_gemini, suggest_jobs_with_gemini

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["ai"])

MAX_TEXT_LENGTH = 50_000

class AIAnalyzeRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=MAX_TEXT_LENGTH)

class AIMatchRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=MAX_TEXT_LENGTH)
    job_title: str = Field(max_length=500)
    job_description: str = Field(max_length=MAX_TEXT_LENGTH)

class AISuggestJobsRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=MAX_TEXT_LENGTH)

def get_api_key():
    key = getattr(settings, "GEMINI_API_KEY", "") or ""
    if not key:
        raise HTTPException(status_code=400, detail="GEMINI_API_KEY not configured in .env")
    return key

@router.post("/ai-analyze")
def ai_analyze(req: AIAnalyzeRequest):
    try:
        api_key = get_api_key()
        result = analyze_with_gemini(req.profile_text, api_key)
        if result is None:
            raise HTTPException(status_code=500, detail="AI analysis failed. Check your API key.")
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-match")
def ai_match(req: AIMatchRequest):
    try:
        api_key = get_api_key()
        result = match_job_with_gemini(req.profile_text, req.job_title, req.job_description, api_key)
        if result is None:
            raise HTTPException(status_code=500, detail="AI match failed. Check your API key.")
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI match error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-suggest-jobs")
def ai_suggest_jobs(req: AISuggestJobsRequest):
    try:
        api_key = get_api_key()
        result = suggest_jobs_with_gemini(req.profile_text, api_key)
        if result is None:
            raise HTTPException(status_code=500, detail="AI suggestion failed. Check your API key.")
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI suggest jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
