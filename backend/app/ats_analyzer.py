import re

ATS_CHECKLIST = [
    {"id": "contact", "label": "Contact Information", "weight": 10,
     "check": lambda t: bool(re.search(r'\b[\w.+-]+@[\w-]+\.[\w.]+', t)) and bool(re.search(r'\+?\d[\d\s\-]{8,}', t)),
     "detail": "Email and phone number should be present and easy to parse."},
    {"id": "summary", "label": "Professional Summary", "weight": 10,
     "check": lambda t: len(t.split()) > 30 and any(kw in t.lower() for kw in ["summary", "profile", "about", "professional"]),
     "detail": "A 2-4 sentence summary at the top helps ATS categorize your profile."},
    {"id": "sections", "label": "Clear Section Headers", "weight": 10,
     "check": lambda t: len(re.findall(r'(?im)^(experience|education|skills|projects|certifications|achievements)', t)) >= 3,
     "detail": "Use standard section headers (Experience, Education, Skills, Projects) for ATS parsing."},
    {"id": "bullets", "label": "Bullet Point Format", "weight": 10,
     "check": lambda t: len(re.findall(r'^[•\-\*]\s', t, re.MULTILINE)) >= 5,
     "detail": "Use bullet points for experience entries — ATS parses them better than paragraphs."},
    {"id": "quantified", "label": "Quantified Achievements", "weight": 15,
     "check": lambda t: len(re.findall(r'\b\d{2,}%|\b\d+x\b|\b\d{3,}\s*(users|documents|customers|requests|models|revenue|patients|projects)', t, re.IGNORECASE)) >= 2,
     "detail": "Add metrics (% improvements, counts, dollar amounts) to demonstrate impact."},
    {"id": "job_keywords", "label": "Data Science Keywords", "weight": 15,
     "check": lambda t: len(re.findall(r'(?i)\b(python|sql|machine learning|deep learning|nlp|pandas|scikit-learn|pytorch|tensorflow|llm|rag|docker|gcp|aws|statistics|regression|classification)\b', t)) >= 8,
     "detail": "Include relevant data science/ML keywords that match target roles."},
    {"id": "skills_section", "label": "Dedicated Skills Section", "weight": 10,
     "check": lambda t: bool(re.search(r'(?im)^skills?[:\s]', t)) and len(re.findall(r'(?im)^skills?[:\s].*$', t)) > 0,
     "detail": "A separate Skills section makes it easy for ATS to extract your competencies."},
    {"id": "length", "label": "Resume Length", "weight": 5,
     "check": lambda t: 200 <= len(t.split()) <= 800,
     "detail": "Ideal resume length is 200-800 words. Too short lacks detail, too long may be truncated."},
    {"id": "education", "label": "Education Section", "weight": 5,
     "check": lambda t: bool(re.search(r'(?im)^education', t)),
     "detail": "Education section should be present with degree, institution, and graduation year."},
    {"id": "experience_dates", "label": "Experience with Dates", "weight": 5,
     "check": lambda t: len(re.findall(r'(?i)(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}', t)) >= 2,
     "detail": "Include month/year dates for each role — ATS filters by experience duration."},
    {"id": "no_tables", "label": "No Complex Tables", "weight": 3,
     "check": lambda t: not bool(re.search(r'\|.*\|.*\|', t) and len(re.findall(r'\|', t)) > 10),
     "detail": "Avoid complex tables/multi-column layouts — ATS may misread them."},
    {"id": "file_format", "label": "Standard Format Ready", "weight": 2,
     "check": lambda t: not bool(re.search(r'[^\x00-\x7F]', t)),
     "detail": "Use standard ASCII/UTF-8 characters. Special symbols may break ATS parsing."},
]


def analyze_ats(resume_text: str) -> dict:
    results = []
    total_score = 0
    max_score = sum(c["weight"] for c in ATS_CHECKLIST)

    for check in ATS_CHECKLIST:
        passed = check["check"](resume_text)
        score = check["weight"] if passed else 0
        total_score += score
        results.append({
            "id": check["id"],
            "label": check["label"],
            "weight": check["weight"],
            "passed": passed,
            "score": score,
            "detail": check["detail"],
        })

    overall = round(total_score / max_score * 100, 1)

    strengths = [r for r in results if r["passed"]]
    weaknesses = [r for r in results if not r["passed"]]

    word_count = len(resume_text.split())

    suggestions = []
    if word_count < 200:
        suggestions.append("Your resume is too short ({word_count} words). Aim for 300-600 words with detailed experience.")
    elif word_count > 800:
        suggestions.append("Your resume is long ({word_count} words). Consider trimming to 600 words for better ATS scoring.")

    if not any(r["passed"] for r in results if r["id"] == "job_keywords"):
        suggestions.append("Add more data science keywords (Python, ML, NLP, SQL, etc.) to pass ATS keyword filters.")

    if not any(r["passed"] for r in results if r["id"] == "quantified"):
        suggestions.append("Add quantified achievements with percentages or numbers to stand out.")

    if not any(r["passed"] for r in results if r["id"] == "summary"):
        suggestions.append("Add a professional summary at the top — it's the first thing ATS looks for.")

    if not any(r["passed"] for r in results if r["id"] == "bullets"):
        suggestions.append("Convert experience descriptions to bullet points starting with action verbs.")

    return {
        "overall_score": overall,
        "word_count": word_count,
        "checks": results,
        "strengths": [r for r in strengths],
        "weaknesses": [r for r in weaknesses],
        "suggestions": suggestions,
        "passed_count": len(strengths),
        "total_checks": len(ATS_CHECKLIST),
    }
