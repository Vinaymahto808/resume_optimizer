"""
Structured Prompt Registry — versioned, testable prompt management.

Replaces scattered prompt constants across groq_helper.py, resume_tailor.py,
cover_letter_generator.py, form_mapper.py, rewrite_service.py.

Features:
- Versioned prompts with A/B testing support
- Template variable validation
- Fallback chains (LLM → template → stub)
- Output schema validation
- Dynamic prompt composition
"""

import json
import re
import hashlib
import logging
from enum import Enum
from typing import Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


class PromptCategory(str, Enum):
    RESUME_TAILOR = "resume_tailor"
    COVER_LETTER = "cover_letter"
    KEYWORD_EXTRACTION = "keyword_extraction"
    FORM_MAPPING = "form_mapping"
    PROFILE_ANALYSIS = "profile_analysis"
    JOB_MATCH = "job_match"
    JD_ANALYSIS = "jd_analysis"
    BULLET_OPTIMIZE = "bullet_optimize"
    SUMMARY_GENERATE = "summary_generate"
    RESUME_OPTIMIZE = "resume_optimize"
    CAREER_ROADMAP = "career_roadmap"
    PORTFOLIO_GENERATE = "portfolio_generate"
    ANALYTICS_SUGGESTIONS = "analytics_suggestions"
    OCR = "ocr"


@dataclass
class PromptTemplate:
    id: str
    category: PromptCategory
    version: str
    template: str
    variables: list[str]
    system_prompt: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 2000
    expect_json: bool = True
    fallback_template: Optional[str] = None
    description: str = ""
    is_active: bool = True
    weight: float = 1.0
    created_at: str = ""
    metadata: dict = field(default_factory=dict)

    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.utcnow().isoformat()
        if not self.id:
            self.id = f"{self.category.value}_v{self.version}"

    def render(self, **kwargs) -> str:
        missing = [v for v in self.variables if v not in kwargs]
        if missing:
            raise ValueError(f"Missing template variables: {missing}")
        return self.template.format(**kwargs)

    def hash(self) -> str:
        return hashlib.md5(f"{self.id}:{self.version}:{self.template}".encode()).hexdigest()[:12]


