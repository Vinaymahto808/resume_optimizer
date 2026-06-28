import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.config import settings
from app.groq_helper import (
    analyze_with_groq, match_job_with_groq, suggest_jobs_with_groq,
    generate_career_roadmap, generate_portfolio_html, generate_analytics_suggestions,
)

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

class AIRoadmapRequest(BaseModel):
    target_role: str = Field(min_length=2, max_length=200)

class AIPortfolioRequest(BaseModel):
    resume_text: str = Field(min_length=20, max_length=MAX_TEXT_LENGTH)

class AIAnalyticsRequest(BaseModel):
    profile_text: str = Field(min_length=10, max_length=MAX_TEXT_LENGTH)

def get_api_key():
    key = getattr(settings, "GROQ_API_KEY", "") or ""
    if not key:
        raise HTTPException(status_code=400, detail="GROQ_API_KEY not configured in .env")
    return key

@router.post("/ai-analyze")
def ai_analyze(req: AIAnalyzeRequest):
    try:
        api_key = get_api_key()
        result = analyze_with_groq(req.profile_text, api_key)
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
        result = match_job_with_groq(req.profile_text, req.job_title, req.job_description, api_key)
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
        result = suggest_jobs_with_groq(req.profile_text, api_key)
        if result is None:
            raise HTTPException(status_code=500, detail="AI suggestion failed. Check your API key.")
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI suggest jobs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-roadmap")
def ai_roadmap(req: AIRoadmapRequest):
    try:
        api_key = get_api_key()
        result = generate_career_roadmap(req.target_role, api_key)
        if result is None or "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error", "Roadmap generation failed."))
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI roadmap error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-portfolio")
def ai_portfolio(req: AIPortfolioRequest):
    try:
        api_key = get_api_key()
        result = generate_portfolio_html(req.resume_text, api_key)
        if result is None or "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error", "Portfolio generation failed."))
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI portfolio error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-analytics")
def ai_analytics(req: AIAnalyticsRequest):
    try:
        api_key = get_api_key()
        result = generate_analytics_suggestions(req.profile_text, api_key)
        if result is None or "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error", "Analytics generation failed."))
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI analytics error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════
#  Resume Builder AI Endpoints
# ═══════════════════════════════════════════

class AIOptimizeResumeRequest(BaseModel):
    resume_data: dict = {}
    job_description: str = ""
    focus_areas: list[str] = []

class AIOptimizeBulletRequest(BaseModel):
    bullet_text: str = Field(min_length=5, max_length=1000)
    job_description: str = ""
    context: str = ""

class AIGenerateSummaryRequest(BaseModel):
    resume_data: dict = {}
    target_role: str = ""
    job_description: str = ""


@router.post("/ai-optimize-resume")
def ai_optimize_resume(req: AIOptimizeResumeRequest):
    try:
        api_key = get_api_key()
        from app.groq_helper import optimize_resume_with_groq
        result = optimize_resume_with_groq(req.resume_data, req.job_description, api_key)
        if result is None or "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error", "Resume optimization failed."))
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI optimize resume error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-optimize-bullet")
def ai_optimize_bullet(req: AIOptimizeBulletRequest):
    try:
        api_key = get_api_key()
        from app.groq_helper import optimize_bullet_with_groq
        result = optimize_bullet_with_groq(req.bullet_text, req.job_description, api_key)
        if result is None or "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error", "Bullet optimization failed."))
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI optimize bullet error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-generate-summary")
def ai_generate_summary(req: AIGenerateSummaryRequest):
    try:
        api_key = get_api_key()
        from app.groq_helper import generate_summary_with_groq
        result = generate_summary_with_groq(req.resume_data, req.target_role, api_key)
        if result is None or "error" in result:
            raise HTTPException(status_code=500, detail=result.get("error", "Summary generation failed."))
        return {"success": True, "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI generate summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
