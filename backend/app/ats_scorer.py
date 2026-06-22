import re
from typing import Tuple, List, Dict, Any

from app.resume_parser import extract_text_from_scanned_pdf
from app.config import settings

INDUSTRY_KEYWORDS = {
    "python", "java", "javascript", "typescript", "golang", "rust", "c++", "c#",
    "ruby", "php", "swift", "kotlin", "scala", "perl", "r", "matlab",
    "bash", "shell", "powershell", "solidity",
    "react", "angular", "vue", "svelte", "next.js", "nuxt", "html", "css",
    "sass", "tailwind", "bootstrap", "jquery", "webpack", "vite",
    "redux", "graphql", "rest api", "ajax",
    "node.js", "fastapi", "flask", "django", "spring boot", "express",
    "asp.net", "laravel", "rails", "gin", "echo",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible",
    "jenkins", "github actions", "gitlab ci", "ci/cd", "pulumi",
    "istio", "helm", "prometheus", "grafana", "datadog",
    "git", "github", "gitlab", "bitbucket",
    "sql", "postgresql", "mongodb", "mysql", "sqlite", "oracle",
    "redis", "elasticsearch", "dynamodb", "cassandra", "snowflake",
    "bigquery", "redshift", "mariadb",
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "scikit-learn", "keras", "llm", "gpt",
    "langchain", "hugging face", "rag", "vector database",
    "pandas", "numpy", "matplotlib", "seaborn", "jupyter",
    "spark", "kafka", "airflow", "hadoop", "flink", "beam",
    "dbt", "looker", "tableau", "power bi",
    "microservices", "event-driven", "solid", "design patterns",
    "domain-driven design", "cqrs", "restful", "grpc",
    "message queue", "rabbitmq", "sqs", "pub/sub",
    "unit testing", "integration testing", "tdd", "jest",
    "pytest", "cypress", "selenium", "playwright",
    "security", "authentication", "authorization", "oauth",
    "jwt", "ssl", "penetration testing", "compliance",
    "agile", "scrum", "kanban", "sprint", "jira", "confluence",
    "leadership", "communication", "teamwork", "problem-solving",
    "critical thinking", "mentoring", "cross-functional",
    "stakeholder management", "project management",
    "generative ai", "genai", "prompt engineering", "fine-tuning",
    "agentic ai", "multi-agent", "langgraph", "google adk",
    "vertex ai", "generative ai", "mlops", "llmops",
    "a/b testing", "hypothesis testing", "statistical analysis",
}

SECTION_HEADINGS = [
    "education", "experience", "work experience", "employment",
    "skills", "technical skills", "projects", "certifications",
    "achievements", "publications", "summary", "objective",
    "professional summary", "contact", "languages",
]

FONT_STACKS = ["latex", "computer modern", "times new roman", "arial", "helvetica", "calibri"]
FILE_FORMATS = ["pdf", "docx", "txt"]


OCR_MIN_CHARS = 50


def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        try:
            from pdfminer.high_level import extract_text
            text = extract_text(file_path)
        except Exception as e:
            return f"[Error extracting text: {e}]"

    text = text.strip()
    if len(text) < OCR_MIN_CHARS:
        gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
        with open(file_path, "rb") as f:
            file_bytes = f.read()
        ocr_text = extract_text_from_scanned_pdf(file_bytes, gemini_key)
        if ocr_text:
            return ocr_text
    return text


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


def _find_keywords(text: str) -> Tuple[List[str], List[str]]:
    text_lower = text.lower()
    found = []
    missing = []
    never_missing = {"leadership", "communication", "teamwork", "problem-solving"}
    for kw in sorted(INDUSTRY_KEYWORDS):
        if kw in text_lower:
            found.append(kw)
        else:
            if kw not in never_missing:
                missing.append(kw)
    return found, missing