class PromptRegistry:
    def __init__(self):
        self._prompts: dict[str, dict[str, PromptTemplate]] = {}
        self._active_versions: dict[str, str] = {}
        self._ab_weights: dict[str, dict[str, float]] = {}
        self._usage_log: list[dict] = []
        self._register_defaults()

    def register(self, prompt: PromptTemplate):
        cat = prompt.category.value
        if cat not in self._prompts:
            self._prompts[cat] = {}
        self._prompts[cat][prompt.version] = prompt
        if cat not in self._active_versions or prompt.is_active:
            self._active_versions[cat] = prompt.version
        logger.debug("Registered prompt %s v%s", cat, prompt.version)

    def get(self, category: PromptCategory, version: str = "") -> Optional[PromptTemplate]:
        cat = category.value
        if cat not in self._prompts:
            return None
        if version:
            return self._prompts[cat].get(version)
        active = self._active_versions.get(cat)
        if active:
            return self._prompts[cat].get(active)
        versions = self._prompts[cat]
        if versions:
            return max(versions.values(), key=lambda p: p.version)
        return None

    def render(self, category: PromptCategory, version: str = "", **kwargs) -> str:
        prompt = self.get(category, version)
        if not prompt:
            raise ValueError(f"No prompt registered for {category.value}")
        return prompt.render(**kwargs)

    def render_with_ab(self, category: PromptCategory, **kwargs) -> tuple[str, str]:
        cat = category.value
        if cat not in self._prompts or not self._prompts[cat]:
            raise ValueError(f"No prompts for {category.value}")
        versions = {v: p for v, p in self._prompts[cat].items() if p.is_active}
        if not versions:
            versions = self._prompts[cat]

        weights = self._ab_weights.get(cat, {})
        import random
        if weights:
            chosen = random.choices(
                list(versions.keys()),
                weights=[weights.get(v, 1.0) for v in versions.keys()],
                k=1,
            )[0]
        else:
            chosen = random.choice(list(versions.keys()))

        prompt = versions[chosen]
        return prompt.render(**kwargs), chosen

    def set_ab_weights(self, category: PromptCategory, weights: dict[str, float]):
        self._ab_weights[category.value] = weights

    def list_prompts(self) -> dict[str, list[dict]]:
        result = {}
        for cat, versions in self._prompts.items():
            result[cat] = [
                {
                    "version": v,
                    "id": p.id,
                    "hash": p.hash(),
                    "is_active": p.is_active,
                    "variables": p.variables,
                    "temperature": p.temperature,
                    "max_tokens": p.max_tokens,
                    "expect_json": p.expect_json,
                    "description": p.description,
                }
                for v, p in versions.items()
            ]
        return result

    def validate_output(self, category: PromptCategory, output: str) -> dict:
        prompt = self.get(category)
        if not prompt:
            return {"valid": False, "error": "No prompt found"}

        if prompt.expect_json:
            cleaned = re.sub(r'^```json\s*', '', output.strip())
            cleaned = re.sub(r'\s*```$', '', cleaned)
            cleaned = re.sub(r'^```\s*', '', cleaned)
            try:
                parsed = json.loads(cleaned.strip())
                return {"valid": True, "parsed": parsed}
            except json.JSONDecodeError as e:
                return {"valid": False, "error": f"JSON parse error: {e}", "raw": output}

        return {"valid": True, "parsed": output}

    def _register_defaults(self):
        self.register(PromptTemplate(
            id="resume_tailor_v1",
            category=PromptCategory.RESUME_TAILOR,
            version="1.0",
            template="""You are an expert ATS resume optimizer. Tailor this resume to the job description.

**Resume:**
{resume_text}

**Job Description:**
{job_description}

Return JSON:
1. "tailored_resume": full tailored text
2. "changes_made": array of changes
3. "keywords_added": array of keywords added
4. "match_score": 0-100 ATS match estimate

Return ONLY valid JSON.""",
            variables=["resume_text", "job_description"],
            temperature=0.7,
            max_tokens=3000,
            expect_json=True,
            description="Tailor resume to specific job description",
        ))

        self.register(PromptTemplate(
            id="cover_letter_v1",
            category=PromptCategory.COVER_LETTER,
            version="1.0",
            template="""Write a compelling cover letter for this job application.

**Applicant:** {user_name} | {current_role} | {experience} years | Skills: {skills}
**Company:** {company_name} | **Role:** {job_title}
**Job Description:**
{job_description}

Write 3 paragraphs: intro, value proposition with 2-3 examples, closing.
Under 300 words. No generic phrases.

Return JSON:
1. "cover_letter": the letter
2. "key_points": 2-3 selling points

Return ONLY valid JSON.""",
            variables=["user_name", "current_role", "experience", "skills",
                       "company_name", "job_title", "job_description"],
            temperature=0.7,
            max_tokens=1500,
            expect_json=True,
            description="Generate personalized cover letter",
        ))

        self.register(PromptTemplate(
            id="keyword_extraction_v1",
            category=PromptCategory.KEYWORD_EXTRACTION,
            version="1.0",
            template="""Extract all keywords, skills, and requirements from this job description.

**Job Description:**
{job_description}

Return JSON:
1. "resume_keywords": 10-15 keywords ATS would search for
2. "technical_skills": specific technical skills mentioned
3. "soft_skills": soft skills mentioned
4. "qualifications": degrees, certifications, years of experience
5. "role_level": entry/mid/senior/lead
6. "industry": industry sector

Return ONLY valid JSON.""",
            variables=["job_description"],
            temperature=0.3,
            max_tokens=1000,
            expect_json=True,
            description="Extract keywords from job description",
        ))

        self.register(PromptTemplate(
            id="form_mapping_v1",
            category=PromptCategory.FORM_MAPPING,
            version="1.0",
            template="""Map these HTML form fields to the user's profile data.

**User Profile:**
{user_profile_json}

**Form Fields:**
{form_dom_snapshot_json}

Map each field using CSS selectors as keys. Omit unmappable fields.

Return ONLY valid JSON.""",
            variables=["user_profile_json", "form_dom_snapshot_json"],
            temperature=0.5,
            max_tokens=2000,
            expect_json=True,
            description="Map HTML form fields to user profile",
        ))

        self.register(PromptTemplate(
            id="profile_analysis_v1",
            category=PromptCategory.PROFILE_ANALYSIS,
            version="1.0",
            template="""Analyze this LinkedIn profile as a senior recruiter.

Profile:
{profile_text}

Return JSON:
1. "overall_rating": 1-10
2. "strengths": 4-6 strengths
3. "gaps": 4-6 gaps with impact
4. "impactful_rewrite": rewritten About (3-4 sentences)
5. "headline_suggestion": headline under 220 chars
6. "custom_suggestions": 4-6 actionable items
7. "career_level": entry/mid/senior/lead
8. "recommended_roles": 3-5 titles

Return ONLY valid JSON.""",
            variables=["profile_text"],
            temperature=0.7,
            max_tokens=2000,
            expect_json=True,
            description="Analyze LinkedIn profile quality",
        ))

        self.register(PromptTemplate(
            id="jd_analysis_v1",
            category=PromptCategory.JD_ANALYSIS,
            version="1.0",
            template="""Analyze this job description as a senior recruiter.

Job Title: {job_title}
Company: {company_name}
Description:
{job_description}

Return JSON:
1. "required_skills": 8-15 must-have skills
2. "preferred_skills": 5-10 nice-to-haves
3. "keywords": 15-25 important keywords
4. "role_level": entry/mid/senior/lead/executive
5. "industry": primary industry
6. "years_experience_required": estimate
7. "education_required": level

Return ONLY valid JSON.""",
            variables=["job_title", "company_name", "job_description"],
            temperature=0.3,
            max_tokens=1500,
            expect_json=True,
            description="Deep analyze job description",
        ))

        self.register(PromptTemplate(
            id="bullet_optimize_v1",
            category=PromptCategory.BULLET_OPTIMIZE,
            version="1.0",
            template="""Transform this bullet point into an achievement-oriented statement.

Original: "{bullet_text}"
Context: {job_description}

Return JSON:
1. "optimized": rewritten bullet (action verb, quantified, keywords)
2. "explanation": what was improved

Return ONLY valid JSON.""",
            variables=["bullet_text", "job_description"],
            temperature=0.7,
            max_tokens=500,
            expect_json=True,
            description="Optimize single bullet point",
        ))

        self.register(PromptTemplate(
            id="summary_generate_v1",
            category=PromptCategory.SUMMARY_GENERATE,
            version="1.0",
            template="""Generate a professional summary for this candidate.

Resume Data:
{resume_json}

Target Role: {target_role}

Write 3-4 sentences: hook, 4-6 key skills, 1-2 achievements, what seeking.

Return JSON:
1. "summary": the text
2. "keywords_used": incorporated keywords

Return ONLY valid JSON.""",
            variables=["resume_json", "target_role"],
            temperature=0.7,
            max_tokens=500,
            expect_json=True,
            description="Generate professional summary",
        ))

        self.register(PromptTemplate(
            id="job_match_v1",
            category=PromptCategory.JOB_MATCH,
            version="1.0",
            template="""Compare this candidate profile to the job description.

Profile:
{profile_text}

Job: {job_title}
Description:
{job_description}

Return JSON:
1. "fit_score": 1-10
2. "reasons": 4-6 match reasons
3. "gaps": 3-5 gaps with suggestions
4. "tailoring_advice": 3-4 sentences
5. "resume_keywords": 8-12 keywords to add

Return ONLY valid JSON.""",
            variables=["profile_text", "job_title", "job_description"],
            temperature=0.7,
            max_tokens=1500,
            expect_json=True,
            description="Match profile to job description",
        ))

        self.register(PromptTemplate(
            id="resume_optimize_v1",
            category=PromptCategory.RESUME_OPTIMIZE,
            version="1.0",
            template="""Optimize this resume for the job description.

Resume JSON:
{resume_json}

Job Description:
{job_description}

Return JSON:
1. "optimized_resume": full optimized data
2. "ats_score_estimate": 0-100
3. "suggestions": 5-8 items
4. "keywords_added": keywords added
5. "weak_phrases_removed": phrases replaced

Return ONLY valid JSON.""",
            variables=["resume_json", "job_description"],
            temperature=0.7,
            max_tokens=3000,
            expect_json=True,
            description="Full resume optimization",
        ))

        self.register(PromptTemplate(
            id="career_roadmap_v1",
            category=PromptCategory.CAREER_ROADMAP,
            version="1.0",
            template="""Generate a personalized career roadmap for: {target_role}

Return JSON with 4 keys:
1. "skills": skill groups with levels, hours, descriptions
2. "projects": 3 projects (Beginner, Intermediate, Capstone)
3. "certifications": 3 certifications
4. "interview_prep": 4-week plan + focus areas

Return ONLY valid JSON.""",
            variables=["target_role"],
            temperature=0.7,
            max_tokens=3000,
            expect_json=True,
            description="Generate career roadmap",
        ))

        self.register(PromptTemplate(
            id="portfolio_generate_v1",
            category=PromptCategory.PORTFOLIO_GENERATE,
            version="1.0",
            template="""Generate a complete single-page portfolio HTML from this resume.

Resume Data:
{resume_text}

Use Tailwind CSS CDN. Dark mode. Sections: Hero, About, Experience, Skills, Projects, Contact.
Responsive. Semantic HTML.

Return JSON: {{"html": "<!DOCTYPE html>..."}}""",
            variables=["resume_text"],
            temperature=0.7,
            max_tokens=5000,
            expect_json=True,
            description="Generate portfolio HTML",
        ))

        self.register(PromptTemplate(
            id="analytics_suggestions_v1",
            category=PromptCategory.ANALYTICS_SUGGESTIONS,
            version="1.0",
            template="""Analyze this profile data for a dashboard.

Profile Data:
{profile_text}

Return JSON:
1. "profile_strength": score 0-100 + sections
2. "top_improvements": 5 items with impact weights
3. "skill_categories": categories with current vs benchmark scores

Return ONLY valid JSON.""",
            variables=["profile_text"],
            temperature=0.7,
            max_tokens=2000,
            expect_json=True,
            description="Generate analytics suggestions",
        ))


_registry: Optional[PromptRegistry] = None


def get_registry() -> PromptRegistry:
    global _registry
    if _registry is None:
        _registry = PromptRegistry()
    return _registry


def render_prompt(category: PromptCategory, **kwargs) -> str:
    return get_registry().render(category, **kwargs)


def render_prompt_ab(category: PromptCategory, **kwargs) -> tuple[str, str]:
    return get_registry().render_with_ab(category, **kwargs)


def list_all_prompts() -> dict:
    return get_registry().list_prompts()
