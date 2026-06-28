import json
import os
import re
from typing import Optional
from app.config import settings

HAS_OPENAI = False
openai = None

STRONG_VERBS = {
    "responsible for": ["Led", "Managed", "Owned"],
    "worked on": ["Developed", "Built", "Engineered"],
    "involved in": ["Contributed to", "Drove", "Executed"],
    "helped with": ["Facilitated", "Supported", "Enabled"],
    "was part of": ["Collaborated on", "Co-developed", "Participated in"],
    "tasked with": ["Charged with", "Accountable for", "Directed"],
}

WEAK_PHRASES = [
    "responsible for", "worked on", "involved in", "helped with",
    "was part of", "tasked with", "duties included", "etc", "and more",
]

BUZZWORDS = [
    "synergy", "synergize", "think outside the box", "bleeding edge",
    "cutting edge", "game changer", "rockstar", "ninja", "guru",
    "best of breed", "value add", "deep dive", "drill down", "wheelhouse",
    "circle back", "touch base", "reach out", "leverage", "utilize",
    "holistic", "world-class",
]

CLOUD_TERMS = [
    "aws", "azure", "gcp", "cloud", "kubernetes", "docker",
    "terraform", "cloudformation", "serverless", "lambda",
]


def _clean_json_response(text: str) -> str:
    text = re.sub(r'^```json\s*', '', text.strip())
    text = re.sub(r'\s*```$', '', text)
    text = re.sub(r'^```\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


def _try_openai(prompt: str, system_prompt: str) -> Optional[dict]:
    global openai, HAS_OPENAI
    if not HAS_OPENAI:
        try:
            import openai as _o
            openai = _o
            HAS_OPENAI = True
        except ImportError:
            return None
    try:
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            return None
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=500,
        )
        text = response.choices[0].message.content.strip()
        text = _clean_json_response(text)
        return json.loads(text)
    except Exception:
        return None


def _try_groq(prompt: str) -> Optional[dict]:
    try:
        from openai import OpenAI
        api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
        if not api_key:
            return None
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500,
        )
        text = response.choices[0].message.content.strip()
        text = _clean_json_response(text)
        return json.loads(text)
    except Exception:
        return None


def _past_tense(verb: str) -> str:
    irregular = {
        "lead": "led", "run": "ran", "build": "built",
        "drive": "drove", "write": "wrote", "develop": "developed",
        "manage": "managed", "create": "created", "implement": "implemented",
        "design": "designed", "engineer": "engineered",
        "coordinate": "coordinated", "facilitate": "facilitated",
        "contribute": "contributed", "execute": "executed",
        "support": "supported", "enable": "enabled", "direct": "directed",
        "own": "owned", "charge": "charged",
    }
    v = verb.strip().lower()
    if v in irregular:
        return irregular[v]
    if v.endswith("e"):
        return v + "d"
    if v.endswith("y") and len(v) > 2 and v[-2] not in "aeiou":
        return v[:-1] + "ied"
    return v + "ed"


def _has_number(text: str) -> bool:
    return bool(re.search(r'\d+', text))


def _replace_weak_phrases(text: str) -> tuple[str, list[str]]:
    changes = []
    result = text
    for weak, strong_list in STRONG_VERBS.items():
        pattern = re.compile(re.escape(weak), re.IGNORECASE)
        if pattern.search(result):
            replacement = strong_list[0]
            result = pattern.sub(replacement, result)
            changes.append(f"Replaced '{weak}' with '{replacement}'")
    return result, changes


def _add_quantification(text: str) -> tuple[str, list[str]]:
    if not _has_number(text):
        result = text.rstrip(".") + " resulting in measurable improvements"
        return result, ["Added quantification template"]
    return text, []


def _ensure_past_tense(text: str) -> tuple[str, list[str]]:
    changes = []
    words = text.split()
    if not words:
        return text, changes
    first_word = words[0].strip(".,!?;:")
    lower_first = first_word.lower()
    already_past = {
        "led", "managed", "owned", "developed", "built", "engineered",
        "contributed", "drove", "executed", "facilitated", "supported",
        "enabled", "collaborated", "participated", "charged", "accountable",
        "directed", "created", "designed", "implemented", "improved",
        "reduced", "increased", "launched", "delivered", "established",
        "generated", "produced", "achieved",
    }
    skip_words = {"i", "we", "the", "a", "an", "my", "our", "this", "that"}
    if lower_first in already_past or lower_first in skip_words:
        return text, changes
    past = _past_tense(lower_first)
    if past != lower_first:
        result = past + text[len(first_word):]
        changes.append(f"Changed '{first_word}' to past tense '{past}'")
        return result, changes
    return text, changes