ACTION_VERBS = [
    "developed", "designed", "built", "implemented", "architected", "led", "managed",
    "created", "optimized", "delivered", "deployed", "automated", "engineered",
    "launched", "spearheaded", "orchestrated", "established", "pioneered",
    "directed", "drove", "championed", "transformed", "revamped", "accelerated",
    "streamlined", "generated", "produced", "increased", "reduced", "improved",
    "achieved", "exceeded", "negotiated", "reorganized", "restructured",
    "consolidated", "integrated", "unified", "configured", "programmed",
    "coded", "migrated", "scaled", "modernized", "upgraded", "fortified",
    "enabled", "facilitated", "coordinated", "mentored", "trained",
    "recruited", "hired", "coached", "authored", "co-authored", "published",
    "presented", "taught", "instructed", "led", "managed", "supervised",
]

WEAK_PHRASES = [
    r"responsible\s+for",
    r"duties?\s+(included|involved|were)",
    r"worked\s+on",
    r"tasked\s+with",
    r"in\s+charge\s+of",
    r"helped\s+with",
    r"participated\s+in",
    r"was\s+involved\s+in",
    r"handled",
    r"assisted\s+with",
    r"supported\s+(the|in)",
    r"worked\s+as\s+a",
    r"familiar\s+with",
    r"knowledge\s+of",
    r"experience\s+with",
]

BUZZWORDS = [
    "synergy", "synergize", "leverage", "utilize", "innovative", "dynamic",
    "results-oriented", "team player", "go-getter", "think outside the box",
    "hardworking", "motivated", "enthusiastic", "passionate", "dedicated",
    "self-starter", "rockstar", "ninja", "guru", "expert",
    "best of breed", "best-in-class", "world-class", "bleeding edge",
    "game-changer", "disruptive", "thought leadership",
]

COMMON_MISSPELLINGS = {
    r"responsiblities": "responsibilities",
    r"managment": "management",
    r"developped": "developed",
    r"acheived": "achieved",
    r"recieved": "received",
    r"improvment": "improvement",
    r"succesful": "successful",
    r"succesfully": "successfully",
    r"accomodate": "accommodate",
    r"accomodated": "accommodated",
    r"calender": "calendar",
    r"definately": "definitely",
    r"definitley": "definitely",
    r"occured": "occurred",
    r"occuring": "occurring",
    r"priviledge": "privilege",
    r"seperate": "separate",
    r"untill": "until",
    r"wierd": "weird",
    r"writting": "writing",
    r"begining": "beginning",
    r"commitee": "committee",
    r"embarass": "embarrass",
    r"embarassed": "embarrassed",
    r"neccessary": "necessary",
    r"refered": "referred",
    r"refering": "referring",
    r"alot": "a lot",
    r"cant": "cannot",
    r"dont": "don't",
    r"doesnt": "doesn't",
    r"didnt": "didn't",
    r"wont": "won't",
    r"wouldnt": "wouldn't",
    r"couldnt": "couldn't",
    r"shouldnt": "shouldn't",
    r"havent": "haven't",
    r"hasnt": "hasn't",
    r"hadnt": "hadn't",
    r"wasnt": "wasn't",
    r"werent": "weren't",
}


def _count_action_verbs(text: str) -> int:
    text_lower = text.lower()
    count = 0
    for verb in ACTION_VERBS:
        count += len(re.findall(r'\b' + re.escape(verb) + r'\b', text_lower))
    return count


def _count_weak_phrases(text: str) -> int:
    text_lower = text.lower()
    count = 0
    for pattern in WEAK_PHRASES:
        count += len(re.findall(pattern, text_lower))
    return count


def _count_buzzwords(text: str) -> int:
    text_lower = text.lower()
    count = 0
    for bw in BUZZWORDS:
        count += len(re.findall(r'\b' + re.escape(bw) + r'\b', text_lower))
    return count


