import json
import re
from typing import Optional
from app.config import settings


EXTRACT_PROMPT = """You are a talent acquisition specialist. Extract the most important keywords and requirements from this job description.

### JOB DESCRIPTION:
{job_description}

### INSTRUCTIONS:
Extract the following categories of information:

1. **Required Skills (Technical):** List all technical skills mentioned.
2. **Required Skills (Soft):** List all soft skills mentioned.
3. **Qualifications:** List required degrees, certifications, or years of experience.
4. **Key Responsibilities:** Summarize the top 5 responsibilities in 5 bullet points.
5. **Keywords for Resume:** Provide a list of 15-20 keywords that should appear in the tailored resume.

Return a JSON object with:
1. "technical_skills": array of technical skills
2. "soft_skills": array of soft skills
3. "qualifications": array of qualifications
4. "key_responsibilities": array of 5 responsibility strings
5. "resume_keywords": array of 15-20 keywords
6. "role_level": estimated level (entry/mid/senior/lead)
7. "industry": primary industry

Return ONLY valid JSON. No markdown, no code fences."""


def _call_llm(prompt: str) -> Optional[dict]:
    try:
        from openai import OpenAI
        api_key = settings.GROQ_API_KEY
        if not api_key:
            return None
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000,
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


SKILL_PATTERNS = [
    r'\b(python|java|javascript|typescript|react|node|sql|nosql|aws|azure|gcp|docker|kubernetes|'
    r'tensorflow|pytorch|scikit-learn|pandas|numpy|spark|hadoop|tableau|power\s*bi|r|c\+\+|go|rust|'
    r'ruby|php|swift|kotlin|scala|perl|matlab|excel|sap|oracle|mongodb|postgresql|mysql|redis|kafka|'
    r'airflow|mlflow|git|linux|html|css|sass|vue|angular|svelte|next|nuxt|fastapi|flask|django|spring|'
    r'node\.?js|express|graphql|rest\s*api|grpc|terraform|ansible|jenkins|ci/cd|machine\s*learning|'
    r'deep\s*learning|nlp|computer\s*vision|llm|rag|langchain|huggingface|openai|anthropic|gemini)\b'
]

QUALIFICATION_PATTERNS = [
    r'(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?experience',
    r"(?:bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?tech|m\.?tech|mba|doctorate)(?:'s)?\s*(?:degree)?",
    r'(?:certified|certification|certificate)\s+\w+',
]


def _template_extract(job_description: str) -> dict:
    jd_lower = job_description.lower()

    technical_skills = []
    for pattern in SKILL_PATTERNS:
        matches = re.findall(pattern, jd_lower)
        technical_skills.extend(matches)
    technical_skills = list(dict.fromkeys(technical_skills))

    soft_patterns = [
        r'\b(communication|leadership|teamwork|problem.?solving|critical.?thinking|'
        r'analytical|collaboration|stakeholder|mentoring|cross.?functional|agile|scrum|'
        r'time.?management|adaptability|creativity|detail.?oriented|self.?motivated)\b'
    ]
    soft_skills = []
    for pattern in soft_patterns:
        matches = re.findall(pattern, jd_lower)
        soft_skills.extend(matches)
    soft_skills = list(dict.fromkeys(soft_skills))

    qualifications = []
    for pattern in QUALIFICATION_PATTERNS:
        matches = re.findall(pattern, jd_lower)
        qualifications.extend(matches)

    role_level = "mid"
    if any(w in jd_lower for w in ["senior", "sr.", "lead", "principal", "staff"]):
        role_level = "senior"
    elif any(w in jd_lower for w in ["junior", "jr.", "entry", "associate", "intern"]):
        role_level = "entry"
    elif any(w in jd_lower for w in ["director", "vp", "head", "manager"]):
        role_level = "lead"

    keywords = list(dict.fromkeys(technical_skills + soft_skills))[:20]

    sentences = re.split(r'[.!]\s+', job_description)
    responsibilities = [s.strip() for s in sentences if len(s.strip()) > 20][:5]

    return {
        "technical_skills": technical_skills,
        "soft_skills": soft_skills,
        "qualifications": qualifications,
        "key_responsibilities": responsibilities,
        "resume_keywords": keywords,
        "role_level": role_level,
        "industry": "technology",
    }


def extract_keywords(job_description: str) -> dict:
    try:
        prompt = EXTRACT_PROMPT.format(job_description=job_description[:3000])
        result = _call_llm(prompt)
        if result and "technical_skills" in result and not result.get("error"):
            return {"success": True, **result}

        return {"success": True, **_template_extract(job_description)}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "technical_skills": [],
            "soft_skills": [],
            "qualifications": [],
            "key_responsibilities": [],
            "resume_keywords": [],
            "role_level": "mid",
            "industry": "unknown",
        }
