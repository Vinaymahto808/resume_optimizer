"""Knowledge-base features: domain detection, skill-gap roadmaps and interview banks.

Everything here is deterministic (no LLM), so it is cheap, free to call and
testable. Question answering over the same content lives in ``rag.py``.
"""
import re
from functools import lru_cache
from typing import Optional

from app.career.kb import content


def _term_re(term: str) -> re.Pattern:
    return re.compile(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", re.I)


@lru_cache(maxsize=4096)
def _compiled(term: str) -> re.Pattern:
    return _term_re(term)


def _has(term: str, low_text: str) -> bool:
    return bool(_compiled(term).search(low_text))


def list_domains() -> list[dict]:
    return [{"id": d["id"], "name": d["name"], "summary": d["summary"], "titles": d["titles"][:4],
             "skill_count": len(content.skill_terms(d)), "question_count": len(d["interview"])}
            for d in content.domains().values()]


def get_domain(domain_id: str) -> Optional[dict]:
    return content.domains().get(domain_id)


def detect_domains(text: str, limit: int = 3) -> list[dict]:
    """Rank domains for a resume, job description or question.

    A title hit (e.g. "salesforce developer") is strong evidence; skill hits add
    up, with core skills weighted above tools. Domains with no evidence are dropped."""
    low = (text or "").lower()
    if not low.strip():
        return []
    ranked = []
    for d in content.domains().values():
        title_hits = [t for t in d["titles"] if _has(t, low)]
        tiers = {tier: [t for t in d["skills"][tier] if _has(t, low)] for tier in content.SKILL_TIERS}
        kw_hits = [k for k in d["ats_keywords"] if _has(k, low) and not any(k in v for v in tiers.values())]
        score = 6 * len(title_hits) + 2 * len(tiers["core"]) + 1.5 * len(tiers["advanced"]) + len(tiers["tools"]) \
            + 0.5 * len(kw_hits)
        if score > 0:
            matched = list(dict.fromkeys(tiers["core"] + tiers["advanced"] + tiers["tools"] + kw_hits))
            ranked.append({"id": d["id"], "name": d["name"], "score": round(score, 1), "matched": matched[:12],
                           "title_hits": title_hits})
    ranked.sort(key=lambda r: -r["score"])
    return ranked[:limit]


def best_domain(text: str, min_score: float = 4.0) -> Optional[str]:
    ranked = detect_domains(text, limit=1)
    return ranked[0]["id"] if ranked and ranked[0]["score"] >= min_score else None


def skill_gap(domain_id: str, resume_text: str) -> dict:
    """Which of the domain's skills the resume shows, tier by tier, plus a staged roadmap
    marked done / in progress / to do based on that coverage."""
    d = get_domain(domain_id)
    if d is None:
        raise KeyError(domain_id)
    low = (resume_text or "").lower()
    tiers = {}
    for tier in content.SKILL_TIERS:
        have = [t for t in d["skills"][tier] if _has(t, low)]
        tiers[tier] = {"have": have, "missing": [t for t in d["skills"][tier] if t not in have]}
    weights = {"core": 3, "advanced": 2, "tools": 1}
    total = sum(weights[t] * len(d["skills"][t]) for t in weights)
    got = sum(weights[t] * len(tiers[t]["have"]) for t in weights)
    coverage = round(100 * got / total) if total else 0

    roadmap, current_set = [], False
    for stage in d["roadmap"]:
        have = [s for s in stage["skills"] if _has(s, low)]
        ratio = len(have) / len(stage["skills"])
        if ratio >= 0.7:
            status = "done"
        elif not current_set:
            status, current_set = "current", True
        else:
            status = "todo"
        roadmap.append({**stage, "status": status, "skills_have": have,
                        "skills_missing": [s for s in stage["skills"] if s not in have]})

    # Next steps: missing core skills first, then advanced, in the order the roadmap teaches them.
    order = [s for stage in d["roadmap"] for s in stage["skills"]]
    def rank(skill):
        return order.index(skill) if skill in order else len(order)
    next_skills = sorted(tiers["core"]["missing"], key=rank)[:5] or sorted(tiers["advanced"]["missing"], key=rank)[:5]
    keywords_missing = [k for k in d["ats_keywords"] if not _has(k, low)]
    return {
        "domain": {"id": d["id"], "name": d["name"], "summary": d["summary"]},
        "coverage": coverage,
        "level": "strong" if coverage >= 65 else "developing" if coverage >= 35 else "starting",
        "skills": tiers,
        "next_skills": next_skills,
        "ats_keywords_missing": keywords_missing[:15],
        "roadmap": roadmap,
        "certifications": d["certifications"],
        "projects": d["projects"],
        "resume_bullets": d["resume_bullets"],
    }


def interview_bank(domain_id: str, level: Optional[str] = None, topic: Optional[str] = None,
                   limit: int = 20) -> list[dict]:
    d = get_domain(domain_id)
    if d is None:
        raise KeyError(domain_id)
    qs = d["interview"]
    if level:
        qs = [q for q in qs if q["level"] == level]
    if topic:
        t = topic.lower()
        qs = [q for q in qs if t in q["topic"].lower() or t in q["question"].lower()]
    return [{**q, "domain": d["id"]} for q in qs[:limit]]


def domain_keywords_in(job_text: str, domain_id: Optional[str] = None) -> list[str]:
    """Domain ATS keywords and skills that a job description actually mentions."""
    low = (job_text or "").lower()
    did = domain_id or best_domain(job_text)
    d = get_domain(did) if did else None
    if d is None:
        return []
    return [t for t in content.skill_terms(d) if _has(t, low)]