def _count_quantified(text: str) -> int:
    patterns = [
        r'\b\d{2,}%',
        r'\b\d+x\b',
        r'\$\s*\d{1,3}(?:,\d{3})*(?:\.\d+)?[KkMmBb]?',
        r'\b\d{3,}\s*\+',
        r'\b(?:over|more than|than)\s*\d{2,}',
        r'\b\d{2,}\s*(?:percent|%)',
        r'reduced\s+by\s+\d+',
        r'increased\s+by\s+\d+',
        r'improved\s+by\s+\d+',
        r'\d{2,}\s*(?:users|customers|clients|documents|requests|records|rows|files|projects|revenue|models|patients|employees|members|students|reports|tickets)',
    ]
    count = 0
    text_lower = text.lower()
    for p in patterns:
        count += len(re.findall(p, text_lower))
    return count


def _count_dates(text: str) -> int:
    text_lower = text.lower()
    patterns = [
        r'(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*\d{4}',
        r'\d{1,2}/\d{4}',
        r'\d{4}\s*[-–to]+\s*\d{4}',
        r'\d{4}\s*[-–to]+\s*(?:present|current|now)',
        r'(?:present|current)\s*[-–to]+\s*\d{4}',
    ]
    count = 0
    for p in patterns:
        count += len(re.findall(p, text_lower))
    return count


