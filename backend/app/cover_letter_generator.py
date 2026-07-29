import json
import re
from typing import Optional
from app.config import settings


COVER_LETTER_PROMPT = """You are a professional career coach. Write a compelling, personalized cover letter for the following job application.

### USER PROFILE:
- Name: {user_name}
- Current Role: {current_role}
- Years of Experience: {experience}
- Key Skills: {skills}

### JOB DETAILS:
- Company Name: {company_name}
- Job Title: {job_title}
- Job Description:
{job_description}

### INSTRUCTIONS:
- Write a concise, 3-paragraph cover letter.
- Paragraph 1: Introduction - State the position being applied for and why the company interests you.
- Paragraph 2: Value Proposition - Connect user's skills and experience to the company's needs. Provide 2-3 concrete examples.
- Paragraph 3: Closing - Express enthusiasm and mention the attached resume.
- Keep the tone professional, confident, and personalized.

### CONSTRAINTS:
- Do NOT use generic phrases like "I am writing to apply for..."
- Do NOT mention salary expectations.
- Keep the total length under 300 words.

Return a JSON object with:
1. "cover_letter": the full cover letter text
2. "key_points": array of 2-3 key selling points used
3. "personalization_notes": array of personalization details included

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
            max_tokens=1500,
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


def _template_cover_letter(user_name: str, current_role: str, skills: str,
                           company_name: str, job_title: str) -> dict:
    return {
        "cover_letter": (
            f"Dear Hiring Manager,\n\n"
            f"I am excited to apply for the {job_title} position at {company_name}. "
            f"As a {current_role} with expertise in {skills}, I am confident in my ability "
            f"to contribute meaningfully to your team and drive impactful results.\n\n"
            f"Throughout my career, I have developed strong proficiency in {skills}. "
            f"My experience has equipped me with the technical skills and problem-solving "
            f"abilities needed to excel in this role. I am passionate about delivering "
            f"high-quality solutions and continuously improving processes.\n\n"
            f"I would welcome the opportunity to discuss how my background, skills, and "
            f"enthusiasm align with the needs of your team. Thank you for considering my "
            f"application. I look forward to the possibility of contributing to "
            f"{company_name}'s continued success.\n\n"
            f"Sincerely,\n{user_name}"
        ),
        "key_points": [
            f"Relevant experience as {current_role}",
            f"Strong skills in {skills}",
            f"Enthusiasm for {company_name}",
        ],
        "personalization_notes": [
            f"Addressed to {company_name}",
            f"Referenced {job_title} role",
        ],
    }


def generate_cover_letter(
    user_name: str,
    current_role: str,
    experience: str,
    skills: str,
    company_name: str,
    job_title: str,
    job_description: str,
) -> dict:
    try:
        prompt = COVER_LETTER_PROMPT.format(
            user_name=user_name or "Applicant",
            current_role=current_role or "Professional",
            experience=experience or "3+ years",
            skills=skills or "relevant technical skills",
            company_name=company_name or "your company",
            job_title=job_title or "the open position",
            job_description=job_description[:2000],
        )
        result = _call_llm(prompt)
        if result and "cover_letter" in result and not result.get("error"):
            return {"success": True, **result}

        return {"success": True, **_template_cover_letter(
            user_name, current_role, skills, company_name, job_title,
        )}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "cover_letter": "",
            "key_points": [],
            "personalization_notes": [],
        }
