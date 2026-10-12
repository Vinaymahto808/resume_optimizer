"""Jobright-style AI recruiter: source candidates (uploaded resumes plus seekers
who opted in), rank them against a role, run fraud verification, and draft or
send outreach."""
import hashlib
import json
import re
from typing import Optional

from sqlalchemy import func

from app.career import vectors
from app.career.enrichment import detect_seniority
from app.career.fraud import check_candidate
from app.career.llm import llm_json
from app.career.matching import ProfileContext, score_job
from app.career.models import Candidate, PlatformJob, RecruiterRole, SeekerProfile
from app.career.skills import extract_skills

_NAME_LINE = re.compile(r"^[A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-.]+){1,3}$")


def guess_name(resume_text: str) -> str:
    for line in resume_text.splitlines()[:6]:
        line = line.strip()
        if _NAME_LINE.match(line) and len(line) < 50:
            return line
    return ""


def role_as_job(role: RecruiterRole) -> PlatformJob:
    """Transient PlatformJob so the seeker-side scorer can rank candidates."""
    text = f"{role.title}\n{role.description}"
    return PlatformJob(id=f"role-{role.id}", fingerprint="", source="recruiter", title=role.title,
                       company=role.company, location=role.location, description=role.description,
                       skills=role.skills, seniority=detect_seniority(role.title, role.description),
                       embedding=vectors.dumps(vectors.embed(text)), h1b_signal="unknown", remote=False)


def create_role(db, client_id: str, title: str, company: str, location: str, description: str) -> RecruiterRole:
    role = RecruiterRole(client_id=client_id, title=title, company=company, location=location,
                         description=description, skills=json.dumps(extract_skills(f"{title}\n{description}")))
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


def _others(db) -> list[dict]:
    rows = db.query(Candidate.name, Candidate.email, Candidate.resume_text).all()
    return [{"name": n or "", "email": e or "",
             "fingerprint": hashlib.sha1(re.sub(r"\s+", " ", (t or "").lower()).encode()).hexdigest()} for n, e, t in rows]


def add_candidate(db, role: RecruiterRole, resume_text: str, name: str = "", email: str = "",
                  source: str = "upload", seeker_client_id: str = "", use_llm: bool = True) -> Candidate:
    job = role_as_job(role)
    ctx = ProfileContext(None, resume_text=resume_text)
    match = score_job(ctx, job)
    fraud = check_candidate(resume_text, name=name, email=email, others=_others(db), use_llm=use_llm)
    cand = Candidate(role_id=role.id, source=source, seeker_client_id=seeker_client_id,
                     name=name or guess_name(resume_text) or "Unnamed candidate", email=fraud["email"],
                     phone=fraud["phone"], resume_text=resume_text, match_score=match["score"],
                     match_detail=json.dumps(match), fraud_score=fraud["risk_score"], fraud_verdict=fraud["verdict"],
                     fraud_flags=json.dumps(fraud["flags"]))
    db.add(cand)
    db.commit()
    db.refresh(cand)
    return cand


def source_from_platform(db, role: RecruiterRole, limit: int = 25, min_match: int = 40) -> list[Candidate]:
    """Pull in seekers who opted in to recruiter visibility, best matches first."""
    already = {cid for (cid,) in db.query(Candidate.seeker_client_id).filter(Candidate.role_id == role.id).all()}
    job = role_as_job(role)
    scored = []
    for profile in db.query(SeekerProfile).filter(SeekerProfile.open_to_recruiters.is_(True)).all():
        if profile.client_id in already or not (profile.resume_text or "").strip():
            continue
        scored.append((score_job(ProfileContext(profile), job)["score"], profile))
    scored.sort(key=lambda sp: -sp[0])
    added = []
    for score, profile in scored[:limit]:
        if score < min_match:
            break
        added.append(add_candidate(db, role, profile.resume_text, name=profile.full_name, email=profile.email,
                                   source="platform", seeker_client_id=profile.client_id, use_llm=False))
    return added