def score_ats_parse_rate(text: str) -> Tuple[float, List[Dict[str, Any]]]:
    checks = []
    lines = text.split("\n")
    words = text.split()
    word_count = len(words)
    text_lower = text.lower()

    file_format_score = 5.0
    file_format_passed = True
    if text.startswith("[Error"):
        file_format_score = 0.0
        file_format_passed = False
    elif word_count < 50:
        file_format_score = 2.0
        file_format_passed = False
    checks.append({
        "id": "file_format",
        "label": "File Format Detection",
        "passed": file_format_passed,
        "score": file_format_score,
        "max_score": 5,
        "detail": "Document parsed successfully from a valid file format." if file_format_passed else "File could not be parsed or contains insufficient content.",
    })

    sections = detect_sections(text)
    found_sections = [k for k, v in sections.items() if v.strip() and k != "header"]
    essential = {"contact", "summary", "experience", "education", "skills",
                 "professional summary", "work experience", "technical skills", "objective"}
    present_essential = [s for s in found_sections if s in essential]
    section_score = min(len(present_essential) / 5.0 * 15.0, 15.0)
    section_passed = len(present_essential) >= 3
    checks.append({
        "id": "section_completeness",
        "label": "Section Completeness",
        "passed": section_passed,
        "score": section_score,
        "max_score": 15,
        "detail": f"Found {len(present_essential)}/5 essential sections: {', '.join(present_essential) if present_essential else 'none'}." if section_passed else f"Only {len(present_essential)}/5 essential sections detected (contact, summary, experience, education, skills).",
    })

    bullet_chars = [l for l in lines if l.strip() and l.strip()[0] in ("•", "-", "*", "→", "▪", "›", "‣")]
    bullet_count = len(bullet_chars)
    bullet_score = min(bullet_count / 5.0 * 10.0, 10.0)
    bullet_passed = bullet_count >= 5
    checks.append({
        "id": "bullet_format",
        "label": "Bullet Point Format",
        "passed": bullet_passed,
        "score": bullet_score,
        "max_score": 10,
        "detail": f"Found {bullet_count} bullet points; 5+ recommended for ATS parsing." if bullet_passed else f"Only {bullet_count} bullet points found. Use bullet points to list achievements.",
    })

    kw_found, _ = _find_keywords(text)
    kw_count = len(kw_found)
    kw_score = min(kw_count / 25.0 * 20.0, 20.0)
    kw_passed = kw_count >= 15
    checks.append({
        "id": "keyword_density",
        "label": "Keyword Density",
        "passed": kw_passed,
        "score": kw_score,
        "max_score": 20,
        "detail": f"Matched {kw_count} industry keywords; 15+ recommended." if kw_passed else f"Only {kw_count} industry keywords found. Include more relevant skills and technologies.",
    })

    has_email = bool(re.search(r'[\w.+-]+@[\w-]+\.[\w.]+', text))
    has_phone = bool(re.search(r'\+?\d[\d\s\-\.\(\)]{7,}\d', text))
    contact_score = 0.0
    if has_email and has_phone:
        contact_score = 10.0
    elif has_email or has_phone:
        contact_score = 5.0
    contact_passed = has_email and has_phone
    checks.append({
        "id": "contact_info",
        "label": "Contact Information",
        "passed": contact_passed,
        "score": contact_score,
        "max_score": 10,
        "detail": "Email and phone number both present." if contact_passed else f"Missing: {'email' if not has_email else ''} {'phone' if not has_phone else ''}".strip(),
    })

    has_skills_heading = bool(re.search(r'(?im)^skills?[:\s]', text))
    skill_section_score = 10.0 if has_skills_heading else 0.0
    if has_skills_heading:
        skill_lines = re.findall(r'(?im)^skills?[:\s].*$', text)
        skill_content = " ".join(skill_lines)
        tech_keywords_in_skills = [kw for kw in INDUSTRY_KEYWORDS if kw in skill_content.lower()]
        if len(tech_keywords_in_skills) >= 3:
            skill_section_score = 10.0
        else:
            skill_section_score = 6.0
    skill_section_passed = skill_section_score >= 6.0
    checks.append({
        "id": "skills_section",
        "label": "Skills Section Present",
        "passed": skill_section_passed,
        "score": skill_section_score,
        "max_score": 10,
        "detail": "Dedicated Skills section with relevant technologies found." if skill_section_passed else "Add a dedicated Skills section with your technical competencies.",
    })

    pipe_count = text.count("|")
    tab_count = text.count("\t")
    table_score = 5.0
    table_passed = True
    if pipe_count > 10 or tab_count > 15:
        table_score = 0.0
        table_passed = False
    elif pipe_count > 5 or tab_count > 8:
        table_score = 2.0
        table_passed = False
    checks.append({
        "id": "no_tables",
        "label": "No Complex Tables",
        "passed": table_passed,
        "score": table_score,
        "max_score": 5,
        "detail": "No complex table structures detected." if table_passed else "Complex table or multi-column layout detected — may confuse ATS parsers.",
    })

    non_standard = len(re.findall(r'[^\x20-\x7E\n\r\t]', text))
    total_chars = len(text)
    std_ratio = 1.0 - (non_standard / max(total_chars, 1))
    std_score = min(std_ratio / 0.95 * 5.0, 5.0)
    std_passed = std_ratio >= 0.95
    checks.append({
        "id": "standard_chars",
        "label": "Standard Characters",
        "passed": std_passed,
        "score": std_score,
        "max_score": 5,
        "detail": "Uses standard UTF-8/ASCII characters." if std_passed else f"{non_standard} non-standard characters detected — may break ATS parsing.",
    })

    length_score = 0.0
    if 300 <= word_count <= 800:
        length_score = 10.0
    elif 200 <= word_count < 300:
        length_score = 7.0
    elif 800 < word_count <= 1200:
        length_score = 6.0
    elif 100 <= word_count < 200:
        length_score = 4.0
    elif word_count > 1200:
        length_score = 3.0
    elif word_count < 100:
        length_score = 1.0
    length_passed = 250 <= word_count <= 900
    checks.append({
        "id": "resume_length",
        "label": "Resume Length",
        "passed": length_passed,
        "score": length_score,
        "max_score": 10,
        "detail": f"{word_count} words — ideal range is 300-800." if length_passed else f"{word_count} words — {'too short' if word_count < 250 else 'too long'} (aim for 300-800 words).",
    })

    date_count = _count_dates(text)
    date_score = min(date_count / 3.0 * 10.0, 10.0)
    date_passed = date_count >= 2
    checks.append({
        "id": "experience_dates",
        "label": "Experience with Dates",
        "passed": date_passed,
        "score": date_score,
        "max_score": 10,
        "detail": f"Found {date_count} date references; 2+ required for experience duration context." if date_passed else f"Only {date_count} date{'s' if date_count != 1 else ''} found. Include month/year for each role.",
    })

    total_score = sum(c["score"] for c in checks)
    return total_score, checks


