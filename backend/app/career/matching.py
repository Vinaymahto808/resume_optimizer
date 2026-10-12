"""AI Job Match: vector recall + skill-based scoring + preference fit, with an
optional LLM re-score for a single job ("deep match")."""
import json
import re
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import or_

from app.career import vectors
from app.career.llm import llm_json
from app.career.models import JobDecision, PlatformJob, SeekerProfile
from app.career.skills import extract_skills

WEIGHTS = {"skills": 0.45, "semantic": 0.30, "title": 0.15, "preferences": 0.10}
_SENIORITY_ORDER = ["intern", "entry", "mid", "senior", "lead"]


def parse_prefs(profile: Optional[SeekerProfile]) -> dict:
    if not profile or not profile.preferences:
        return {}
    try:
        prefs = json.loads(profile.preferences)
        return prefs if isinstance(prefs, dict) else {}
    except ValueError:
        return {}


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z][a-z+#.]+", (text or "").lower()) if len(w) > 2}


def _semantic_score(cos: float, dim: int) -> float:
    if dim == vectors.LOCAL_DIM:
        return max(0.0, min(1.0, (cos - 0.04) / 0.36))
    return max(0.0, min(1.0, (cos - 0.70) / 0.20))


_MAX_CANDIDATES = 2000


def _tier(score: int) -> str:
    return "strong" if score >= 75 else "good" if score >= 60 else "fair" if score >= 45 else "stretch"


def match_label(score: int) -> str:
    if score >= 75:
        return "Strong match"
    if score >= 60:
        return "Good match"
    if score >= 45:
        return "Fair match"
    return "Stretch"


class ProfileContext:
    """Pre-computed profile features reused across many job scores."""

    def __init__(self, profile: Optional[SeekerProfile], resume_text: str = ""):
        self.profile = profile
        self.resume_text = resume_text or (profile.resume_text if profile else "") or ""
        self.prefs = parse_prefs(profile)
        self.skills = set(extract_skills(self.resume_text))
        self.skills |= {s.lower() for s in self.prefs.get("skills", []) if isinstance(s, str)}
        raw_vec = profile.resume_embedding if profile and profile.resume_embedding and not resume_text else ""
        self.vector = vectors.loads(raw_vec) if raw_vec else (
            vectors.loads(vectors.dumps(vectors.embed(self.resume_text))) if self.resume_text.strip() else None)
        roles = self.prefs.get("roles") or []
        if not roles and profile and profile.headline:
            roles = [profile.headline]
        self.role_words = set().union(*[_words(r) for r in roles]) if roles else set()
        self.resume_words = _words(self.resume_text[:3000])


def score_job(ctx: ProfileContext, job: PlatformJob, cos: Optional[float] = None) -> dict:
    job_skills = set(json.loads(job.skills or "[]"))
    matched = sorted(job_skills & ctx.skills)
    missing = sorted(job_skills - ctx.skills)
    skills = len(matched) / len(job_skills) if job_skills else 0.5

    job_vec = vectors.loads(job.embedding)
    if cos is None:
        cos = vectors.cosine(ctx.vector, job_vec)
    semantic = _semantic_score(cos, job_vec.shape[0] if job_vec is not None else vectors.LOCAL_DIM)

    title_words = _words(job.title)
    if ctx.role_words:
        title = len(title_words & ctx.role_words) / max(1, len(title_words))
        title = min(1.0, title * 1.5)
    else:
        title = min(1.0, len(title_words & ctx.resume_words) / max(1, len(title_words)))

    prefs = ctx.prefs
    reasons, pref_points, pref_total = [], 0.0, 0.0
    if prefs.get("remote_only") is not None or prefs.get("locations"):
        pref_total += 1
        locs = [l.lower() for l in prefs.get("locations", []) if l]
        if job.remote and (prefs.get("remote_only") or "remote" in locs):
            pref_points += 1
        elif locs and any(l in (job.location or "").lower() for l in locs):
            pref_points += 1
        elif not prefs.get("remote_only") and not locs:
            pref_points += 1
    if prefs.get("seniority"):
        pref_total += 1
        want = prefs["seniority"]
        if want in _SENIORITY_ORDER and job.seniority in _SENIORITY_ORDER:
            gap = abs(_SENIORITY_ORDER.index(want) - _SENIORITY_ORDER.index(job.seniority))
            pref_points += max(0.0, 1 - 0.5 * gap)
    if prefs.get("min_salary"):
        pref_total += 1
        top = job.salary_max or job.salary_min
        if top is None:
            pref_points += 0.5
        elif top >= int(prefs["min_salary"]):
            pref_points += 1
            reasons.append("Pay meets your minimum")
    preferences = pref_points / pref_total if pref_total else 0.6

    total = (WEIGHTS["skills"] * skills + WEIGHTS["semantic"] * semantic
             + WEIGHTS["title"] * title + WEIGHTS["preferences"] * preferences)
    blocked = False
    if prefs.get("needs_sponsorship"):
        if job.h1b_signal == "denied":
            blocked = True
            total *= 0.4
            reasons.append("Posting says it cannot sponsor visas")
        elif job.h1b_sponsor:
            reasons.append("Company sponsors H-1B visas" if job.h1b_signal == "history"
                           else "Posting offers visa sponsorship")
    score = int(round(100 * total))

    if matched:
        reasons.insert(0, f"You have {len(matched)} of {len(job_skills)} required skills")
    if missing[:3]:
        reasons.append("Gaps: " + ", ".join(missing[:3]))
    if job.posted_at and job.posted_at > datetime.utcnow() - timedelta(hours=48):
        reasons.append("Posted in the last 48 hours: apply early")

    return {
        "score": score,
        "label": match_label(score),
        "breakdown": {k: int(round(v * 100)) for k, v in
                      {"skills": skills, "semantic": semantic, "title": title, "preferences": preferences}.items()},
        "matched_skills": matched,
        "missing_skills": missing,
        "reasons": reasons,
        "sponsorship_blocked": blocked,
    }


def job_to_dict(job: PlatformJob, match: Optional[dict] = None, include_description: bool = False) -> dict:
    data = {
        "id": job.id, "title": job.title, "company": job.company, "location": job.location,
        "remote": bool(job.remote), "url": job.url, "source": job.source,
        "skills": json.loads(job.skills or "[]"), "seniority": job.seniority,
        "employment_type": job.employment_type, "salary_min": job.salary_min, "salary_max": job.salary_max,
        "ats_platform": job.ats_platform, "h1b_sponsor": bool(job.h1b_sponsor), "h1b_signal": job.h1b_signal,
        "verified": bool(job.verified), "verification_flags": json.loads(job.verification_flags or "[]"),
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "snippet": (job.description or "")[:280],
    }
    if include_description:
        data["description"] = job.description
    if match is not None:
        data["match"] = match
    return data


_QUERY_SYNONYMS = {
    "ml": ["machine learning"], "ai": ["artificial intelligence", "machine learning", "llm"],
    "swe": ["software engineer", "software developer"], "sde": ["software engineer", "software developer"],
    "pm": ["product manager"], "ds": ["data scientist"], "de": ["data engineer"], "fe": ["frontend", "front-end"],
    "frontend": ["front-end", "front end"], "backend": ["back-end", "back end"], "devops": ["sre", "site reliability"],
    "sre": ["site reliability", "devops"], "engineer": ["developer"], "developer": ["engineer"],
    "fullstack": ["full stack", "full-stack"], "nlp": ["natural language"],
}


def search_jobs(db, ctx: ProfileContext, *, query: str = "", location: str = "", remote_only: bool = False,
                h1b_only: bool = False, verified_only: bool = True, min_match: int = 0,
                exclude_decided_for: str = "", posted_within_days: Optional[int] = None,
                sort: str = "match", limit: int = 30, offset: int = 0, seniority: str = "") -> dict:
    q = db.query(PlatformJob).filter(PlatformJob.active.is_(True))
    if seniority in _SENIORITY_ORDER:
        q = q.filter(PlatformJob.seniority == seniority)
    if query:
        for term in query.lower().split()[:5]:
            clauses = []
            for variant in [term, *_QUERY_SYNONYMS.get(term, [])]:
                like = f"%{variant}%"
                clauses += [PlatformJob.title.ilike(like), PlatformJob.company.ilike(like), PlatformJob.skills.ilike(like)]
            q = q.filter(or_(*clauses))
    if location:
        q = q.filter((PlatformJob.location.ilike(f"%{location}%")) | (PlatformJob.remote.is_(True)))
    if remote_only:
        q = q.filter(PlatformJob.remote.is_(True))
    if h1b_only:
        q = q.filter(PlatformJob.h1b_sponsor.is_(True))
    if verified_only:
        q = q.filter(PlatformJob.verified.is_(True))
    if posted_within_days:
        q = q.filter(PlatformJob.posted_at >= datetime.utcnow() - timedelta(days=posted_within_days))
    if exclude_decided_for:
        decided = db.query(JobDecision.job_id).filter(JobDecision.client_id == exclude_decided_for)
        q = q.filter(~PlatformJob.id.in_(decided))

    candidates = q.order_by(PlatformJob.posted_at.desc()).limit(_MAX_CANDIDATES).all()
    sims: dict[str, float] = {}
    if ctx.vector is not None and candidates:
        sims = dict(vectors.job_index.search(db, ctx.vector.tolist(), top_k=5000))

    scored = []
    tiers = {"strong": 0, "good": 0, "fair": 0, "stretch": 0}
    for job in candidates:
        match = score_job(ctx, job, sims.get(job.id)) if ctx.resume_text.strip() else None
        if match:
            tiers[_tier(match["score"])] += 1
            if match["score"] < min_match:
                continue
        scored.append((job, match))

    if sort == "match" and ctx.resume_text.strip():
        scored.sort(key=lambda jm: (-(jm[1]["score"] if jm[1] else 0), -(jm[0].posted_at or datetime.min).timestamp()))
    total = len(scored)
    page = scored[offset: offset + limit]
    # `tiers` counts every scanned job by match strength (before min_match) so the UI can offer strength filters;
    # `capped` means only the newest _MAX_CANDIDATES postings were scanned.
    return {"total": total, "jobs": [job_to_dict(job, match) for job, match in page],
            "scanned": len(candidates), "capped": len(candidates) >= _MAX_CANDIDATES,
            "tiers": tiers if ctx.resume_text.strip() else None}


DEEP_MATCH_PROMPT = """You are a senior technical recruiter. Score how well this candidate fits the job.

RESUME:
{resume}

JOB: {title} at {company}
{description}

Return JSON: {{"score": 0-100 integer, "summary": "two sentences", "strengths": ["..."], "gaps": ["..."],
"advice": ["concrete steps to raise the match"]}}"""


def deep_match(ctx: ProfileContext, job: PlatformJob) -> dict:
    base = score_job(ctx, job)
    result = llm_json(DEEP_MATCH_PROMPT.format(
        resume=ctx.resume_text[:5000], title=job.title, company=job.company,
        description=(job.description or "")[:5000]), max_tokens=900, temperature=0.2)
    if not result or "score" not in result:
        base["deep"] = {
            "engine": "rules",
            "summary": f"{base['label']} based on skills, resume similarity and your preferences.",
            "strengths": [f"Has {s}" for s in base["matched_skills"][:5]],
            "gaps": [f"Add evidence of {s}" for s in base["missing_skills"][:5]],
            "advice": ["Tailor your resume to this job to add missing keywords you genuinely have."],
        }
        return base
    try:
        llm_score = max(0, min(100, int(result.get("score", base["score"]))))
    except (TypeError, ValueError):
        llm_score = base["score"]
    base["score"] = int(round(0.5 * base["score"] + 0.5 * llm_score))
    base["label"] = match_label(base["score"])
    base["deep"] = {"engine": "llm", **{k: result.get(k) for k in ("summary", "strengths", "gaps", "advice")}}
    return base
