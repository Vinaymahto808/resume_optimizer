"""Map ATS application-form fields (described by the Chrome extension) to the
seeker's profile. Deterministic rules handle standard fields; free-text
questions use the LLM when available."""
import json
import re
from typing import Optional

from app.career.llm import llm_json
from app.career.matching import parse_prefs
from app.career.models import SeekerProfile

# (profile key, regex over the field's label/name/id/placeholder/autocomplete)
RULES: list[tuple[str, str]] = [
    ("first_name", r"\b(first|given|fore)[ _-]?name\b|^fname$|autocomplete:given-name"),
    ("last_name", r"\b(last|family|sur)[ _-]?name\b|^lname$|autocomplete:family-name"),
    ("email", r"e-?mail|autocomplete:email"),
    ("phone", r"phone|mobile|telephone|cell|autocomplete:tel"),
    ("linkedin", r"linked ?in"),
    ("github", r"git ?hub"),
    ("portfolio", r"portfolio|personal (web)?site|website|blog|^url$"),
    ("city", r"\bcity\b|autocomplete:address-level2"),
    ("location", r"location|where are you (based|located)|current address|autocomplete:street-address"),
    ("current_company", r"current (company|employer)|most recent (company|employer)|^company( name)?$|employer name|organization"),
    ("current_title", r"current (job )?title|current (role|position)|^title$|job title"),
    ("years_experience", r"years of (professional )?experience|how many years"),
    ("school", r"school|university|college|institution"),
    ("degree", r"\bdegree\b|discipline|field of study|major"),
    ("work_authorized", r"(legally )?authori[sz]ed to work|eligible to work|work authori[sz]ation|right to work"),
    ("needs_sponsorship", r"sponsor|visa (status|sponsorship)|h-?1b|immigration"),
    ("salary_expectation", r"salary|compensation|pay expectation|desired pay"),
    ("start_date", r"start date|available to start|notice period|earliest start"),
    ("relocate", r"relocat"),
    ("pronouns", r"pronoun"),
    ("eeo_decline", r"gender|sex\b|race|ethnicity|hispanic|latino|veteran|disabilit|sexual orientation|transgender"),
    ("cover_letter", r"cover ?letter"),
    ("full_name", r"(full |your |legal )?name$|^name\b|autocomplete:name"),
]

_FREE_TEXT_HINT = re.compile(r"\b(why|describe|tell us|what (interests|excites)|additional information|anything else)\b", re.I)
_DECLINE = re.compile(r"decline|prefer not|don.?t wish|do not wish|not to (say|disclose|answer)|i don.?t want", re.I)


def _years_from_resume(text: str) -> Optional[int]:
    years = [int(y) for y in re.findall(r"\b(19[89]\d|20[0-4]\d)\b", text or "")]
    if len(years) >= 2:
        from datetime import datetime
        span = max(datetime.utcnow().year if re.search(r"present|current", text, re.I) else max(years), max(years)) - min(years)
        return max(0, min(span, 45))
    m = re.search(r"(\d{1,2})\+?\s+years", text or "", re.I)
    return int(m.group(1)) if m else None


def profile_values(profile: SeekerProfile) -> dict:
    prefs = parse_prefs(profile)
    parts = (profile.full_name or "").split()
    years = prefs.get("years_experience") or _years_from_resume(profile.resume_text or "")
    city = prefs.get("city") or (profile.location or "").split(",")[0].strip()
    needs = prefs.get("needs_sponsorship")
    authorized = prefs.get("work_authorized")
    return {
        "full_name": profile.full_name, "first_name": parts[0] if parts else "",
        "last_name": " ".join(parts[1:]) if len(parts) > 1 else "", "email": profile.email,
        "phone": profile.phone, "linkedin": profile.linkedin, "github": profile.github,
        "portfolio": profile.portfolio, "city": city, "location": profile.location,
        "current_company": prefs.get("current_company", ""), "current_title": prefs.get("current_title") or profile.headline,
        "years_experience": str(years) if years is not None else "", "school": profile.school,
        "degree": prefs.get("degree", ""),
        "work_authorized": "" if authorized is None else ("Yes" if authorized else "No"),
        "needs_sponsorship": "" if needs is None else ("Yes" if needs else "No"),
        "salary_expectation": str(prefs.get("salary_expectation") or prefs.get("min_salary") or ""),
        "start_date": prefs.get("start_date", ""), "relocate": prefs.get("relocate", ""),
        "pronouns": prefs.get("pronouns", ""), "eeo_decline": "__decline__",
    }