def score_human_quality(text: str) -> Tuple[float, List[Dict[str, Any]]]:
    checks = []
    lines = text.split("\n")
    words = text.split()
    text_lower = text.lower()

    quant_count = _count_quantified(text)
    quant_score = min(quant_count / 4.0 * 20.0, 20.0)
    quant_passed = quant_count >= 3
    checks.append({
        "id": "quantified_achievements",
        "label": "Quantified Achievements",
        "passed": quant_passed,
        "score": quant_score,
        "max_score": 20,
        "detail": f"Found {quant_count} quantified achievements; 3+ recommended." if quant_passed else f"Only {quant_count} quantified achievement{'s' if quant_count != 1 else ''}. Add metrics (%, $, counts) to demonstrate impact.",
    })

    verb_count = _count_action_verbs(text)
    verb_score = min(verb_count / 10.0 * 15.0, 15.0)
    verb_passed = verb_count >= 6
    checks.append({
        "id": "action_verbs",
        "label": "Action Verbs",
        "passed": verb_passed,
        "score": verb_score,
        "max_score": 15,
        "detail": f"Found {verb_count} strong action verbs; 6+ recommended." if verb_passed else f"Only {verb_count} action verb{'s' if verb_count != 1 else ''}. Start bullets with strong verbs like 'developed', 'implemented', 'led'.",
    })

    passive_patterns = [
        r'\bwas\s+\w+ed\b',
        r'\bwere\s+\w+ed\b',
        r'\bhas been\s+\w+ed\b',
        r'\bhave been\s+\w+ed\b',
        r'\bhad been\s+\w+ed\b',
        r'\bwas\s+being\s+\w+ed\b',
        r'\bwere\s+being\s+\w+ed\b',
    ]
    passive_count = 0
    for p in passive_patterns:
        passive_count += len(re.findall(p, text_lower))
    active_verb_count = verb_count
    active_passive_ratio = active_verb_count / max(passive_count, 1)
    if passive_count == 0:
        voice_score = 10.0
    elif active_passive_ratio >= 5:
        voice_score = 9.0
    elif active_passive_ratio >= 3:
        voice_score = 7.0
    elif active_passive_ratio >= 2:
        voice_score = 5.0
    elif active_passive_ratio >= 1:
        voice_score = 3.0
    else:
        voice_score = 1.0
    voice_passed = active_passive_ratio >= 2
    checks.append({
        "id": "active_voice",
        "label": "Active Voice",
        "passed": voice_passed,
        "score": voice_score,
        "max_score": 10,
        "detail": f"Active-to-passive ratio is {active_passive_ratio:.1f}:1 — predominantly active voice." if voice_passed else f"Passive voice detected {passive_count} time{'s' if passive_count != 1 else ''}. Rewrite in active voice for stronger impact.",
    })

    buzzword_count = _count_buzzwords(text)
    if buzzword_count <= 1:
        buzzword_score = 10.0
    elif buzzword_count <= 3:
        buzzword_score = 7.0
    elif buzzword_count <= 5:
        buzzword_score = 4.0
    else:
        buzzword_score = 2.0
    buzzword_passed = buzzword_count <= 2
    checks.append({
        "id": "buzzword_avoidance",
        "label": "Buzzword Avoidance",
        "passed": buzzword_passed,
        "score": buzzword_score,
        "max_score": 10,
        "detail": f"Found {buzzword_count} buzzword{'s' if buzzword_count != 1 else ''} — clean, specific language." if buzzword_passed else f"Found {buzzword_count} buzzword{'s' if buzzword_count != 1 else ''} ('synergy', 'leverage', 'rockstar', etc.). Replace with concrete specifics.",
    })

    spelling_errors = 0
    for pattern, correction in COMMON_MISSPELLINGS.items():
        matches = re.findall(pattern, text_lower)
        spelling_errors += len(matches)
    grammar_issues = 0
    inconsistent_tense = len(re.findall(r'\b(presented|presenting|presents)\b', text_lower)) > 0
    double_spaces = len(re.findall(r'  +', text))
    grammar_issues += double_spaces
    sentence_start_errors = len(re.findall(r'[.!?]\s+[a-z]', text))
    if sentence_start_errors > 3:
        grammar_issues += sentence_start_errors - 3
    total_issues = spelling_errors + grammar_issues
    grammar_score = max(10.0 - total_issues * 2, 0.0)
    grammar_passed = total_issues <= 2
    checks.append({
        "id": "spelling_grammar",
        "label": "Spelling & Grammar",
        "passed": grammar_passed,
        "score": grammar_score,
        "max_score": 10,
        "detail": f"{spelling_errors} spelling issue{'s' if spelling_errors != 1 else ''}, {grammar_issues} grammar issue{'s' if grammar_issues != 1 else ''} — clean writing." if grammar_passed else f"Found {total_issues} issue{'s' if total_issues != 1 else ''} (spelling + grammar). Proofread carefully.",
    })

    has_headline = bool(re.search(r'(?im)^(professional summary|summary|objective|profile|about me)[:\s]', text))
    first_line = lines[0].strip() if lines else ""
    if has_headline:
        headline_score = 5.0
    elif len(first_line) > 10 and len(first_line) < 150:
        headline_score = 3.0
    else:
        headline_score = 0.0
    headline_passed = has_headline
    checks.append({
        "id": "tailored_headline",
        "label": "Tailored Headline / Summary",
        "passed": headline_passed,
        "score": headline_score,
        "max_score": 5,
        "detail": "Professional summary or objective section found." if headline_passed else "Add a professional summary at the top to show your target role.",
    })

    personality_signals = [
        r'\b(volunteer|volunteering)\b',
        r'\b(certification|certified|certificate)\b',
        r'\b(languages?|bilingual|fluent)\b',
        r'\b(interest|hobby|hobbies|passion|enthusiast)\b',
        r'\b(publication|published|author)\b',
        r'\b(award|honor|recognition|scholarship|dean.{0,10}list)\b',
        r'\b(open.{0,5}source|github|side.{0,5}project|personal project)\b',
        r'\b(mentor|mentoring|teaching|coach)\b',
        r'\b(conference|talk|speaker|workshop|seminar)\b',
        r'\b(patent|filing|trademark|ip)\b',
    ]
    personality_count = 0
    for p in personality_signals:
        personality_count += len(re.findall(p, text_lower))
    personality_score = min(personality_count / 3.0 * 10.0, 10.0)
    personality_passed = personality_count >= 2
    checks.append({
        "id": "personality_showcase",
        "label": "Personality & Extracurriculars",
        "passed": personality_passed,
        "score": personality_score,
        "max_score": 10,
        "detail": f"Found {personality_count} personality signals (volunteering, certifications, interests, etc.)." if personality_passed else f"Only {personality_count} personality signal{'s' if personality_count != 1 else ''}. Add volunteering, certifications, or side projects to stand out.",
    })

    bullet_starts = []
    for line in lines:
        stripped = line.strip()
        if stripped and stripped[0] in ("•", "-", "*", "→", "▪", "›", "‣"):
            rest = stripped[1:].strip()
            if rest:
                first_word = rest.split()[0].lower() if rest.split() else ""
                bullet_starts.append(first_word)
    weak_starts = {"the", "a", "an", "this", "that", "these", "those", "my", "our", "their", "his", "her", "it", "its", "to", "for", "with", "from", "by", "in", "on", "at"}
    strong_bullet_count = sum(1 for w in bullet_starts if w not in weak_starts)
    total_bullets = len(bullet_starts)
    if total_bullets == 0:
        bullet_start_score = 0.0
        bullet_start_passed = False
    else:
        strong_ratio = strong_bullet_count / total_bullets
        bullet_start_score = min(strong_ratio / 0.8 * 10.0, 10.0)
        bullet_start_passed = strong_ratio >= 0.7
    checks.append({
        "id": "strong_bullet_starts",
        "label": "Strong Bullet Starts",
        "passed": bullet_start_passed,
        "score": bullet_start_score,
        "max_score": 10,
        "detail": f"{strong_bullet_count}/{total_bullets} bullets start with strong words." if bullet_start_passed else f"Only {strong_bullet_count}/{total_bullets} bullets start with strong content. Start each bullet with an action verb.",
    })

    weak_phrase_count = _count_weak_phrases(text)
    weak_score = max(5.0 - weak_phrase_count * 1.5, 0.0)
    weak_passed = weak_phrase_count <= 1
    checks.append({
        "id": "weak_phrases",
        "label": "Weak Phrase Detection",
        "passed": weak_passed,
        "score": weak_score,
        "max_score": 5,
        "detail": f"No weak phrases found (e.g., 'responsible for', 'duties included')." if weak_passed else f"Found {weak_phrase_count} weak phrase{'s' if weak_phrase_count != 1 else ''}. Replace 'responsible for' with strong action verbs.",
    })

    structure_score = 5.0
    structure_issues = []
    long_lines = [l for l in lines if len(l.strip()) > 200]
    if long_lines:
        structure_issues.append(f"{len(long_lines)} overly long line{'s' if len(long_lines) != 1 else ''}")
        structure_score -= 1.5
    empty_lines = sum(1 for l in lines if l.strip() == "")
    total_lines = len(lines)
    if total_lines > 0:
        empty_ratio = empty_lines / total_lines
        if empty_ratio > 0.3:
            structure_issues.append("excessive blank lines")
            structure_score -= 1.5
        elif empty_ratio < 0.05:
            structure_issues.append("too few blank lines between sections")
            structure_score -= 1.0
    all_caps_lines = [l for l in lines if l.strip().isupper() and len(l.strip()) > 3]
    if len(all_caps_lines) > 3:
        structure_issues.append("excessive ALL CAPS")
        structure_score -= 1.0
    inconsistent_case = len(re.findall(r'^[a-z]', text, re.MULTILINE)) > len(lines) * 0.3
    if inconsistent_case and not structure_issues:
        structure_issues.append("inconsistent line capitalization")
        structure_score -= 1.0
    structure_score = max(structure_score, 0.0)
    structure_passed = structure_score >= 4.0
    checks.append({
        "id": "structure_quality",
        "label": "Overall Structure Quality",
        "passed": structure_passed,
        "score": structure_score,
        "max_score": 5,
        "detail": "Well-structured document with consistent formatting." if structure_passed else f"Issues: {', '.join(structure_issues)}." if structure_issues else "Minor formatting inconsistencies detected.",
    })

    total_score = sum(c["score"] for c in checks)
    return total_score, checks


