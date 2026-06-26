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


CAREER_ROADMAP_PROMPT = """You are an expert Career Counselor and Technical Curriculum Architect. Generate a personalized, highly structured, and actionable career roadmap based on the user's target role.

Target Role: {target_role}

Provide a JSON object with exactly these 4 keys:

1. "skills": An array of skill groups, each with:
   - "level": "Beginner", "Intermediate", or "Advanced"
   - "skills_and_hours": an array of objects with "name" (skill name) and "hours" (estimated learning hours)
   - "description": a brief description of what this level covers

2. "projects": An array of exactly 3 projects (1 Beginner, 1 Intermediate, 1 Capstone), each with:
   - "tier": "Beginner", "Intermediate", or "Capstone"
   - "title": project title
   - "problem_statement": what the project solves
   - "tech_stack": array of technologies used
   - "key_deliverables": array of deliverables

3. "certifications": An array of exactly 3 certifications, each with:
   - "name": certification name
   - "provider": platform/organization
   - "relevance": why it matters for this role

4. "interview_prep": An object with:
   - "week_plan": array of 4 weeks, each with "week" (number), "focus" (string), "topics" (array of strings)
   - "mock_interview_focus": array of focus areas
   - "behavioral_themes": array of common behavioral question themes

Return ONLY valid JSON. No markdown, no code fences."""

PORTFOLIO_GENERATOR_PROMPT = """You are a Full-Stack Developer and UI/UX Expert. Parse this resume text and generate a complete, production-ready single-page portfolio website HTML using Tailwind CSS (via CDN).

Resume Data:
{resume_text}

Design Requirements:
- Modern, clean, professional design with dark mode aesthetics (slate/zinc backgrounds with emerald or indigo accents)
- Sections: Hero (with animated typing placeholder), About Me, Experience Timeline, Skills (badges), Projects, Contact Form
- Fully responsive (mobile-first using Tailwind responsive classes)
- Accessible semantic HTML
- Use Tailwind Play CDN: <script src="https://cdn.tailwindcss.com"></script>

Output STRICT rules:
- Return a JSON object with a single key "html" containing the complete HTML string
- The HTML must be a complete, standalone page (doctype, html, head, body)
- Escape all double quotes and backticks inside the HTML string properly
- All placeholder text from the resume must be naturally integrated
- Use proper semantic HTML tags (<header>, <nav>, <section>, <article>, <footer>)

Return ONLY valid JSON in the format: {{"html": "<!DOCTYPE html>..."}}. No markdown, no code fences."""

ANALYTICS_SUGGESTIONS_PROMPT = """You are a Senior Frontend UI/UX Developer specializing in career platforms. Analyze this profile data and generate structured analytics for a user dashboard.

Profile Data:
{profile_text}

Return a JSON object with exactly these keys:

1. "profile_strength": An object with:
   - "score": number 0-100 (overall profile completeness/quality score)
   - "sections": array of objects with "name", "completed" (boolean), "weight" (points contributed)

2. "top_improvements": An array of exactly 5 objects, each with:
   - "id": unique string
   - "title": short action title (e.g., "Add Projects Section")
   - "description": one-line explanation
   - "impact_weight": number 1-100 (score reward)
   - "action_label": button text (e.g., "Add Projects")

3. "skill_categories": An array of objects with:
   - "name": category name (e.g., "Technical", "Soft Skills", "Experience", "Certifications")
   - "current_score": number 0-100
   - "benchmark_score": number 0-100 (industry benchmark)

Return ONLY valid JSON. No markdown, no code fences."""


def generate_career_roadmap(target_role: str, api_key: str) -> Optional[dict]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = CAREER_ROADMAP_PROMPT.format(target_role=target_role)
        response = model.generate_content(prompt)
        import json, re
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


def generate_portfolio_html(resume_text: str, api_key: str) -> Optional[dict]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = PORTFOLIO_GENERATOR_PROMPT.format(resume_text=resume_text)
        response = model.generate_content(prompt)
        import json, re
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


def generate_analytics_suggestions(profile_text: str, api_key: str) -> Optional[dict]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = ANALYTICS_SUGGESTIONS_PROMPT.format(profile_text=profile_text)
        response = model.generate_content(prompt)
        import json, re
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


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


# ═══════════════════════════════════════════
#  JD Analysis & Resume Optimization Prompts
# ═══════════════════════════════════════════

