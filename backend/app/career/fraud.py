"""Candidate fraud detection: identity checks, timeline consistency, inflated
claims and duplicate identities. Produces a 0-100 risk score with flags."""
import hashlib
import re
from datetime import datetime
from typing import Optional

from app.career.llm import llm_json

DISPOSABLE_DOMAINS = {
    "mailinator.com", "10minutemail.com", "guerrillamail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
    "trashmail.com", "getnada.com", "dispostable.com", "sharklasers.com", "throwawaymail.com", "maildrop.cc",
}
_MONTHS = {m: i + 1 for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}
_RANGE_RE = re.compile(
    r"(?P<sm>[A-Za-z]{3,9}\.?\s+)?(?P<sy>(19|20)\d{2})\s*(?:-|–|—|to)\s*(?P<em>[A-Za-z]{3,9}\.?\s+)?(?P<ey>(19|20)\d{2}|present|current|now)",
    re.I)
_EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE_RE = re.compile(r"(\+?\d[\d\s().-]{8,}\d)")
_SENIORITY_RANK = [(r"intern|trainee", 0), (r"junior|associate|graduate", 1), (r"senior|sr\.", 3),
                   (r"lead|staff|principal", 4), (r"manager|head", 4), (r"director", 5), (r"vp|vice president", 6),
                   (r"chief|cto|ceo|cfo|founder", 7)]
_BUZZ = ["synergy", "rockstar", "ninja", "guru", "visionary", "world-class", "best-in-class", "thought leader",
         "game-changer", "results-driven", "dynamic", "passionate", "innovative", "cutting-edge", "10x"]


def _month(text: Optional[str]) -> int:
    if not text:
        return 1
    return _MONTHS.get(text.strip().lower()[:3], 1)


def parse_ranges(text: str) -> list[dict]:
    now = datetime.utcnow()
    out = []
    lines = text.splitlines()
    for i, line in enumerate(lines):
        for m in _RANGE_RE.finditer(line):
            sy, ey = int(m.group("sy")), m.group("ey").lower()
            start = sy * 12 + _month(m.group("sm"))
            if ey in {"present", "current", "now"}:
                end, ongoing = now.year * 12 + now.month, True
            else:
                end, ongoing = int(ey) * 12 + (_month(m.group("em")) if m.group("em") else 12), False
            context = " ".join(lines[max(0, i - 1): i + 1]).lower()
            out.append({"start": start, "end": end, "ongoing": ongoing, "line": line.strip()[:160],
                        "education": bool(re.search(r"universit|college|school|b\.?s\.?|m\.?s\.?|bachelor|master|ph\.?d|degree", context))})
    return out


def _seniority(line: str) -> Optional[int]:
    low = line.lower()
    for pattern, rank in reversed(_SENIORITY_RANK):
        if re.search(rf"\b({pattern})\b", low):
            return rank
    return None


