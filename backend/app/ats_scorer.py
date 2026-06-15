import re
from typing import Tuple

INDUSTRY_KEYWORDS = {
    "python", "java", "javascript", "typescript", "react", "angular", "vue",
    "node.js", "fastapi", "flask", "django", "aws", "azure", "gcp",
    "docker", "kubernetes", "ci/cd", "git", "sql", "postgresql", "mongodb",
    "redis", "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "scikit-learn", "pandas", "numpy",
    "rest api", "graphql", "microservices", "agile", "scrum",
    "leadership", "communication", "teamwork", "problem-solving",
}

SECTION_HEADINGS = [
    "education", "experience", "work experience", "employment",
    "skills", "technical skills", "projects", "certifications",
    "achievements", "publications", "summary", "objective",
    "professional summary", "contact", "languages",
]

FONT_STACKS = ["latex", "computer modern", "times new roman", "arial", "helvetica", "calibri"]
FILE_FORMATS = ["pdf", "docx", "txt"]

def extract_text_from_pdf(file_path: str) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        try:
            from pdfminer.high_level import extract_text
            return extract_text(file_path)
        except Exception as e:
            return f"[Error extracting text: {e}]"

def extract_text_from_docx(file_path: str) -> str:
    try:
        import docx
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        return f"[Error extracting text: {e}]"

def parse_resume(file_path: str) -> str:
    if file_path.endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith(".docx"):
        return extract_text_from_docx(file_path)
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

def detect_sections(text: str) -> dict[str, str]:
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

def score_formatting(text: str) -> Tuple[float, list[str]]:
    score = 0.0
    suggestions = []
    lines = text.split("\n")

    sections = detect_sections(text)
    found_sections = [k for k, v in sections.items() if v.strip() and k != "header"]
    section_score = min(len(found_sections) / 5 * 15, 15)
    score += section_score

    if len(found_sections) < 3:
        suggestions.append("Add standard sections: Education, Experience, Skills, Projects")

    bullet_count = len([l for l in lines if l.strip().startswith(("•", "-", "*", "→"))])
    if bullet_count >= 5:
        score += 10
    else:
        suggestions.append("Use bullet points to highlight achievements")
        score += 3

    bold_patterns = len(re.findall(r'\*\*(.*?)\*\*', text))
    if bold_patterns >= 3:
        score += 5
    else:
        suggestions.append("Bold key metrics and technologies")

    char_count = len(text)
    words = text.split()
    if 300 <= len(words) <= 800:
        score += 10
    elif len(words) < 300:
        suggestions.append("Resume too short — aim for 300-800 words")
        score += 3
    else:
        suggestions.append("Resume too long — keep under 800 words")
        score += 5

    return min(score, 40), suggestions

def score_keywords(text: str) -> Tuple[float, list[str], list[str]]:
    text_lower = text.lower()
    found = []
    missing = []
    for kw in sorted(INDUSTRY_KEYWORDS):
        if kw in text_lower:
            found.append(kw)
        else:
            if kw not in ["leadership", "communication", "teamwork", "problem-solving"]:
                missing.append(kw)

    essential = {"python", "java", "sql", "git", "aws", "docker", "machine learning", "rest api"}
    essential_found = [k for k in essential if k in text_lower]
    essential_missing = [k for k in essential if k not in text_lower]

    score = min(len(found) * 1.5, 30)
    return score, found, essential_missing

def score_experience(text: str) -> Tuple[float, list[str]]:
    score = 0.0
    suggestions = []
    lines = text.split("\n")

    number_pattern = re.findall(r'\d+%|\d+x|\d+\.\d+s|reduced|improved|increased|achieved', text.lower())
    if len(number_pattern) >= 3:
        score += 15
    else:
        suggestions.append("Quantify achievements with numbers (%, time saved, etc.)")
        score += 5

    action_words = re.findall(
        r'\b(developed|designed|built|implemented|architected|led|managed|created|optimized|delivered|deployed|automated|engineered)\b',
        text.lower(),
    )
    if len(action_words) >= 5:
        score += 5
    else:
        suggestions.append("Start bullets with strong action verbs")

    return min(score, 25), suggestions

def score_ats_compatibility(text: str) -> Tuple[float, list[str]]:
    score = 0.0
    suggestions = []

    if "pdf" in text.lower():
        score += 5
    else:
        suggestions.append("Save resume as PDF for best ATS compatibility")

    if re.search(r'\b\d{3}\)?\s*\d{3}[-.\s]?\d{4}\b', text):
        score += 3

    if re.search(r'@', text):
        score += 2

    return min(score, 10), suggestions

def calculate_ats_score(file_path: str) -> dict:
    raw_text = parse_resume(file_path)
    text_lower = raw_text.lower()

    format_score, format_suggestions = score_formatting(raw_text)
    kw_score, keywords_found, keywords_missing = score_keywords(raw_text)
    exp_score, exp_suggestions = score_experience(raw_text)
    ats_score, ats_suggestions = score_ats_compatibility(raw_text)

    total = format_score + kw_score + exp_score + ats_score
    total = min(max(round(total), 0), 100)

    all_suggestions = format_suggestions + exp_suggestions + ats_suggestions
    all_suggestions = list(dict.fromkeys(all_suggestions))

    breakdown = {
        "formatting": round(format_score, 1),
        "keywords": round(kw_score, 1),
        "experience_impact": round(exp_score, 1),
        "ats_compatibility": round(ats_score, 1),
    }

    return {
        "ats_score": total,
        "breakdown": breakdown,
        "keywords_found": keywords_found[:20],
        "keywords_missing": keywords_missing[:10],
        "suggestions": all_suggestions[:8],
        "word_count": len(raw_text.split()),
        "raw_text": raw_text,
    }
