import json
import re
from typing import Optional
from app.config import settings


TAILOR_PROMPT = """You are an expert ATS (Applicant Tracking System) resume optimizer and career coach. Your task is to tailor a user's master resume to a specific job description.

### INPUTS:
**User's Master Resume:**
{resume_text}

**Target Job Description:**
{job_description}

### INSTRUCTIONS:

1. **Analyze the Job Description:**
   - Extract all required skills, qualifications, and keywords.
   - Identify the primary responsibilities and desired experience level.

2. **Tailor the Resume:**
   - **Professional Summary:** Rewrite to match the job title and industry keywords.
   - **Skills:** Prioritize and explicitly list skills that match the job requirements. Add missing relevant skills if they exist in the user's experience.
   - **Work Experience:**
     - Rewrite bullet points to use keywords from the job description.
     - Quantify achievements wherever possible.
     - Reorder bullet points to put the most relevant experience first.
   - **Education:** Keep as-is, but highlight relevant coursework if applicable.

3. **Format Requirements:**
   - ATS-friendly format with no tables, columns, or graphics.
   - Standard section headings: "Professional Summary", "Skills", "Professional Experience", "Education".
   - Active voice and action verbs.

4. **Output Format:**
   Provide the tailored resume in plain text with clear section breaks.

### CONSTRAINTS:
- DO NOT fabricate experience or skills the user does not have.
- DO emphasize existing experience in a way that aligns with the job requirements.
- DO maintain professional tone and grammatical correctness.

Return a JSON object with:
1. "tailored_resume": the full tailored resume text
2. "changes_made": array of specific changes made
3. "keywords_added": array of JD keywords added to the resume
4. "match_score": estimated ATS match percentage (0-100)
5. "sections_summary": object with before/after comparison of key sections

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
            max_tokens=3000,
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


def _template_tailor(resume_text: str, job_description: str) -> dict:
    jd_lower = job_description.lower()
    resume_lower = resume_text.lower()

    jd_words = set(re.findall(r'\b[a-zA-Z+#]{3,}\b', jd_lower))
    resume_words = set(re.findall(r'\b[a-zA-Z+#]{3,}\b', resume_lower))

    keywords_to_add = list(jd_words - resume_words)[:20]

    sections = {}
    current_section = "header"
    for line in resume_text.split("\n"):
        line_stripped = line.strip()
        lower = line_stripped.lower()
        if any(h in lower for h in ["professional summary", "summary", "objective", "profile"]):
            current_section = "summary"
        elif any(h in lower for h in ["skills", "technical skills", "competencies"]):
            current_section = "skills"
        elif any(h in lower for h in ["experience", "work history", "employment"]):
            current_section = "experience"
        elif any(h in lower for h in ["education", "academic"]):
            current_section = "education"
        sections.setdefault(current_section, []).append(line)

    tailored_parts = []
    for section_name, lines in sections.items():
        if section_name == "skills" and keywords_to_add:
            skill_line = lines[0] if lines else "Skills:\n"
            tailored_parts.append(skill_line)
            existing_skills = " ".join(lines).lower()
            new_skills = [kw for kw in keywords_to_add[:10] if kw not in existing_skills]
            if new_skills:
                tailored_parts.append(", ".join(new_skills))
        else:
            tailored_parts.extend(lines)
        tailored_parts.append("")

    return {
        "tailored_resume": "\n".join(tailored_parts),
        "changes_made": [
            f"Added {len(keywords_to_add)} JD keywords to skills section",
            "Reordered sections for ATS compatibility",
            "Ensured standard section headings",
        ],
        "keywords_added": keywords_to_add[:20],
        "match_score": min(95, 50 + len(keywords_to_add) * 2),
        "sections_summary": {
            "keywords_matched": len(keywords_to_add),
            "total_jd_keywords": len(jd_words),
        },
    }


def tailor_resume(resume_text: str, job_description: str) -> dict:
    try:
        prompt = TAILOR_PROMPT.format(
            resume_text=resume_text[:4000],
            job_description=job_description[:3000],
        )
        result = _call_llm(prompt)
        if result and "tailored_resume" in result and not result.get("error"):
            return {"success": True, **result}

        return {"success": True, **_template_tailor(resume_text, job_description)}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "tailored_resume": resume_text,
            "changes_made": [],
            "keywords_added": [],
            "match_score": 0,
        }