def _template_rewrite_bullet(original_text: str) -> dict:
    text = original_text.strip()
    changes = []

    text, c = _replace_weak_phrases(text)
    changes.extend(c)

    if text and text[0].islower():
        text = text[0].upper() + text[1:]

    text, c = _ensure_past_tense(text)
    changes.extend(c)

    text, c = _add_quantification(text)
    changes.extend(c)

    if not changes and text:
        text = "Led " + text[0].lower() + text[1:]
        changes.append("Added strong lead verb")

    return {
        "success": True,
        "original": original_text,
        "rewritten": text,
        "changes_made": changes,
    }


def rewrite_bullet(original_text: str, job_description: str = "", profile_context: str = "") -> dict:
    try:
        if HAS_OPENAI:
            sys_prompt = (
                "You are a senior resume writer. Rewrite the following bullet point "
                "to be more impactful, using active voice, quantifying results where possible, "
                "and keeping it concise (max 2 lines). "
                'Return JSON: {"rewritten": "...", "changes_made": ["..."]}'
            )
            user_prompt = f"Original: {original_text}"
            if job_description:
                user_prompt += f"\nJob Description: {job_description}"
            if profile_context:
                user_prompt += f"\nProfile Context: {profile_context}"

            result = _try_openai(user_prompt, sys_prompt)
            if result and "rewritten" in result:
                return {
                    "success": True,
                    "original": original_text,
                    "rewritten": result["rewritten"],
                    "changes_made": result.get("changes_made", []),
                }

        groq_result = _try_groq(user_prompt if not job_description and not profile_context else f"System: {sys_prompt}\n\n{user_prompt}")
        if groq_result and "rewritten" in groq_result:
            return {
                "success": True,
                "original": original_text,
                "rewritten": groq_result["rewritten"],
                "changes_made": groq_result.get("changes_made", []),
            }

        return _template_rewrite_bullet(original_text)
    except Exception as e:
        return {
            "success": False,
            "original": original_text,
            "rewritten": original_text,
            "changes_made": [],
            "error": str(e),
        }


def _template_rewrite_headline(profile_text: str, target_role: str = "") -> dict:
    lines = profile_text.strip().split("\n")
    first_line = lines[0].strip() if lines else ""

    role = target_role
    if not role:
        for pattern in [
            r'(?:^|\n)\s*([A-Z][A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Manager|Architect|Lead|Specialist|Consultant|Director|Head|Officer))',
        ]:
            match = re.search(pattern, profile_text)
            if match:
                role = match.group(1).strip()
                break

    skill_matches = re.findall(
        r'\b(Python|Java|JavaScript|TypeScript|React|Node|SQL|NoSQL|AWS|Azure|GCP|Docker|Kubernetes|TensorFlow|PyTorch|Scikit-learn|Pandas|NumPy|Spark|Hadoop|Tableau|Power\s*BI|R|C\+\+|Go|Rust|Ruby|PHP|Swift|Kotlin|Scala|Perl|Matlab|Excel|SAP|Oracle|MongoDB|PostgreSQL|MySQL|Redis|Kafka|Airflow|MLflow|Git|Linux|Agile|Scrum)\b',
        profile_text, re.IGNORECASE,
    )
    skill_words = list(dict.fromkeys(s.capitalize() for s in skill_matches))[:5]

    if "data" in profile_text.lower() or "analytics" in profile_text.lower():
        value = "Driving data-informed decisions"
    elif "machine learning" in profile_text.lower() or "ml" in profile_text.lower():
        value = "Building intelligent ML solutions"
    elif "engineer" in profile_text.lower():
        value = "Engineering scalable systems"
    elif "developer" in profile_text.lower() or "software" in profile_text.lower():
        value = "Crafting high-quality software"
    else:
        value = "Delivering technology solutions"

    parts = []
    if role:
        parts.append(role)
    if skill_words:
        parts.append(" | ".join(skill_words[:3]))
    parts.append(value)
    headline = " | ".join(parts)

    changes = []
    if role:
        changes.append(f"Extracted role: {role}")
    if skill_words:
        changes.append(f"Selected {len(skill_words)} key skills")
    changes.append("Formatted as Role | Skills | Value")

    return {
        "success": True,
        "original": first_line,
        "rewritten": headline,
        "changes_made": changes,
    }