OUTREACH_PROMPT = """Write a short recruiting outreach email (under 120 words) from {company}'s recruiter to {name}
about the {title} role. Mention 1-2 specifics from their background that fit. Friendly, no hype, clear next step
(a 20-minute call). Return JSON: {{"subject": "...", "body": "..."}}

ROLE: {description}
CANDIDATE RESUME:
{resume}"""


def draft_outreach(role: RecruiterRole, cand: Candidate) -> dict:
    result = llm_json(OUTREACH_PROMPT.format(company=role.company or "our team", name=cand.name, title=role.title,
                                             description=role.description[:2000], resume=cand.resume_text[:3000]),
                      max_tokens=600, temperature=0.6)
    if result and result.get("body"):
        return {"subject": result.get("subject") or f"{role.title} at {role.company}", "body": result["body"]}
    detail = json.loads(cand.match_detail or "{}")
    skills = ", ".join(detail.get("matched_skills", [])[:3]) or "your background"
    first = cand.name.split(" ")[0] if cand.name else "there"
    body = (f"Hi {first},\n\nI'm hiring a {role.title}{' at ' + role.company if role.company else ''} and your experience "
            f"with {skills} stood out. The role focuses on {', '.join(json.loads(role.skills or '[]')[:4]) or 'work you have done before'}.\n\n"
            "Would you be open to a 20-minute call this week to see if it's a fit?\n\nBest,\nThe hiring team")
    return {"subject": f"{role.title}{' at ' + role.company if role.company else ''}", "body": body}


def send_outreach(cand: Candidate, subject: str, body: str) -> dict:
    if not cand.email:
        return {"success": False, "error": "Candidate has no email address"}
    from app.notification_service import Notification, get_notification_service
    return get_notification_service().send(Notification(to_email=cand.email, subject=subject, body=body,
                                                        notification_type="recruiter_outreach"))


def candidate_dict(cand: Candidate, include_resume: bool = False) -> dict:
    data = {
        "id": cand.id, "role_id": cand.role_id, "source": cand.source, "name": cand.name, "email": cand.email,
        "phone": cand.phone, "match_score": round(cand.match_score or 0),
        "match": json.loads(cand.match_detail or "{}"), "fraud_score": round(cand.fraud_score or 0),
        "fraud_verdict": cand.fraud_verdict, "fraud_flags": json.loads(cand.fraud_flags or "[]"),
        "status": cand.status, "outreach_message": cand.outreach_message,
        "created_at": cand.created_at.isoformat() if cand.created_at else None,
    }
    if include_resume:
        data["resume_text"] = cand.resume_text
    return data


def role_dict(db, role: RecruiterRole) -> dict:
    counts = dict(db.query(Candidate.status, func.count(Candidate.id)).filter(Candidate.role_id == role.id)
                  .group_by(Candidate.status).all())
    verified = db.query(func.count(Candidate.id)).filter(Candidate.role_id == role.id,
                                                         Candidate.fraud_verdict == "verified").scalar() or 0
    return {"id": role.id, "title": role.title, "company": role.company, "location": role.location,
            "description": role.description, "skills": json.loads(role.skills or "[]"), "status": role.status,
            "pipeline": counts, "candidates": sum(counts.values()), "verified": verified,
            "created_at": role.created_at.isoformat() if role.created_at else None}


def dashboard(db, client_id: str) -> dict:
    roles = db.query(RecruiterRole).filter(RecruiterRole.client_id == client_id).order_by(RecruiterRole.created_at.desc()).all()
    reach = db.query(func.count(SeekerProfile.client_id)).filter(SeekerProfile.open_to_recruiters.is_(True)).scalar() or 0
    role_ids = [r.id for r in roles]
    flagged = db.query(func.count(Candidate.id)).filter(Candidate.role_id.in_(role_ids),
                                                        Candidate.fraud_verdict == "high_risk").scalar() if role_ids else 0
    return {"roles": [role_dict(db, r) for r in roles], "talent_reach": reach, "fraud_blocked": flagged or 0}
