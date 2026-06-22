import re
from typing import Optional

from pydantic import BaseModel

from app.ats_scorer import INDUSTRY_KEYWORDS, SECTION_HEADINGS


class UnifiedProfile(BaseModel):
    source: str
    raw_text: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    headline: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = []
    experience: list[dict] = []
    education: list[dict] = []
    certifications: list[str] = []
    target_role: Optional[str] = None
    word_count: int = 0


EMAIL_REGEX = r'[\w.+-]+@[\w-]+\.[\w.]+'
PHONE_REGEX = r'\+?\d[\d\s\-\.\(\)]{7,}\d'
URL_REGEX = r'https?://[^\s]+'
TARGET_ROLES = [
    "data scientist", "machine learning engineer", "ml engineer", "ai engineer",
    "ai/ml engineer", "nlp engineer", "data analyst", "data engineer",
    "software engineer", "full stack developer", "backend developer",
    "frontend developer", "devops engineer", "product manager",
    "data science engineer", "applied scientist", "research scientist",
]


def _detect_sections(text: str) -> dict[str, str]:
    lines = text.split("\n")
    sections = {}
    current_section = "header"
    current_lines = []
    for line in lines:
        stripped = line.strip().lower()
        matched_heading = None
        for heading in SECTION_HEADINGS:
            if stripped.startswith(heading) or stripped == heading:
                matched_heading = heading
                break
        if matched_heading:
            sections[current_section] = "\n".join(current_lines)
            current_section = matched_heading
            current_lines = [line]
        else:
            current_lines.append(line)
    sections[current_section] = "\n".join(current_lines)
    return sections


def _find_skills(text: str) -> list[str]:
    text_lower = text.lower()
    found = set()
    for kw in INDUSTRY_KEYWORDS:
        escaped = re.escape(kw)
        if re.search(r'\b' + escaped + r'\b', text_lower):
            found.add(kw)
    return sorted(found)


def _infer_name(lines: list[str]) -> Optional[str]:
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if re.match(EMAIL_REGEX, stripped):
            continue
        if re.match(PHONE_REGEX, stripped):
            continue
        if re.match(URL_REGEX, stripped):
            continue
        if len(stripped.split()) in (2, 3, 4):
            name_parts = stripped.split()
            if all(part[0].isupper() for part in name_parts if part):
                return stripped
    return None


def _infer_target_role(text: str) -> Optional[str]:
    text_lower = text.lower()
    first_200 = text_lower[:200]
    for role in sorted(TARGET_ROLES, key=len, reverse=True):
        if role in first_200:
            return role.title()
    for role in TARGET_ROLES:
        if role in text_lower:
            return role.title()
    return None


SECTION_HEADING_LOW = {h.lower() for h in SECTION_HEADINGS}


def _is_heading_line(stripped: str) -> bool:
    lower = stripped.lower()
    return lower in SECTION_HEADING_LOW or lower.rstrip(":") in SECTION_HEADING_LOW


def _parse_experience_from_sections(sections: dict) -> list[dict]:
    exp_text = ""
    for key in ("experience", "work experience", "employment"):
        if key in sections:
            exp_text = sections[key]
            break
    if not exp_text:
        return []
    lines = exp_text.split("\n")
    entries = []
    current = None
    for line in lines:
        stripped = line.strip()
        if not stripped or _is_heading_line(stripped):
            continue
        if stripped[0] in ("•", "-", "*", "→", "▪", "›", "‣"):
            if current is not None:
                current["bullets"].append(stripped.lstrip("•-*→▪›‣").strip())
        else:
            if current is not None and current["bullets"]:
                entries.append(current)
            current = {"title": "", "company": "", "duration": "", "bullets": []}
            duration_match = re.search(
                r'(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
                r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|'
                r'dec(?:ember)?)\s*\d{4}\s*[-–to]+\s*',
                stripped, re.IGNORECASE
            )
            if duration_match:
                current["duration"] = duration_match.group(0).strip()
            for sep in (" at ", " – ", " - "):
                parts = stripped.split(sep, 1)
                if len(parts) == 2:
                    title = parts[0].strip()
                    rest = parts[1].strip()
                    dur = ""
                    dur_match = re.search(
                        r'(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|'
                        r'jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|'
                        r'dec(?:ember)?)\s*\d{4}\s*[-–to]+\s*(?:\d{4}|present|current|now)',
                        rest, re.IGNORECASE
                    )
                    if dur_match:
                        dur = dur_match.group(0).strip()
                        rest = rest.replace(dur_match.group(0), "").strip().rstrip("| ,").strip()
                    year_pair = re.search(r'\b(\d{4})\s*[-–to]+\s*(\d{4}|present|current|now)\b', rest, re.IGNORECASE)
                    if year_pair:
                        dur = year_pair.group(0).strip()
                        rest = rest.replace(year_pair.group(0), "").strip().rstrip("| ,").strip()
                    if rest.startswith("|"):
                        rest = rest[1:].strip()
                    current["title"] = title
                    current["company"] = rest
                    current["duration"] = dur
                    break
            else:
                parts = stripped.split(" | ", 1)
                if len(parts) == 2:
                    current["title"] = parts[0].strip()
                    rest = parts[1].strip()
                    year_pair = re.search(r'\b(\d{4})\s*[-–to]+\s*(\d{4}|present|current|now)\b', rest, re.IGNORECASE)
                    if year_pair:
                        current["duration"] = year_pair.group(0).strip()
                        current["company"] = rest.replace(year_pair.group(0), "").strip().rstrip("| ,").strip()
                    else:
                        current["company"] = rest
                else:
                    current["title"] = stripped
    if current is not None and current["bullets"]:
        entries.append(current)
    return entries