def rewrite_headline(profile_text: str, target_role: str = "") -> dict:
    try:
        sys_prompt = (
            "You are a senior resume writer. Generate a professional headline "
            "that combines role, key skills, and value proposition. "
            "Keep it under 220 characters. "
            'Return JSON: {"rewritten": "...", "changes_made": ["..."]}'
        )
        user_prompt = f"Profile: {profile_text}"
        if target_role:
            user_prompt += f"\nTarget Role: {target_role}"

        if HAS_OPENAI:
            result = _try_openai(user_prompt, sys_prompt)
            if result and "rewritten" in result:
                return {
                    "success": True,
                    "original": profile_text.split("\n")[0].strip(),
                    "rewritten": result["rewritten"],
                    "changes_made": result.get("changes_made", []),
                }

        groq_result = _try_groq(f"{sys_prompt}\n\n{user_prompt}")
        if groq_result and "rewritten" in groq_result:
            return {
                "success": True,
                "original": profile_text.split("\n")[0].strip(),
                "rewritten": groq_result["rewritten"],
                "changes_made": groq_result.get("changes_made", []),
            }

        return _template_rewrite_headline(profile_text, target_role)
    except Exception as e:
        return {
            "success": False,
            "original": profile_text.split("\n")[0].strip(),
            "rewritten": profile_text.split("\n")[0].strip(),
            "changes_made": [],
            "error": str(e),
        }


def _template_rewrite_summary(profile_text: str, target_role: str = "") -> dict:
    lines = profile_text.strip().split("\n")
    first_line = lines[0].strip() if lines else ""

    role = target_role
    if not role:
        for pattern in [
            r'(?:^|\n)\s*([A-Z][A-Za-z\s]+(?:Engineer|Developer|Scientist|Analyst|Manager|Architect|Lead|Specialist|Consultant))',
        ]:
            match = re.search(pattern, profile_text)
            if match:
                role = match.group(1).strip()
                break

    skill_matches = re.findall(
        r'\b(Python|Java|JavaScript|TypeScript|React|Node|SQL|NoSQL|AWS|Azure|GCP|Docker|Kubernetes|TensorFlow|PyTorch|Scikit-learn|Pandas|NumPy|Spark|Hadoop|Tableau|Power\s*BI|R|C\+\+|Go|Rust|Ruby|PHP|Swift|Kotlin|Scala|Perl|Matlab|Excel|SAP|Oracle|MongoDB|PostgreSQL|MySQL|Redis|Kafka|Airflow|MLflow|Git|Linux)\b',
        profile_text, re.IGNORECASE,
    )
    skill_words = [s.capitalize() for s in dict.fromkeys(s.lower() for s in skill_matches)][:4]

    yr_match = re.search(r'(\d+)\+?\s*(?:years?|yrs?)', profile_text, re.IGNORECASE)
    years = yr_match.group(1) if yr_match else "several"

    role_display = role or first_line or "Technology Professional"
    role_lower = role_display.lower()
    if any(w in role_lower for w in ["data", "analytics", "science"]):
        domain = "data analytics and machine learning"
    elif any(w in role_lower for w in ["engineer", "developer", "software"]):
        domain = "software engineering"
    elif any(w in role_lower for w in ["product", "project"]):
        domain = "product and project management"
    else:
        domain = "technology"

    skills_str = ", ".join(skill_words) if skill_words else "modern technologies"

    sentences = [
        f"{role_display} with {years} years of experience in {domain}, "
        f"passionate about solving complex problems and delivering impactful solutions.",
        f"Proficient in {skills_str}, with a proven track record of driving efficiency, "
        f"improving performance, and leading cross-functional initiatives.",
        f"Committed to continuous learning and applying best practices to build scalable, "
        f"maintainable systems that drive business value.",
    ]
    summary = " ".join(sentences)

    changes = []
    if role:
        changes.append(f"Identified role: {role}")
    if skill_words:
        changes.append(f"Highlighted {len(skill_words)} key skills")
    changes.append("Generated 3-sentence professional summary")

    return {
        "success": True,
        "original": first_line,
        "rewritten": summary,
        "changes_made": changes,
    }


def rewrite_summary(profile_text: str, target_role: str = "") -> dict:
    try:
        sys_prompt = (
            "You are a senior resume writer. Write a 3-4 sentence professional summary "
            "that highlights experience, key skills, and value proposition. "
            'Return JSON: {"rewritten": "...", "changes_made": ["..."]}'
        )
        user_prompt = f"Profile: {profile_text}"
        if target_role:
            user_prompt += f"\nTarget Role: {target_role}"

        if HAS_OPENAI:
            result = _try_openai(user_prompt, sys_prompt)
            if result and "rewritten" in result:
                return {
                    "success": True,
                    "original": profile_text.split("\n")[0].strip(),
                    "rewritten": result["rewritten"],
                    "changes_made": result.get("changes_made", []),
                }

        groq_result = _try_groq(f"{sys_prompt}\n\n{user_prompt}")
        if groq_result and "rewritten" in groq_result:
            return {
                "success": True,
                "original": profile_text.split("\n")[0].strip(),
                "rewritten": groq_result["rewritten"],
                "changes_made": groq_result.get("changes_made", []),
            }

        return _template_rewrite_summary(profile_text, target_role)
    except Exception as e:
        return {
            "success": False,
            "original": profile_text.split("\n")[0].strip(),
            "rewritten": profile_text.split("\n")[0].strip(),
            "changes_made": [],
            "error": str(e),
        }