def _descriptor_parts(field: dict) -> list[str]:
    parts = [field.get("label", ""), field.get("name", ""), field.get("dom_id", ""), field.get("placeholder", ""),
             field.get("aria_label", "")]
    if field.get("autocomplete") and field["autocomplete"] not in {"on", "off"}:
        parts.append(f"autocomplete:{field['autocomplete']}")
    # Normalise camelCase / snake_case so "firstName" and "first_name" read as "first name".
    out = []
    for part in parts:
        part = re.sub(r"([a-z])([A-Z])", r"\1 \2", part or "")
        part = re.sub(r"[_\-\[\]]+", " ", part).strip(" *:").lower()
        if part:
            out.append(re.sub(r"\s+", " ", part))
    return out


def _classify(parts: list[str]) -> Optional[str]:
    for key, pattern in RULES:
        if any(re.search(pattern, part, re.I) for part in parts):
            return key
    return None


def _pick_option(options: list[str], value: str) -> Optional[str]:
    if not options:
        return value
    if value == "__decline__":
        return next((o for o in options if _DECLINE.search(o)), None)
    low = value.lower()
    for opt in options:
        if opt.strip().lower() == low:
            return opt
    for opt in options:
        if low and (opt.lower().startswith(low) or low in opt.lower()):
            return opt
    if low in {"yes", "no"}:
        return next((o for o in options if o.lower().startswith(low)), None)
    return None


def map_fields(profile: SeekerProfile, fields: list[dict], job: Optional[dict] = None,
               cover_letter: str = "") -> dict:
    values = profile_values(profile)
    values["cover_letter"] = cover_letter
    fills, unmapped, free_text = [], [], []
    for field in fields[:200]:
        ftype = (field.get("type") or "").lower()
        if ftype in {"hidden", "submit", "button", "password", "file", "image", "reset"}:
            continue
        parts = _descriptor_parts(field)
        key = _classify(parts)
        if key is None:
            if field.get("tag") == "textarea" or _FREE_TEXT_HINT.search(" ".join(parts)):
                free_text.append(field)
            else:
                unmapped.append({"id": field.get("id"), "label": field.get("label", "")})
            continue
        value = values.get(key) or ""
        if not value:
            unmapped.append({"id": field.get("id"), "label": field.get("label", ""), "reason": f"No {key} in profile"})
            continue
        options = field.get("options") or []
        chosen = _pick_option(options, value) if options or value == "__decline__" else value
        if not chosen:
            unmapped.append({"id": field.get("id"), "label": field.get("label", ""), "reason": "No matching option"})
            continue
        fills.append({"id": field.get("id"), "value": chosen, "source": key,
                      "confidence": 0.95 if key in {"email", "phone", "first_name", "last_name"} else 0.8})

    if free_text and job:
        fills.extend(_answer_free_text(profile, free_text, job))
    elif free_text:
        unmapped.extend({"id": f.get("id"), "label": f.get("label", ""), "reason": "Open question"} for f in free_text)
    return {"fills": fills, "unmapped": unmapped, "filled_count": len(fills)}


FREE_TEXT_PROMPT = """Answer these job-application questions for the candidate in first person, 2-4 sentences each,
using only facts from the resume. If a question can't be answered from the resume, return an empty string.

JOB: {title} at {company}
RESUME:
{resume}

QUESTIONS (id: question):
{questions}

Return JSON: {{"answers": {{"<id>": "answer"}}}}"""


def _answer_free_text(profile: SeekerProfile, fields: list[dict], job: dict) -> list[dict]:
    questions = "\n".join(f"{f.get('id')}: {f.get('label') or f.get('placeholder') or f.get('name')}" for f in fields[:10])
    result = llm_json(FREE_TEXT_PROMPT.format(title=job.get("title", ""), company=job.get("company", ""),
                                              resume=(profile.resume_text or "")[:4000], questions=questions),
                      max_tokens=1500, temperature=0.4)
    answers = (result or {}).get("answers") or {}
    return [{"id": fid, "value": text, "source": "ai_answer", "confidence": 0.6}
            for fid, text in answers.items() if isinstance(text, str) and text.strip()]


def packet_json(profile: SeekerProfile, job: dict, tailored_resume: str, cover_letter_text: str) -> str:
    return json.dumps({"profile": profile_values(profile), "job": job, "tailored_resume": tailored_resume,
                       "cover_letter": cover_letter_text})
