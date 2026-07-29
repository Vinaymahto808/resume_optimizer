import json
import re
from typing import Optional
from app.config import settings


FORM_MAP_PROMPT = """You are an intelligent form-filling agent. Map the following HTML form fields to a user's master profile data.

### USER PROFILE:
{user_profile_json}

### HTML FORM SNAPSHOT:
{form_dom_snapshot_json}

### INSTRUCTIONS:
1. Identify all interactive input fields (input, select, textarea) in the HTML snapshot.
2. For each field, determine its semantic meaning by analyzing name, id, placeholder, aria-label, and label text.
3. Map each field to the corresponding value from the USER_PROFILE_JSON.
4. For select dropdowns, match the profile value to the closest option.

Return a JSON object where:
- Key = CSS selector for the field
- Value = Data to inject

```json
{{
  "input[name='firstName']": "John",
  "input[name='email']": "john@example.com"
}}
```

### CONSTRAINTS:
- If a field cannot be confidently mapped, omit it.
- Do NOT fabricate data.
- Do NOT fill optional fields with no relevance.

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
            temperature=0.5,
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


FIELD_MAPPING_RULES = {
    "name": ["first_name", "full_name", "name"],
    "email": ["email"],
    "phone": ["phone", "mobile", "telephone"],
    "first_name": ["first_name", "firstname"],
    "last_name": ["last_name", "lastname"],
    "company": ["company", "organization"],
    "title": ["title", "job_title", "position"],
    "linkedin": ["linkedin", "linkedin_url"],
    "github": ["github", "github_url"],
    "website": ["website", "portfolio", "url"],
    "location": ["location", "city", "address"],
    "summary": ["summary", "objective", "about"],
}


def _template_map(user_profile: dict, form_html: str) -> dict:
    mapped_fields = {}
    form_lower = form_html.lower()

    for selector_patterns, profile_keys in FIELD_MAPPING_RULES.items():
        for profile_key in profile_keys:
            if profile_key in user_profile and user_profile[profile_key]:
                for pattern in selector_patterns.split(","):
                    if pattern.strip() in form_lower:
                        mapped_fields[f"input[name='{pattern.strip()}']"] = str(user_profile[profile_key])

    return mapped_fields


def map_form_fields(user_profile: dict, form_html: str) -> dict:
    try:
        prompt = FORM_MAP_PROMPT.format(
            user_profile_json=json.dumps(user_profile, indent=2),
            form_dom_snapshot_json=form_html[:5000],
        )
        result = _call_llm(prompt)
        if result and not result.get("error"):
            return {"success": True, "mapped_fields": result}

        return {"success": True, "mapped_fields": _template_map(user_profile, form_html)}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "mapped_fields": {},
        }