def generate_dual_score_report(file_path: str) -> dict:
    raw_text = parse_resume(file_path)
    word_count = len(raw_text.split())

    tier1_score, tier1_checks = score_ats_parse_rate(raw_text)
    tier2_score, tier2_checks = score_human_quality(raw_text)

    unified_score = round((tier1_score + tier2_score) / 2.0, 1)

    all_suggestions = []
    for check in tier1_checks + tier2_checks:
        if not check["passed"]:
            all_suggestions.append(check["detail"])
    all_suggestions = list(dict.fromkeys(all_suggestions))

    format_checks = ["section_completeness", "bullet_format", "no_tables", "standard_chars", "resume_length"]
    keyword_checks = ["keyword_density", "skills_section"]
    experience_checks = ["quantified_achievements", "action_verbs", "strong_bullet_starts", "weak_phrases"]
    ats_checks = ["file_format", "contact_info", "experience_dates"]

    def sum_checks(check_ids, source_checks):
        ids_set = set(check_ids)
        return round(sum(c["score"] for c in source_checks if c["id"] in ids_set), 1)

    formatting = sum_checks(format_checks, tier1_checks)
    keywords = sum_checks(keyword_checks, tier1_checks)
    experience_impact = sum_checks(experience_checks, tier2_checks)
    ats_compatibility = sum_checks(ats_checks, tier1_checks)

    breakdown = {
        "formatting": formatting,
        "keywords": keywords,
        "experience_impact": experience_impact,
        "ats_compatibility": ats_compatibility,
    }

    kw_found, kw_missing = _find_keywords(raw_text)

    return {
        "atsparse_score": round(tier1_score, 1),
        "human_quality_score": round(tier2_score, 1),
        "unified_score": unified_score,
        "tier1_checks": tier1_checks,
        "tier2_checks": tier2_checks,
        "all_suggestions": all_suggestions,
        "breakdown": breakdown,
        "keywords_found": kw_found[:20],
        "keywords_missing": kw_missing[:10],
        "word_count": word_count,
        "raw_text": raw_text,
    }