def _parse_education_from_sections(sections: dict) -> list[dict]:
    edu_text = ""
    for key in ("education",):
        if key in sections:
            edu_text = sections[key]
            break
    if not edu_text:
        return []
    lines = edu_text.split("\n")
    entries = []
    current = None
    for line in lines:
        stripped = line.strip()
        if not stripped or _is_heading_line(stripped):
            continue
        year_match = re.search(r'(19|20)\d{2}', stripped)
        year = year_match.group(0) if year_match else None
        degree_patterns = [
            "bachelor", "master", "phd", "ph.d", "b.s", "m.s", "b.a", "m.a",
            "b.tech", "m.tech", "associate", "doctorate", "high school",
            "bachelor's", "master's", "bachelor of", "master of",
        ]
        is_degree = any(p in stripped.lower() for p in degree_patterns)
        if is_degree:
            if current is not None:
                entries.append(current)
            current = {"degree": stripped, "institution": "", "year": year or ""}
            institution_match = re.search(
                r'(?:,|at|–|-)\s*(.+?)$', stripped
            )
            if institution_match:
                raw_inst = institution_match.group(1).strip()
                inst_year = re.search(r'(19|20)\d{2}', raw_inst)
                if inst_year:
                    current["year"] = inst_year.group(0)
                    raw_inst = raw_inst.replace(inst_year.group(0), "").strip().rstrip(",").strip()
                current["institution"] = raw_inst
                current["degree"] = stripped[:institution_match.start()].strip()
        elif year and current is not None:
            current["year"] = year
        elif current is not None and not current["institution"]:
            current["institution"] = stripped
    if current is not None:
        entries.append(current)
    return entries


def _parse_certifications_from_sections(sections: dict) -> list[str]:
    cert_text = ""
    for key in ("certifications",):
        if key in sections:
            cert_text = sections[key]
            break
    if not cert_text:
        return []
    lines = cert_text.split("\n")
    certs = []
    for line in lines:
        stripped = line.strip()
        if not stripped or _is_heading_line(stripped):
            continue
        cleaned = stripped.lstrip("•-*→▪›‣").strip()
        if cleaned:
            certs.append(cleaned)
    return certs


def normalize_resume_text(raw_text: str) -> UnifiedProfile:
    sections = _detect_sections(raw_text)
    lines = raw_text.strip().split("\n")

    email_match = re.search(EMAIL_REGEX, raw_text)
    phone_match = re.search(PHONE_REGEX, raw_text)
    email = email_match.group(0) if email_match else None
    phone = phone_match.group(0).strip() if phone_match else None

    header_text = sections.get("header", "")
    name = _infer_name(header_text.split("\n") if header_text else lines[:5])
    if not name:
        name = _infer_name(lines[:5])

    target_role = _infer_target_role(raw_text)

    summary_text = ""
    for key in ("summary", "professional summary", "objective"):
        if key in sections:
            summary_text = sections[key].strip()

    skills_list = _find_skills(raw_text)

    experience = _parse_experience_from_sections(sections)
    education = _parse_education_from_sections(sections)
    certifications = _parse_certifications_from_sections(sections)

    word_count = len(raw_text.split())

    return UnifiedProfile(
        source="resume_upload",
        raw_text=raw_text,
        name=name,
        email=email,
        phone=phone,
        headline=summary_text[:200] if summary_text else None,
        summary=summary_text,
        skills=skills_list,
        experience=experience,
        education=education,
        certifications=certifications,
        target_role=target_role,
        word_count=word_count,
    )


