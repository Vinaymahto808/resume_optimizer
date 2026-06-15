from typing import Optional

PROFILE_ANALYSIS_PROMPT = """You are a senior data science recruiter and LinkedIn profile expert with 15+ years of experience hiring for top tech companies.

Analyze this LinkedIn profile and return a JSON with:
1. "overall_rating": 1-10 rating (be strict — 7+ means genuinely impressive)
2. "strengths": list of 4-6 specific, detailed strengths this profile demonstrates (mention specific technologies, methods, or achievements)
3. "gaps": list of 4-6 missing skills or improvements with estimated impact level (e.g., "High: missing cloud deployment experience limits senior roles")
4. "impactful_rewrite": a rewritten About section (3-4 sentences) optimized for recruiter search and ATS parsing. Include key skills naturally, quantified impact, and career narrative
5. "headline_suggestion": a short headline (under 220 chars) that combines role, key skills, and value proposition
6. "custom_suggestions": 4-6 specific, actionable suggestions to improve this profile, prioritized by impact
7. "career_level": estimated career level (entry/mid/senior/lead)
8. "recommended_roles": 3-5 job titles this profile is best suited for, with brief reason for each
9. "target_industries": 2-3 industries where this profile would be most competitive
10. "skill_gaps_priority": list of skill gaps ranked by urgency for career growth

Focus on: keyword density for ATS, quantified achievements, role clarity, industry relevance, and career trajectory.

Profile:
{profile_text}

Return ONLY valid JSON. No markdown, no code fences."""

JOB_MATCH_PROMPT = """You are an AI career coach specializing in data science and ML roles. Compare this candidate's LinkedIn profile with the job description below.

Return JSON with:
1. "fit_score": 1-10 (be critical — 8+ means strong match)
2. "reasons": 4-6 specific reasons why this profile fits, referencing actual skills and experiences
3. "gaps": 3-5 specific gaps or missing requirements with suggestions to address them
4. "tailoring_advice": 3-4 sentences of specific advice on how to tailor the profile and resume for this specific job
5. "resume_keywords": list of 8-12 keywords from the job description that should be added to the resume
6. "interview_prep": 3-5 topics or concepts to study before interviewing for this role

Profile:
{profile_text}

Job Title: {job_title}
Job Description:
{job_description}

Return ONLY valid JSON."""

AI_SUGGEST_JOBS_PROMPT = """You are an AI career advisor with deep knowledge of the data science and ML job market in India. Based on this candidate's profile, suggest the best job matches.

Return JSON with:
1. "suggested_roles": array of 4-6 objects, each with:
   - "title": job title
   - "match_reason": 1-sentence explanation of why this role fits
   - "seniority": estimated level (entry/mid/senior/lead)
   - "confidence": 1-10 score
2. "target_companies": array of 4-6 company names where this profile would be competitive, with brief reason
3. "recommended_industries": array of 2-4 industries ranked by fit
4. "salary_band": estimated salary range for this profile in India (entry/intermediate/senior brackets)
5. "skill_gaps_to_fill": array of 3-5 skills to acquire for better roles, with learning resources
6. "growth_path": 2-3 sentence career progression advice

Profile:
{profile_text}

Return ONLY valid JSON."""


def analyze_with_gemini(profile_text: str, api_key: str) -> Optional[dict]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = PROFILE_ANALYSIS_PROMPT.format(profile_text=profile_text)
        response = model.generate_content(prompt)
        import json
        import re
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


def match_job_with_gemini(profile_text: str, job_title: str, job_description: str,
                          api_key: str) -> Optional[dict]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = JOB_MATCH_PROMPT.format(
            profile_text=profile_text,
            job_title=job_title,
            job_description=job_description,
        )
        response = model.generate_content(prompt)
        import json
        import re
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


def suggest_jobs_with_gemini(profile_text: str, api_key: str) -> Optional[dict]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = AI_SUGGEST_JOBS_PROMPT.format(profile_text=profile_text)
        response = model.generate_content(prompt)
        import json
        import re
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}