NINETEEN_POINT_CATEGORIES = {
    "Content": {
        "checks": [
            ("file_format", "ATS parse rate"),
            ("weak_phrases", "Repetition of words & phrases"),
            ("spelling_grammar", "Spelling & grammar"),
            ("quantified_achievements", "Quantifying impact in experience"),
            ("tailored_headline", "Generate tailored title"),
            ("action_verbs", "Action verbs"),
        ]
    },
    "Format": {
        "checks": [
            ("standard_chars", "Font readability"),
            ("structure_quality", "Consistent spacing"),
            ("no_tables", "Proper margins"),
        ]
    },
    "Skills": {
        "checks": [
            ("skills_section", "Relevant skills highlighted"),
            ("keyword_density", "Industry keywords present"),
        ]
    },
    "Sections": {
        "checks": [
            ("contact_info", "Contact information included"),
            ("experience_dates", "Work experience section"),
            ("section_completeness", "Education section present"),
        ]
    },
    "Style": {
        "checks": [
            ("active_voice", "Professional tone"),
            ("strong_bullet_starts", "Clear hierarchy"),
            ("bullet_format", "Bullet point consistency"),
            ("buzzword_avoidance", "Color usage appropriate"),
            ("personality_showcase", "Professional tone"),
        ]
    },
}