def normalize_linkedin_data(data: dict) -> UnifiedProfile:
    raw_text = data.get("text", "") or ""
    name = data.get("name") or None
    headline = data.get("headline") or None
    linkedin_url = data.get("profile_url") or data.get("linkedin_url") or None

    email = data.get("email") or None
    phone = data.get("phone") or None
    summary = data.get("summary") or None
    target_role = data.get("target_role") or None

    if not email:
        email_match = re.search(EMAIL_REGEX, raw_text)
        if email_match:
            email = email_match.group(0)
    if not phone:
        phone_match = re.search(PHONE_REGEX, raw_text)
        if phone_match:
            phone = phone_match.group(0).strip()
    if not target_role:
        target_role = _infer_target_role(raw_text)

    skills = data.get("skills") or []
    if not skills:
        skills = _find_skills(raw_text)

    experience = data.get("experience") or []
    education = data.get("education") or []
    certifications = data.get("certifications") or []

    if not name:
        lines = raw_text.strip().split("\n")
        name = _infer_name(lines[:5])

    if not summary:
        sections = _detect_sections(raw_text)
        for key in ("summary", "about", "professional summary"):
            if key in sections:
                summary = sections[key].strip()
                break

    word_count = len(raw_text.split())

    return UnifiedProfile(
        source="linkedin",
        raw_text=raw_text,
        name=name,
        email=email,
        phone=phone,
        linkedin_url=linkedin_url,
        headline=headline,
        summary=summary,
        skills=skills,
        experience=experience,
        education=education,
        certifications=certifications,
        target_role=target_role,
        word_count=word_count,
    )


def _fuzzy_match_title_company(a: dict, b: dict) -> bool:
    a_title = a.get("title", "").strip().lower()
    b_title = b.get("title", "").strip().lower()
    a_company = a.get("company", "").strip().lower()
    b_company = b.get("company", "").strip().lower()
    if a_title and b_title and a_company and b_company:
        title_match = a_title == b_title or a_title in b_title or b_title in a_title
        company_match = a_company == b_company or a_company in b_company or b_company in a_company
        return title_match and company_match
    return False


def merge_profiles(resume: UnifiedProfile, linkedin: UnifiedProfile) -> UnifiedProfile:
    merged = UnifiedProfile(
        source="merged",
        raw_text=resume.raw_text + "\n" + linkedin.raw_text,
    )

    merged.name = linkedin.name or resume.name
    merged.email = resume.email or linkedin.email
    merged.phone = resume.phone or linkedin.phone
    merged.linkedin_url = linkedin.linkedin_url or resume.linkedin_url

    merged.headline = linkedin.headline or resume.headline
    merged.summary = (linkedin.summary or resume.summary) or None
    if linkedin.summary and resume.summary:
        if len(linkedin.summary) > len(resume.summary):
            merged.summary = linkedin.summary
        else:
            merged.summary = resume.summary

    merged.target_role = resume.target_role or linkedin.target_role

    merged.skills = list(set(resume.skills) | set(linkedin.skills))
    merged.skills.sort()

    seen_experience = []
    for exp in resume.experience + linkedin.experience:
        is_dup = False
        for seen in seen_experience:
            if _fuzzy_match_title_company(exp, seen):
                seen_bullets = set(seen.get("bullets", []))
                new_bullets = set(exp.get("bullets", []))
                seen["bullets"] = list(seen_bullets | new_bullets)
                if not seen.get("duration") and exp.get("duration"):
                    seen["duration"] = exp["duration"]
                is_dup = True
                break
        if not is_dup:
            seen_experience.append(dict(exp))
    merged.experience = seen_experience

    seen_education = []
    for edu in resume.education + linkedin.education:
        edu_key = (edu.get("institution", "") or "").strip().lower()
        is_dup = False
        if edu_key:
            for seen in seen_education:
                seen_key = (seen.get("institution", "") or "").strip().lower()
                if seen_key and (edu_key == seen_key or edu_key in seen_key or seen_key in edu_key):
                    if not seen.get("degree") and edu.get("degree"):
                        seen["degree"] = edu["degree"]
                    if not seen.get("year") and edu.get("year"):
                        seen["year"] = edu["year"]
                    is_dup = True
                    break
        if not is_dup:
            seen_education.append(dict(edu))

    cert_set = set(resume.certifications) | set(linkedin.certifications)
    merged.certifications = sorted(cert_set)

    merged.word_count = len(merged.raw_text.split())

    return merged


def profile_to_embedding_text(profile: UnifiedProfile) -> str:
    parts = []
    if profile.headline:
        parts.append(profile.headline)
    if profile.summary:
        parts.append(profile.summary)
    if profile.skills:
        parts.append("Skills: " + ", ".join(profile.skills))
    for exp in profile.experience:
        title = exp.get("title", "")
        company = exp.get("company", "")
        bullets = exp.get("bullets", [])
        if title and company:
            parts.append(f"{title} at {company}")
        elif title:
            parts.append(title)
        parts.extend(bullets)
    for edu in profile.education:
        parts.append(f"{edu.get('degree', '')} at {edu.get('institution', '')}".strip(" at "))
    if profile.certifications:
        parts.append("Certifications: " + ", ".join(profile.certifications))
    if profile.target_role:
        parts.append(f"Target Role: {profile.target_role}")
    return " ".join(p for p in parts if p)
