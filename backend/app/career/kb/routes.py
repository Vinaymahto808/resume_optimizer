"""Knowledge-base API: domains, skill-gap roadmaps, interview banks and RAG answers."""
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.career import plans
from app.career.identity import get_profile
from app.career.kb import rag, service
from app.career.models import CreditUsage, SeekerProfile
from app.database import get_db

router = APIRouter(prefix="/api/career/kb", tags=["career-knowledge"])

FREE_DAILY_QUESTIONS = 20


def _domain_or_404(domain_id: str) -> dict:
    domain = service.get_domain(domain_id)
    if domain is None:
        raise HTTPException(status_code=404, detail="Unknown domain")
    return domain


@router.get("/domains")
def domains():
    return {"domains": service.list_domains()}


@router.get("/domains/{domain_id}")
def domain_detail(domain_id: str):
    d = _domain_or_404(domain_id)
    return {
        "id": d["id"], "name": d["name"], "summary": d["summary"], "titles": d["titles"], "skills": d["skills"],
        "ats_keywords": d["ats_keywords"], "certifications": d["certifications"], "roadmap": d["roadmap"],
        "projects": d["projects"], "resume_bullets": d["resume_bullets"],
        "concepts": [c["title"] for c in d["concepts"]],
        "interview_topics": sorted({q["topic"] for q in d["interview"]}),
    }


class GapBody(BaseModel):
    domain: Optional[str] = Field(default=None, max_length=60)
    resume_text: str = Field(default="", max_length=50_000)


@router.post("/gap")
def gap(body: GapBody, profile: SeekerProfile = Depends(get_profile)):
    """Skill gap and staged roadmap for a domain. Without a domain, the best fit for the resume is used."""
    resume = (body.resume_text or profile.resume_text or "").strip()
    detected = service.detect_domains(resume) if resume else []
    domain_id = body.domain or (detected[0]["id"] if detected else None)
    if not domain_id:
        raise HTTPException(status_code=400, detail="Pick a domain, or add your resume so we can detect it.")
    _domain_or_404(domain_id)
    return {**service.skill_gap(domain_id, resume), "detected": detected, "has_resume": bool(resume)}


@router.get("/interview")
def interview(domain: str, level: Optional[Literal["junior", "mid", "senior"]] = None,
              topic: Optional[str] = Query(default=None, max_length=80), limit: int = Query(default=20, ge=1, le=50)):
    _domain_or_404(domain)
    return {"domain": domain, "questions": service.interview_bank(domain, level=level, topic=topic, limit=limit)}


class AskBody(BaseModel):
    question: str = Field(min_length=3, max_length=1000)
    domain: Optional[str] = Field(default=None, max_length=60)


@router.post("/ask")
def ask(body: AskBody, profile: SeekerProfile = Depends(get_profile), db: Session = Depends(get_db)):
    if body.domain:
        _domain_or_404(body.domain)
    if plans.effective_plan(profile) == "free":
        asked = db.query(CreditUsage).filter(CreditUsage.client_id == profile.client_id,
                                             CreditUsage.action == "kb_ask", CreditUsage.day == plans.today()).count()
        if asked >= FREE_DAILY_QUESTIONS:
            raise HTTPException(status_code=402,
                                detail=f"Free plan includes {FREE_DAILY_QUESTIONS} knowledge questions a day.")
    result = rag.ask(body.question, domain=body.domain, resume_text=profile.resume_text or "")
    # Logged at zero cost: it counts toward the daily question cap, not the AI-credit quota.
    db.add(CreditUsage(client_id=profile.client_id, action="kb_ask", cost=0, day=plans.today()))
    db.commit()
    return result
