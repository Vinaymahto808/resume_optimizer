"""Group the ATS checklist into the four review steps shown while a resume is analyzed, and (optionally)
score the resume against a job description with the deterministic skill matcher (no LLM, no invented skills)."""
from typing import Optional

STAGES = [
    ("structure", "Checking resume structure", "Reviewing headings and sections",
     ["contact", "summary", "sections", "skills_section", "education"]),
    ("keywords", "Checking keywords", "Looking for commonly used resume keywords", ["job_keywords"]),
    ("experience", "Reviewing experience", "Looking for clear examples of your impact",
     ["bullets", "quantified", "experience_dates"]),
    ("readability", "Checking readability", "Reviewing layout and text clarity", ["length", "no_tables", "file_format"]),
]


def job_match(resume_text: str, job_description: str, job_title: str = "") -> Optional[dict]:
    from app.career.tools import keyword_gap
    job_text = f"{job_title}\n{job_description}".strip()
    if len(job_text) < 30:
        return None
    gap = keyword_gap(resume_text, job_text)
    total = len(gap["job_keywords"])
    score = round(100 * len(gap["present"]) / total) if total else 0
    return {"score": score, "job_title": job_title, "job_keywords": gap["job_keywords"],
            "matched": gap["present"], "missing": gap["missing"], "keywords_found": total}


def apply_job(analysis: dict, match: Optional[dict]) -> dict:
    """With a job description, the generic keyword check is judged against that job's own keywords."""
    if not match:
        return analysis
    checks = []
    for c in analysis["checks"]:
        if c["id"] == "job_keywords":
            passed = match["keywords_found"] > 0 and match["score"] >= 60
            c = {**c, "label": "Job description keywords", "passed": passed, "score": c["weight"] if passed else 0,
                 "detail": (f"Your resume covers {len(match['matched'])} of {match['keywords_found']} skills this job asks for."
                            if match["keywords_found"] else "We couldn't find specific skills in this job description.")}
        checks.append(c)
    max_score = sum(c["weight"] for c in checks) or 1
    total = sum(c["score"] for c in checks)
    return {**analysis, "checks": checks, "overall_score": round(100 * total / max_score),
            "strengths": [c for c in checks if c["passed"]], "weaknesses": [c for c in checks if not c["passed"]],
            "passed_count": sum(1 for c in checks if c["passed"])}


def build_stages(analysis: dict) -> list[dict]:
    by_id = {c["id"]: c for c in analysis["checks"]}
    out = []
    for sid, title, sub, ids in STAGES:
        checks = [by_id[i] for i in ids if i in by_id]
        weight = sum(c["weight"] for c in checks) or 1
        passed = [c for c in checks if c["passed"]]
        failed = [c for c in checks if not c["passed"]]
        out.append({
            "id": sid, "title": title, "sub": sub,
            "score": round(100 * sum(c["score"] for c in checks) / weight),
            "passed": len(passed), "total": len(checks),
            "summary": (f"All {len(checks)} checks passed" if not failed
                        else f"{len(passed)} of {len(checks)} passed · fix: {', '.join(c['label'] for c in failed)}"),
            "issues": [{"label": c["label"], "detail": c["detail"]} for c in failed],
        })
    return out


def review(analysis: dict, resume_text: str, job_description: str = "", job_title: str = "") -> dict:
    match = job_match(resume_text, job_description, job_title)
    analysis = apply_job(analysis, match)
    return {**analysis, "stages": build_stages(analysis), "job_match": match}