JD_ANALYSIS_PROMPT = """You are a senior technical recruiter with 15+ years of experience analyzing job descriptions. Analyze this JD and return a JSON object with:

1. "required_skills": array of 8-15 specific technical and soft skills that are REQUIRED (must-have)
2. "preferred_skills": array of 5-10 skills that are preferred/nice-to-have
3. "keywords": array of 15-25 important keywords and phrases from the JD
4. "culture_fit": array of 3-5 cultural attributes the company is looking for
5. "role_level": estimated level: "entry", "mid", "senior", "lead", or "executive"
6. "industry": the primary industry (tech, finance, healthcare, creative, consulting, academic, government, research, or other)
7. "must_have_qualifications": array of 3-6 absolute requirements (degrees, years of experience, certifications)
8. "nice_to_have": array of 3-5 qualifications that are preferred but not required
9. "years_experience_required": estimated years of experience needed (or "Not specified")
10. "education_required": education level required (or "Not specified")
11. "certifications_preferred": array of certifications mentioned or implied

Job Title: {job_title}
Company: {company_name}
Job Description:
{job_description}

Return ONLY valid JSON. No markdown, no code fences."""

RESUME_OPTIMIZE_PROMPT = """You are an expert ATS resume optimizer and career coach. Given a resume JSON and a job description, optimize the resume to maximize ATS score and match rate.

Return a JSON object with:
1. "optimized_resume": the FULL optimized resume data structure (same keys as input, with improvements):
   - Rewrite summary to include relevant keywords from JD
   - Reorder skills to put JD-matching ones first
   - Add JD keywords to skills list if missing
   - Rewrite bullet points to use JD terminology and quantify achievements
   - Preserve ALL original sections and data, only enhance
2. "ats_score_estimate": estimated ATS match percentage (0-100)
3. "suggestions": array of 5-8 specific improvement suggestions
4. "keywords_added": array of keywords that were added to the resume from the JD
5. "weak_phrases_removed": array of phrases that were replaced or removed

Resume JSON:
{resume_json}

Job Description:
{job_description}

Return ONLY valid JSON. No markdown, no code fences."""

BULLET_OPTIMIZE_PROMPT = """You are a resume writing expert. Transform this weak bullet point into a powerful, achievement-oriented statement optimized for ATS parsing.

Original bullet: "{bullet_text}"
Job context: {job_description}

Return JSON:
1. "optimized": the rewritten bullet point (strong action verb, quantified result, relevant keywords)
2. "explanation": brief explanation of what was improved and why

Return ONLY valid JSON. No markdown, no code fences."""

SUMMARY_GENERATE_PROMPT = """You are a professional resume writer. Generate a compelling professional summary based on the candidate's resume data and target role.

Resume Data:
{resume_json}

Target Role: {target_role}

Write a 3-4 sentence professional summary that:
- Opens with a strong hook (years of experience, key expertise)
- Includes 4-6 key skills relevant to the target role
- Highlights 1-2 major achievements or differentiators
- Ends with what the candidate is seeking
- Is optimized for ATS with relevant keywords

Return JSON:
1. "summary": the 3-4 sentence summary (150-250 words)
2. "keywords_used": array of keywords incorporated

Return ONLY valid JSON. No markdown, no code fences."""


def _call_gemini(prompt: str, api_key: str) -> Optional[dict]:
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        import json, re
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}


def analyze_jd_with_gemini(job_description: str, company_name: str, job_title: str, api_key: str) -> Optional[dict]:
    prompt = JD_ANALYSIS_PROMPT.format(
        job_description=job_description,
        company_name=company_name or "Unknown",
        job_title=job_title or "Unknown",
    )
    return _call_gemini(prompt, api_key)


def optimize_resume_with_gemini(resume_json: dict, job_description: str, api_key: str) -> Optional[dict]:
    import json as _json
    prompt = RESUME_OPTIMIZE_PROMPT.format(
        resume_json=_json.dumps(resume_json, indent=2, default=str),
        job_description=job_description or "No specific job description provided.",
    )
    return _call_gemini(prompt, api_key)


def optimize_bullet_with_gemini(bullet_text: str, job_description: str, api_key: str) -> Optional[dict]:
    prompt = BULLET_OPTIMIZE_PROMPT.format(
        bullet_text=bullet_text,
        job_description=job_description or "General professional context",
    )
    return _call_gemini(prompt, api_key)


def generate_summary_with_gemini(resume_json: dict, target_role: str, api_key: str) -> Optional[dict]:
    import json as _json
    prompt = SUMMARY_GENERATE_PROMPT.format(
        resume_json=_json.dumps(resume_json, indent=2, default=str),
        target_role=target_role or "Professional",
    )
    return _call_gemini(prompt, api_key)
