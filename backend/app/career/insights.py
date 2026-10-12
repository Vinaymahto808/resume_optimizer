"""Company insights from the jobs we've indexed: open roles, H-1B signal, salary bands,
common skills, posting velocity and the seeker's insider connections.

Facts come only from indexed postings and the user's own connections. The LLM (when
configured) writes a short summary of those facts; otherwise a rules summary is used."""
import json
import statistics
from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from app.career import plans
from app.career.enrichment import normalize_company
from app.career.llm import llm_text
from app.career.matching import ProfileContext, job_to_dict, score_job
from app.career.models import PlatformJob, SeekerProfile

SUMMARY_PROMPT = """Write a 2-3 sentence summary for a job seeker about {company}, using ONLY these facts
from job postings we have indexed. Do not add facts, numbers, or opinions that aren't here. Plain text, no lists.

FACTS:
{facts}"""


def company_jobs(db, company: str) -> list[PlatformJob]:
    target = normalize_company(company)
    if not target:
        return []
    first = target.split()[0]
    rows = db.query(PlatformJob).filter(PlatformJob.active.is_(True), PlatformJob.company.ilike(f"%{first}%")).limit(2000).all()
    out = []
    for job in rows:
        norm = normalize_company(job.company)
        if norm == target or norm.startswith(target + " ") or target.startswith(norm + " "):
            out.append(job)
    return out


def _h1b(jobs: list[PlatformJob]) -> dict:
    signals = Counter(j.h1b_signal or "unknown" for j in jobs)
    sponsoring = sum(1 for j in jobs if j.h1b_sponsor)
    if signals.get("history"):
        verdict = "Known H-1B sponsor (filing history)"
    elif signals.get("stated"):
        verdict = "Some postings state visa sponsorship"
    elif signals.get("denied") and not sponsoring:
        verdict = "Postings say they can't sponsor visas"
    else:
        verdict = "No sponsorship signal found"
    return {"verdict": verdict, "sponsoring_postings": sponsoring, "signals": dict(signals)}


def _salary(jobs: list[PlatformJob]) -> dict:
    def band(rows):
        lows = [j.salary_min or j.salary_max for j in rows if j.salary_min or j.salary_max]
        highs = [j.salary_max or j.salary_min for j in rows if j.salary_min or j.salary_max]
        if not lows:
            return None
        return {"min": min(lows), "median_low": int(statistics.median(lows)),
                "median_high": int(statistics.median(highs)), "max": max(highs), "postings": len(lows)}
    by_level = {}
    for level in sorted({j.seniority or "mid" for j in jobs}):
        b = band([j for j in jobs if (j.seniority or "mid") == level])
        if b:
            by_level[level] = b
    return {"overall": band(jobs), "by_seniority": by_level}


def _velocity(jobs: list[PlatformJob]) -> dict:
    now = datetime.utcnow()
    def when(j):
        return j.posted_at or j.ingested_at or now
    last7 = sum(1 for j in jobs if when(j) >= now - timedelta(days=7))
    last30 = sum(1 for j in jobs if when(j) >= now - timedelta(days=30))
    prev30 = sum(1 for j in jobs if now - timedelta(days=60) <= when(j) < now - timedelta(days=30))
    if last30 > prev30 * 1.25 and last30 >= 3:
        trend = "accelerating"
    elif prev30 and last30 < prev30 * 0.75:
        trend = "slowing"
    else:
        trend = "steady"
    return {"last_7_days": last7, "last_30_days": last30, "previous_30_days": prev30, "trend": trend}


def _rules_summary(company: str, facts: dict) -> str:
    n = facts["open_roles"]["count"]
    if not n:
        return f"We haven't indexed any open roles at {company} yet."
    parts = [f"{company} has {n} open role{'s' if n != 1 else ''} in our index"
             f" ({facts['velocity']['last_30_days']} posted in the last 30 days, hiring looks {facts['velocity']['trend']})."]
    sal = facts["salary"]["overall"]
    if sal:
        parts.append(f"Posted pay typically runs ${sal['median_low'] // 1000}k-${sal['median_high'] // 1000}k.")
    if facts["skills"]:
        parts.append("Common skills: " + ", ".join(s["skill"] for s in facts["skills"][:5]) + ".")
    parts.append(facts["h1b"]["verdict"] + ".")
    if facts["insiders"]["count"]:
        parts.append(f"You know {facts['insiders']['count']} people there.")
    return " ".join(parts)


def company_insights(db, profile: Optional[SeekerProfile], company: str, use_llm: bool = True) -> dict:
    from app.career.agents import find_insiders  # avoid an import cycle with the coach tool registry
    company = (company or "").strip()[:200]
    jobs = company_jobs(db, company)
    display = jobs[0].company if jobs else company
    ctx = ProfileContext(profile) if profile is not None and profile.resume_text else None
    ranked = sorted(((j, score_job(ctx, j) if ctx else None) for j in jobs),
                    key=lambda jm: (-(jm[1]["score"] if jm[1] else 0), -(jm[0].posted_at or datetime(2000, 1, 1)).timestamp()))
    skills = Counter()
    for j in jobs:
        skills.update(set(json.loads(j.skills or "[]")))
    insiders = find_insiders(db, profile, display) if profile is not None else []
    turbo = profile is not None and plans.effective_plan(profile) == "turbo"
    facts = {
        "company": display,
        "open_roles": {"count": len(jobs), "remote": sum(1 for j in jobs if j.remote),
                       "top": [job_to_dict(j, m) for j, m in ranked[:8]]},
        "h1b": _h1b(jobs),
        "salary": _salary(jobs),
        "skills": [{"skill": s, "postings": c} for s, c in skills.most_common(10)],
        "velocity": _velocity(jobs),
        "insiders": {"count": len(insiders), "locked": bool(insiders) and not turbo,
                     "people": insiders[:5] if turbo else []},
    }
    summary, engine = None, "rules"
    if use_llm and jobs:
        brief = {k: v for k, v in facts.items() if k != "open_roles"}
        brief["open_roles"] = {"count": len(jobs), "titles": [j.title for j, _ in ranked[:8]]}
        brief["insiders"] = {"count": len(insiders)}
        summary = llm_text(SUMMARY_PROMPT.format(company=display, facts=json.dumps(brief)[:5000]),
                           max_tokens=300, temperature=0.3)
        engine = "llm" if summary else "rules"
    facts["summary"] = (summary or _rules_summary(display, facts)).strip()
    facts["engine"] = engine
    return facts
