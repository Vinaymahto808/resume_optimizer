"""Word-boundary skill extraction over the shared taxonomy.

``app.skill_taxonomy.extract_skills`` uses plain substring checks, so short
skills like "r", "gin" or "chai" match inside "engineer", "engine" or "chain".
This module matches whole tokens only."""
import re
from functools import lru_cache

from app.skill_taxonomy import SKILL_TAXONOMY

# Single-letter / highly ambiguous names need extra context to count.
_AMBIGUOUS = {"r": r"(?<![a-z0-9])r(?=\s*(?:programming|language|studio|,|/|\)|$))", "go": r"\bgo(?:lang)?\b(?=\s*(?:,|/|\)|lang|$))",
              "c": r"(?<![a-z0-9+#])c(?=\s*(?:,|/|\+\+|$))", "dash": r"\bplotly dash\b", "solid": r"\bsolid principles\b",
              "echo": r"\becho framework\b", "rocket": r"\brocket\.rs\b", "gin": r"\bgin (?:framework|gonic)\b|\bgo gin\b",
              "chai": r"\bchai(?:\.js)?\b(?=.{0,40}\b(?:mocha|test|assert))", "spark": r"\b(?:apache )?spark\b",
              "beam": r"\bapache beam\b", "less": r"\bless(?:css| css)\b", "sprint": r"\bsprints?\b(?=.{0,30}\b(?:planning|agile|scrum))",
              "lua": r"\blua\b", "dart": r"\bdart\b(?=.{0,20}\b(?:flutter|language))", "neon": r"\bneon (?:db|postgres)\b",
              "analytical": r"\banalytical skills\b", "presentation": r"\bpresentation skills\b"}


# Knowledge-base terms that are ordinary English in most postings ("regression testing", "monitoring
# dashboards"), so they would inflate keyword gaps. They still count inside the knowledge base itself.
_KB_TOO_GENERIC = {"algorithms", "classification", "regression", "monitoring", "streaming", "latency",
                   "reliability", "statistics", "indexing", "workbench"}


def _vocabulary() -> list[str]:
    """Shared taxonomy plus the knowledge base's domain terms (BGP, Apex, LWC, ...)."""
    words = [skill.lower() for skills in SKILL_TAXONOMY.values() for skill in skills]
    try:
        from app.career.kb.content import all_skill_terms
        words += [t for t in all_skill_terms() if t not in _KB_TOO_GENERIC]
    except Exception:  # a broken content file must not break extraction everywhere
        import logging
        logging.getLogger(__name__).exception("Knowledge-base skill terms unavailable")
    return list(dict.fromkeys(words))


@lru_cache(maxsize=1)
def _patterns() -> list[tuple[str, re.Pattern]]:
    out = []
    for key in _vocabulary():
        if key in _AMBIGUOUS:
            pattern = _AMBIGUOUS[key]
        else:
            pattern = r"(?<![a-z0-9])" + re.escape(key) + r"(?![a-z0-9])"
        out.append((key, re.compile(pattern, re.I | re.M)))
    return out


def extract_skills(text: str) -> list[str]:
    if not text:
        return []
    low = text.lower()
    found = {skill for skill, pattern in _patterns() if pattern.search(low)}
    # Prefer the more specific phrase when both forms match.
    for general, specific in (("transformer", "transformers"), ("postgres", "postgresql"), ("stakeholder", "stakeholder management")):
        if general in found and specific in found:
            found.discard(general)
    return sorted(found)


def display_case(skill: str, source_text: str) -> str:
    """Return the skill as written in ``source_text`` (e.g. 'PyTorch' not 'pytorch')."""
    m = re.search(r"(?<![A-Za-z0-9])" + re.escape(skill) + r"(?![A-Za-z0-9])", source_text or "", re.I)
    if m:
        return m.group(0)
    return skill.upper() if len(skill) <= 3 else skill