def check_candidate(resume_text: str, name: str = "", email: str = "", phone: str = "",
                    others: Optional[list[dict]] = None, use_llm: bool = True) -> dict:
    text = resume_text or ""
    flags: list[dict] = []

    def flag(severity: int, category: str, detail: str):
        flags.append({"severity": severity, "category": category, "detail": detail})

    email = email or (_EMAIL_RE.search(text).group(0) if _EMAIL_RE.search(text) else "")
    phone = phone or (_PHONE_RE.search(text).group(0) if _PHONE_RE.search(text) else "")
    if not email:
        flag(15, "identity", "No email address")
    elif email.split("@")[-1].lower() in DISPOSABLE_DOMAINS:
        flag(30, "identity", f"Disposable email domain ({email.split('@')[-1]})")
    digits = re.sub(r"\D", "", phone)
    if not phone:
        flag(8, "identity", "No phone number")
    elif len(set(digits)) <= 2 or len(digits) < 10 or len(digits) > 15:
        flag(20, "identity", "Phone number looks invalid")
    if len(text.split()) < 120:
        flag(12, "content", "Resume is unusually short")

    now = datetime.utcnow()
    now_m = now.year * 12 + now.month
    ranges = parse_ranges(text)
    jobs = [r for r in ranges if not r["education"]]
    for r in ranges:
        if r["start"] > now_m + 1:
            flag(25, "timeline", f"Start date in the future: \"{r['line']}\"")
        if r["end"] < r["start"]:
            flag(20, "timeline", f"End date before start date: \"{r['line']}\"")
    overlaps = 0
    for i, a in enumerate(jobs):
        for b in jobs[i + 1:]:
            if min(a["end"], b["end"]) - max(a["start"], b["start"]) >= 12:
                overlaps += 1
    if overlaps >= 2:
        flag(20, "timeline", f"{overlaps} pairs of roles overlap by a year or more")
    edu_ends = [r["end"] for r in ranges if r["education"]]
    if jobs and edu_ends:
        first_job = min(j["start"] for j in jobs)
        if first_job < min(edu_ends) - 8 * 12:
            flag(15, "timeline", "Professional experience starts long before education")
    claimed = re.search(r"(\d{1,2})\+?\s+years", text, re.I)
    if claimed and jobs:
        span_years = (max(j["end"] for j in jobs) - min(j["start"] for j in jobs)) / 12
        if int(claimed.group(1)) > span_years + 3:
            flag(20, "claims", f"Claims {claimed.group(1)} years but listed roles span about {span_years:.0f}")

    titled = sorted(((j["start"], _seniority(j["line"])) for j in jobs if _seniority(j["line"]) is not None))
    for (s1, r1), (s2, r2) in zip(titled, titled[1:]):
        if r2 - r1 >= 4 and (s2 - s1) <= 24:
            flag(20, "claims", "Seniority jumps several levels within two years")
            break
    big_pct = [int(p) for p in re.findall(r"(\d{3,5})\s?%", text) if int(p) > 300]
    if big_pct:
        flag(10 + 5 * min(len(big_pct), 3), "claims", f"Implausibly large improvement claims ({', '.join(map(str, big_pct[:3]))}%)")
    buzz = sum(text.lower().count(b) for b in _BUZZ)
    if buzz >= 6:
        flag(8, "claims", "Heavy buzzword density with little evidence")

    fp = hashlib.sha1(re.sub(r"\s+", " ", text.lower()).encode()).hexdigest()
    for other in others or []:
        if other.get("fingerprint") == fp and other.get("name", "").lower() != (name or "").lower():
            flag(40, "duplicate", f"Same resume submitted under another name ({other.get('name')})")
        elif email and other.get("email", "").lower() == email.lower() and other.get("name", "").lower() != (name or "").lower():
            flag(30, "duplicate", f"Email reused by another candidate ({other.get('name')})")

    engine = "rules"
    if use_llm:
        llm = llm_json(LLM_PROMPT.format(resume=text[:6000]), max_tokens=700, temperature=0.1)
        if llm and isinstance(llm.get("flags"), list):
            engine = "rules+llm"
            for item in llm["flags"][:5]:
                if isinstance(item, str) and item.strip():
                    flag(10, "ai_review", item.strip()[:200])

    risk = min(100, sum(f["severity"] for f in flags))
    verdict = "verified" if risk < 25 else "review" if risk < 60 else "high_risk"
    return {"risk_score": risk, "verdict": verdict, "flags": sorted(flags, key=lambda f: -f["severity"]),
            "email": email, "phone": phone, "fingerprint": fp, "engine": engine}


LLM_PROMPT = """You review resumes for signs of fabrication. List concrete inconsistencies only (impossible timelines,
contradictory claims, titles that don't fit described work, implausible metrics). Don't flag style.

RESUME:
{resume}

Return JSON: {{"flags": ["..."]}} (empty list if nothing is suspicious)."""