def generate_nineteen_point_checks(tier1_checks, tier2_checks):
    all_checks = {c["id"]: c for c in tier1_checks + tier2_checks}
    categories = {}
    for cat_name, cat_data in NINETEEN_POINT_CATEGORIES.items():
        items = []
        passed = 0
        for check_id, label in cat_data["checks"]:
            check = all_checks.get(check_id)
            if check:
                items.append({
                    "label": label,
                    "passed": check["passed"],
                    "score": check["score"],
                    "max_score": check["max_score"],
                })
                if check["passed"]:
                    passed += 1
        total = len(items)
        score = round(passed / total * 100) if total > 0 else 0
        categories[cat_name] = {
            "score": score,
            "passed": passed,
            "total": total,
            "items": items,
        }
    return categories


def calculate_ats_score(file_path: str) -> dict:
    report = generate_dual_score_report(file_path)
    total = min(max(round(report["unified_score"]), 0), 100)
    return {
        "ats_score": total,
        "breakdown": report["breakdown"],
        "keywords_found": report["keywords_found"],
        "keywords_missing": report["keywords_missing"],
        "suggestions": report["all_suggestions"][:8],
        "word_count": report["word_count"],
        "raw_text": report["raw_text"],
        "tier1_checks": report["tier1_checks"],
        "tier2_checks": report["tier2_checks"],
        "nineteen_point": generate_nineteen_point_checks(report["tier1_checks"], report["tier2_checks"]),
    }
