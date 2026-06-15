import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Resume, PlanTier, Subscription
from app.auth import get_current_user
from app.ats_scorer import calculate_ats_score
from app.profile_analyzer import keyword_match_analysis
from app.config import settings

router = APIRouter(prefix="/api/resumes", tags=["resumes"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024

class ResumeResponse(BaseModel):
    id: str
    filename: str
    ats_score: float | None
    created_at: str

class ResumeDetailResponse(ResumeResponse):
    keywords_found: list[str] | None
    keywords_missing: list[str] | None
    suggestions: list[str] | None
    breakdown: dict | None
    category_breakdown: dict | None
    word_count: int | None
    raw_text: str | None

def get_user_plan(user: User, db: Session) -> PlanTier:
    sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
    return sub.plan if sub and sub.plan else PlanTier.FREE

def check_scan_limit(user: User, db: Session) -> bool:
    plan = get_user_plan(user, db)
    if plan == PlanTier.FREE:
        count = db.query(Resume).filter(Resume.user_id == user.id).count()
        return count < 1
    return True

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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

    result = calculate_ats_score(file_path)

    resume = Resume(
        user_id=user.id,
        filename=file.filename or "resume" + ext,
        file_path=file_path,
        ats_score=result["ats_score"],
        raw_text=result.get("raw_text", ""),
        keywords_found=",".join(result["keywords_found"]),
        keywords_missing=",".join(result["keywords_missing"]),
        suggestions="\n".join(result["suggestions"]),
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    return {
        "id": resume.id,
        "ats_score": result["ats_score"],
        "breakdown": result["breakdown"],
        "keywords_found": result["keywords_found"],
        "keywords_missing": result["keywords_missing"],
        "suggestions": result["suggestions"],
        "word_count": result["word_count"],
    }

@router.get("/")
def list_resumes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resumes = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.created_at.desc()).all()
    return [
        ResumeResponse(
            id=r.id,
            filename=r.filename,
            ats_score=r.ats_score,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in resumes
    ]

@router.get("/{resume_id}")
def get_resume(
    resume_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    keywords_found = resume.keywords_found.split(",") if resume.keywords_found else []
    keywords_missing = resume.keywords_missing.split(",") if resume.keywords_missing else []
    suggestions = resume.suggestions.split("\n") if resume.suggestions else []

    cat_analysis = keyword_match_analysis(resume.raw_text or "")["categories"] if resume.raw_text else {}

    return ResumeDetailResponse(
        id=resume.id,
        filename=resume.filename,
        ats_score=resume.ats_score,
        keywords_found=keywords_found,
        keywords_missing=keywords_missing,
        suggestions=suggestions,
        breakdown={},
        category_breakdown=cat_analysis,
        word_count=len((resume.raw_text or "").split()),
        raw_text=resume.raw_text,
        created_at=resume.created_at.isoformat() if resume.created_at else "",
    )

@router.delete("/{resume_id}")
def delete_resume(
    resume_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)
    db.delete(resume)
    db.commit()
    return {"status": "deleted"}
