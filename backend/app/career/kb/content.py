"""Curated career knowledge, one JSON file per domain in ``data/``.

Each file is hand-written reference material (skills, certifications, a learning
roadmap, interview Q&A, concept notes, resume bullets). It is the single source
for the knowledge base: the RAG index is built from ``chunks()``, and the skill
terms extend the keyword extractor so domain-specific skills (BGP, Apex, ...)
count in matching and resume gaps.
"""
import json
import re
from functools import lru_cache
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

LEVELS = {"junior", "mid", "senior"}
CERT_LEVELS = {"entry", "associate", "professional", "expert", "specialty"}
SKILL_TIERS = ("core", "advanced", "tools")
_TERM_RE = re.compile(r"^[a-z0-9][a-z0-9 +#./&\-]*$")


class ContentError(ValueError):
    pass


def _need(cond: bool, where: str, msg: str):
    if not cond:
        raise ContentError(f"{where}: {msg}")


def _strings(value, where: str, min_len: int, lower_terms: bool = False):
    _need(isinstance(value, list) and len(value) >= min_len, where, f"needs a list of at least {min_len} items")
    for item in value:
        _need(isinstance(item, str) and item.strip() == item and item, where, f"bad entry {item!r}")
        if lower_terms:
            _need(bool(_TERM_RE.match(item)) and len(item) >= 2, where,
                  f"term {item!r} must be lowercase letters/digits/space/+#./&- and 2+ chars")


def validate(domain: dict) -> dict:
    """Raise ContentError on the first schema problem; return the domain unchanged."""
    did = domain.get("id", "?")
    _need(isinstance(domain.get("id"), str) and re.fullmatch(r"[a-z][a-z0-9_]+", domain["id"]), did, "bad id")
    for key in ("name", "summary"):
        _need(isinstance(domain.get(key), str) and len(domain[key]) > 3, did, f"missing {key}")
    _strings(domain.get("titles"), f"{did}.titles", 3, lower_terms=True)
    skills = domain.get("skills")
    _need(isinstance(skills, dict), did, "skills must be an object")
    for tier in SKILL_TIERS:
        _strings(skills.get(tier), f"{did}.skills.{tier}", 6, lower_terms=True)
    _strings(domain.get("ats_keywords"), f"{did}.ats_keywords", 12, lower_terms=True)
    certs = domain.get("certifications")
    _need(isinstance(certs, list) and len(certs) >= 2, did, "needs 2+ certifications")
    for c in certs:
        _need(all(isinstance(c.get(k), str) and c[k] for k in ("name", "provider", "level", "why")),
              f"{did}.certifications", f"incomplete {c!r}")
        _need(c["level"] in CERT_LEVELS, f"{did}.certifications", f"level must be one of {sorted(CERT_LEVELS)}")
    roadmap = domain.get("roadmap")
    _need(isinstance(roadmap, list) and len(roadmap) >= 3, did, "needs 3+ roadmap stages")
    for stage in roadmap:
        where = f"{did}.roadmap[{stage.get('stage', '?')}]"
        _need(isinstance(stage.get("stage"), str) and isinstance(stage.get("duration_weeks"), int), where,
              "needs stage and integer duration_weeks")
        _strings(stage.get("goals"), f"{where}.goals", 2)
        _strings(stage.get("skills"), f"{where}.skills", 2, lower_terms=True)
        _need(isinstance(stage.get("project"), str) and stage["project"], where, "needs a project")
    _strings(domain.get("resume_bullets"), f"{did}.resume_bullets", 5)
    interview = domain.get("interview")
    _need(isinstance(interview, list) and len(interview) >= 10, did, "needs 10+ interview questions")
    for i, q in enumerate(interview):
        where = f"{did}.interview[{i}]"
        _need(all(isinstance(q.get(k), str) and q[k] for k in ("topic", "level", "question", "answer")), where,
              "needs topic, level, question, answer")
        _need(q["level"] in LEVELS, where, f"level must be one of {sorted(LEVELS)}")
        _need(isinstance(q.get("follow_ups", []), list), where, "follow_ups must be a list")
    concepts = domain.get("concepts")
    _need(isinstance(concepts, list) and len(concepts) >= 6, did, "needs 6+ concepts")
    for c in concepts:
        _need(isinstance(c.get("title"), str) and isinstance(c.get("body"), str) and len(c["body"].split()) >= 60,
              f"{did}.concepts", f"concept {c.get('title')!r} needs a title and a 60+ word body")
    projects = domain.get("projects")
    _need(isinstance(projects, list) and len(projects) >= 2, did, "needs 2+ projects")
    for p in projects:
        _need(isinstance(p.get("name"), str) and isinstance(p.get("description"), str), f"{did}.projects",
              f"incomplete project {p!r}")
        _strings(p.get("skills"), f"{did}.projects.skills", 2, lower_terms=True)
    return domain