def _check_quantified_achievements(text: str) -> Optional[dict]:
    if not _has_number(text):
        return {
            "icon": "trending-up",
            "title": "Add quantified achievements",
            "description": "Your resume lacks measurable results. Add numbers, percentages, and metrics to demonstrate impact.",
            "priority": "high",
        }
    return None


def _check_weak_verbs(text: str) -> Optional[dict]:
    text_lower = text.lower()
    for weak in WEAK_PHRASES:
        if weak in text_lower:
            return {
                "icon": "edit",
                "title": "Use stronger action verbs",
                "description": "Replace passive phrases like 'responsible for' with strong verbs such as 'Led', 'Developed', or 'Engineered'.",
                "priority": "high",
            }
    return None


def _check_cloud_technologies(text: str) -> Optional[dict]:
    text_lower = text.lower()
    for term in CLOUD_TERMS:
        if term in text_lower:
            return None
    return {
        "icon": "cloud",
        "title": "Include cloud technologies",
        "description": "Many roles require cloud experience (AWS, Azure, GCP). Consider adding relevant cloud skills and certifications.",
        "priority": "medium",
    }


def _check_keyword_density(text: str, target_role: str) -> Optional[dict]:
    if not target_role:
        return None
    role_keywords = set(w.lower().strip(".,!?;:") for w in target_role.split() if len(w) > 2)
    text_words = set(w.lower().strip(".,!?;:") for w in text.split())
    overlap = role_keywords & text_words
    if len(overlap) < 2:
        return {
            "icon": "search",
            "title": "Improve keyword density",
            "description": f"Incorporate more keywords related to '{target_role}' throughout your resume to improve ATS ranking.",
            "priority": "high",
        }
    return None


def _check_professional_summary(text: str) -> Optional[dict]:
    first_200 = text[:200].lower()
    has_summary_indicators = any(
        phrase in first_200
        for phrase in ["professional summary", "profile summary", "summary", "about me", "career objective"]
    )
    if not has_summary_indicators:
        hint_words = ["experience", "professional", "skilled", "passionate", "dedicated"]
        hint_count = sum(1 for w in hint_words if w in first_200)
        if hint_count < 2:
            return {
                "icon": "file-text",
                "title": "Add a professional summary",
                "description": "A strong professional summary at the top helps recruiters quickly understand your value proposition.",
                "priority": "medium",
            }
    return None


def _check_headline(headline: str) -> Optional[dict]:
    generic_titles = ["software engineer", "developer", "engineer", "analyst", "student"]
    headline_lower = headline.lower()
    words = headline_lower.split()
    if len(words) <= 3 and any(gt in headline_lower for gt in generic_titles):
        return {
            "icon": "type",
            "title": "Tailor your headline",
            "description": "Your headline is generic. Add specialization, key skills, or value proposition to stand out.",
            "priority": "medium",
        }
    return None


def _check_passive_voice(text: str) -> Optional[dict]:
    passive_patterns = [
        r'\bwas\s+\w+ed\b', r'\bwere\s+\w+ed\b',
        r'\bbeen\s+\w+ed\b', r'\bwas\s+\w+en\b',
    ]
    for pattern in passive_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return {
                "icon": "volume-2",
                "title": "Fix passive voice",
                "description": "Passive constructions can reduce impact. Rewrite in active voice with strong action verbs.",
                "priority": "medium",
            }
    return None


def _check_buzzwords(text: str) -> Optional[dict]:
    text_lower = text.lower()
    found = []
    for bw in BUZZWORDS:
        if bw in text_lower and bw not in found:
            found.append(bw)
    if found:
        return {
            "icon": "alert-octagon",
            "title": "Remove buzzwords",
            "description": f"Replace clichés like '{', '.join(found[:3])}' with specific, concrete language that demonstrates real impact.",
            "priority": "low",
        }
    return None


def generate_suggestions(profile_text: str, target_role: str = "") -> list[dict]:
    suggestions = []
    for checker in [
        _check_quantified_achievements,
        _check_weak_verbs,
        _check_cloud_technologies,
        _check_professional_summary,
        _check_passive_voice,
        _check_buzzwords,
    ]:
        result = checker(profile_text)
        if result:
            suggestions.append(result)

    headline_result = _check_headline(profile_text.split("\n")[0].strip())
    if headline_result:
        suggestions.append(headline_result)

    keyword_result = _check_keyword_density(profile_text, target_role)
    if keyword_result:
        suggestions.append(keyword_result)

    priority_order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda s: priority_order.get(s.get("priority", "low"), 3))
    return suggestions