def load_file(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        domain = json.load(fh)
    validate(domain)
    _need(path.stem == domain["id"], domain["id"], f"file name {path.name} must match id")
    return domain


@lru_cache(maxsize=1)
def domains() -> dict[str, dict]:
    """All domains keyed by id, in a stable order."""
    out = {}
    for path in sorted(DATA_DIR.glob("*.json")):
        domain = load_file(path)
        out[domain["id"]] = domain
    return out


def skill_terms(domain: dict) -> list[str]:
    terms = [t for tier in SKILL_TIERS for t in domain["skills"][tier]]
    return list(dict.fromkeys(terms + domain["ats_keywords"]))


@lru_cache(maxsize=1)
def all_skill_terms() -> tuple[str, ...]:
    seen: dict[str, None] = {}
    for domain in domains().values():
        for term in skill_terms(domain):
            seen.setdefault(term, None)
    return tuple(seen)


def chunks() -> list[dict]:
    """Retrieval units: each is small enough to quote and carries its domain and kind."""
    out = []
    for d in domains().values():
        did, name = d["id"], d["name"]

        def add(kind: str, key: str, title: str, text: str):
            out.append({"id": f"{did}:{kind}:{key}", "domain": did, "domain_name": name, "kind": kind,
                        "title": title, "text": text.strip()})

        add("overview", "summary", f"{name}: overview",
            f"{d['summary']}\nCommon job titles: {', '.join(d['titles'])}.\n"
            f"Core skills: {', '.join(d['skills']['core'])}.\nAdvanced: {', '.join(d['skills']['advanced'])}.\n"
            f"Tools: {', '.join(d['skills']['tools'])}.")
        add("certifications", "all", f"{name}: certifications",
            "\n".join(f"- {c['name']} ({c['provider']}, {c['level']}): {c['why']}" for c in d["certifications"]))
        for i, stage in enumerate(d["roadmap"]):
            add("roadmap", str(i), f"{name} roadmap: {stage['stage']}",
                f"Stage {i + 1} of {len(d['roadmap'])}, about {stage['duration_weeks']} weeks.\n"
                f"Goals: {'; '.join(stage['goals'])}.\nSkills: {', '.join(stage['skills'])}.\n"
                f"Portfolio project: {stage['project']}")
        add("resume", "bullets", f"{name}: strong resume bullets",
            "Example bullets (adapt numbers to your real results):\n" + "\n".join(f"- {b}" for b in d["resume_bullets"])
            + f"\nATS keywords recruiters search for: {', '.join(d['ats_keywords'])}.")
        for i, q in enumerate(d["interview"]):
            follow = f"\nFollow-ups: {' | '.join(q['follow_ups'])}" if q.get("follow_ups") else ""
            add("interview", str(i), f"{name} interview ({q['level']}, {q['topic']}): {q['question']}",
                f"Q: {q['question']}\nA: {q['answer']}{follow}")
        for i, c in enumerate(d["concepts"]):
            add("concept", str(i), f"{name}: {c['title']}", c["body"])
        add("projects", "all", f"{name}: portfolio projects",
            "\n".join(f"- {p['name']}: {p['description']} (skills: {', '.join(p['skills'])})" for p in d["projects"]))
    return out
