"""Generation tools shared by the API and the agents: resume tailoring, cover
letters, interview prep, referral messages and salary guidance.

Each tool uses the configured LLM and falls back to deterministic output so
the product keeps working without API keys. Fallbacks never invent experience:
they only re-surface skills that already appear in the resume.
"""
import re
from typing import Optional

from app.career.llm import llm_json
from app.career.skills import display_case, extract_skills
from app.skill_taxonomy import get_skill_category

_PAST = {
    "build": "built", "develop": "developed", "design": "designed", "deploy": "deployed", "implement": "implemented",
    "create": "created", "manage": "managed", "lead": "led", "run": "ran", "write": "wrote", "test": "tested",
    "analyze": "analyzed", "improve": "improved", "optimize": "optimized", "migrate": "migrated", "automate": "automated",
    "maintain": "maintained", "launch": "launched", "drive": "drove", "fine-tune": "fine-tuned", "train": "trained",
    "scale": "scaled", "monitor": "monitored", "integrate": "integrated", "support": "supported", "make": "made",
    "coordinate": "coordinated", "research": "researched", "set": "set", "ship": "shipped", "plan": "planned",
    "deliver": "delivered", "reduce": "reduced", "increase": "increased", "refactor": "refactored", "mentor": "mentored",
    "architect": "architected", "document": "documented", "review": "reviewed", "debug": "debugged", "handle": "handled",
    "prototype": "prototyped", "establish": "established", "own": "owned", "organize": "organized", "conduct": "conducted",
    "collaborate": "collaborated", "configure": "configured", "streamline": "streamlined", "model": "modeled",
}


def _gerund(base: str) -> str:
    if base in {"run", "plan", "ship", "set", "debug", "model"}:
        return base + base[-1] + "ing"
    if base.endswith("e") and not base.endswith("ee"):
        return base[:-1] + "ing"
    return base + "ing"


_FROM_GERUND = {_gerund(base): past for base, past in _PAST.items()}

# Weak opener -> (what follows: "gerund" | "verb" | "noun", replacement verb when a noun follows)
WEAK_OPENERS = [
    (r"^responsible for\s+", "gerund", "Owned"),
    (r"^worked on\s+", "gerund", "Built"),
    (r"^involved in\s+", "gerund", "Contributed to"),
    (r"^tasked with\s+", "gerund", "Delivered"),
    (r"^participated in\s+", "gerund", "Contributed to"),
    (r"^helped( to)?\s+", "verb", "Supported"),
    (r"^assisted( with| in)?\s+", "gerund", "Supported"),
    (r"^was part of\s+", "noun", "Collaborated on"),
]

SECTION_HEADINGS = re.compile(
    r"^(professional summary|summary|profile|objective|experience|work experience|professional experience|"
    r"employment|skills|technical skills|core competencies|education|projects|certifications)\s*:?\s*$", re.I)
BULLET_RE = re.compile(r"^\s*([•\-\*▪●◦‣·]|\d+[.)])\s+")


def extract_bullets(resume_text: str) -> list[str]:
    bullets = []
    for line in resume_text.splitlines():
        if BULLET_RE.match(line):
            text = BULLET_RE.sub("", line).strip()
            if len(text.split()) >= 4:
                bullets.append(text)
    if not bullets:  # unformatted resumes: treat long sentences as bullets
        bullets = [l.strip() for l in resume_text.splitlines() if len(l.split()) >= 9][:12]
    return bullets


def keyword_gap(resume_text: str, job_text: str) -> dict:
    job_skills = set(extract_skills(job_text))
    have = set(extract_skills(resume_text))
    return {"job_keywords": sorted(job_skills), "present": sorted(job_skills & have),
            "missing": sorted(job_skills - have)}


def _coverage(resume_text: str, job_text: str) -> int:
    gap = keyword_gap(resume_text, job_text)
    total = len(gap["job_keywords"])
    return int(round(100 * len(gap["present"]) / total)) if total else 0


def _strengthen(bullet: str) -> str:
    out = bullet.strip().rstrip(".")
    for pattern, follows, fallback in WEAK_OPENERS:
        m = re.match(pattern, out, re.I)
        if not m:
            continue
        rest = out[m.end():]
        first, _, tail = rest.partition(" ")
        key = first.lower()
        if follows == "gerund" and key in _FROM_GERUND:
            out = f"{_FROM_GERUND[key]} {tail}".strip()
        elif follows == "verb" and key in _PAST:
            out = f"{_PAST[key]} {tail}".strip()
        else:
            out = f"{fallback} {rest}"
        break
    return out[0].upper() + out[1:] if out else out


def _rule_tailor(resume_text: str, job_text: str, bullets: list[str]) -> dict:
    gap = keyword_gap(resume_text, job_text)
    job_kw = set(gap["job_keywords"])
    present = gap["present"]
    rewritten, used = [], set()
    for bullet in bullets:
        new = _strengthen(bullet)
        in_bullet = set(extract_skills(bullet))
        relevant = sorted(in_bullet & job_kw)
        # Surface one job keyword the candidate already lists elsewhere and that
        # fits the bullet's domain (shares a category with what's already there).
        bullet_cats = {get_skill_category(k) for k in in_bullet}
        extra = [k for k in present if k not in in_bullet and k not in used
                 and get_skill_category(k) in bullet_cats][:1]
        if extra:
            new = f"{new}, using {display_case(extra[0], resume_text)}"
            used.update(extra)
        rewritten.append({"original": bullet, "optimized": new + ".", "keywords": relevant + extra})
    summary_skills = ", ".join(display_case(s, resume_text) for s in present[:6]) or "the core skills in this role"
    return {
        "summary": f"Professional with hands-on experience in {summary_skills}, focused on measurable outcomes.",
        "bullets": rewritten,
        "keywords_added": sorted(used),
        "missing_keywords": gap["missing"],
        "notes": ["Rule-based rewrite: strengthened verbs and surfaced matching skills you already list.",
                  "Add the missing keywords only where you have real experience with them.",
                  "Set ANTHROPIC_API_KEY (or GROQ_API_KEY) for full AI rewrites."],
    }


TAILOR_PROMPT = """You are an expert resume writer optimizing a resume for applicant tracking systems (ATS).

TARGET JOB: {title} at {company}
JOB DESCRIPTION:
{job}

CANDIDATE RESUME:
{resume}

BULLETS TO REWRITE (keep the same order, one output per input):
{bullets}

Rules:
- Rewrite each bullet to lead with a strong action verb, include relevant job keywords, and quantify impact
  when the original contains numbers. Never invent employers, tools, metrics or experience not in the resume.
- Write a 2-3 sentence professional summary aimed at this role.
- List job keywords that are missing from the resume entirely.

Return JSON: {{"summary": "...", "bullets": [{{"original": "...", "optimized": "...", "keywords": ["..."]}}],
"keywords_added": ["..."], "missing_keywords": ["..."], "notes": ["..."]}}"""


def tailor_resume(resume_text: str, job_text: str, title: str = "", company: str = "",
                  bullets: Optional[list[str]] = None) -> dict:
    bullets = [b for b in (bullets or extract_bullets(resume_text)) if b.strip()][:20]
    result = llm_json(TAILOR_PROMPT.format(
        title=title or "the role", company=company or "the company", job=job_text[:5000],
        resume=resume_text[:6000], bullets="\n".join(f"{i + 1}. {b}" for i, b in enumerate(bullets))),
        max_tokens=3000, temperature=0.3)
    engine = "llm"
    if not result or not isinstance(result.get("bullets"), list):
        result, engine = _rule_tailor(resume_text, job_text, bullets), "rules"
    # Align output bullets with inputs by position so the UI can diff them.
    out_bullets = []
    for i, original in enumerate(bullets):
        item = result["bullets"][i] if i < len(result["bullets"]) and isinstance(result["bullets"][i], dict) else {}
        out_bullets.append({"original": original, "optimized": item.get("optimized") or original,
                            "keywords": item.get("keywords") or []})
    tailored_text = build_ats_resume(resume_text, result.get("summary", ""), out_bullets)
    return {
        "engine": engine,
        "summary": result.get("summary", ""),
        "bullets": out_bullets,
        "keywords_added": result.get("keywords_added", []),
        "missing_keywords": result.get("missing_keywords", keyword_gap(resume_text, job_text)["missing"]),
        "notes": result.get("notes", []),
        "match_before": _coverage(resume_text, job_text),
        "match_after": _coverage(tailored_text, job_text),
        "tailored_resume": tailored_text,
        "domain": domain_context(job_text, resume_text),
    }


def domain_context(job_text: str, resume_text: str) -> Optional[dict]:
    """The job's career domain from the knowledge base, with the domain keywords the posting
    uses that the resume lacks, and example bullets for that field. None when no domain fits."""
    from app.career.kb import service as kb
    did = kb.best_domain(job_text)
    if not did:
        return None
    domain = kb.get_domain(did)
    in_job = kb.domain_keywords_in(job_text, did)
    have = set(kb.domain_keywords_in(resume_text, did))
    return {"id": did, "name": domain["name"], "keywords_in_job": in_job,
            "keywords_missing": [k for k in in_job if k not in have], "example_bullets": domain["resume_bullets"][:3]}


def build_ats_resume(resume_text: str, summary: str, bullets: list[dict]) -> str:
    """Single-column plain-text resume with standard headings and the rewritten bullets."""
    replacements = {b["original"].strip(): b["optimized"].strip() for b in bullets}
    lines, out, in_summary, summary_done = resume_text.splitlines(), [], False, False
    for line in lines:
        stripped = line.strip()
        if SECTION_HEADINGS.match(stripped):
            heading = stripped.rstrip(":").upper()
            in_summary = heading in {"PROFESSIONAL SUMMARY", "SUMMARY", "PROFILE", "OBJECTIVE"}
            out.append("")
            out.append("PROFESSIONAL SUMMARY" if in_summary else heading)
            if in_summary and summary:
                out.append(summary)
                summary_done = True
            continue
        if in_summary and summary_done:
            continue  # replaced by the new summary
        body = BULLET_RE.sub("", line).strip()
        if body in replacements:
            out.append(f"• {replacements[body]}")
        else:
            out.append(stripped)
    text = "\n".join(out).strip()
    if summary and not summary_done:
        head, _, rest = text.partition("\n\n")
        text = f"{head}\n\nPROFESSIONAL SUMMARY\n{summary}\n\n{rest}".strip()
    return re.sub(r"\n{3,}", "\n\n", text)


COVER_PROMPT = """Write a concise, specific cover letter (under 280 words, 3 short paragraphs) for this application.
Use only facts from the resume. Avoid clichés like "I am writing to apply". Sign with the candidate's name.

CANDIDATE: {name}
RESUME:
{resume}

JOB: {title} at {company}
{job}

TONE: {tone}

Return JSON: {{"cover_letter": "...", "key_points": ["..."]}}"""


def _lower_first(text: str) -> str:
    # Keep acronyms / proper nouns ("AWS", "Python") capitalised.
    first = text.split(" ", 1)[0]
    return text if (len(first) > 1 and first[1:2].isupper()) else text[:1].lower() + text[1:]


def _best_bullet(resume_text: str, job_text: str) -> str:
    job_kw = set(extract_skills(job_text))
    best, best_score = "", -1
    for bullet in extract_bullets(resume_text):
        score = len(set(extract_skills(bullet)) & job_kw) * 2 + (1 if re.search(r"\d", bullet) else 0)
        if score > best_score:
            best, best_score = bullet, score
    return best.rstrip(".")


def cover_letter(resume_text: str, job_text: str, name: str, title: str, company: str,
                 tone: str = "confident and warm") -> dict:
    result = llm_json(COVER_PROMPT.format(name=name or "the candidate", resume=resume_text[:5000],
                                          title=title, company=company, job=job_text[:4000], tone=tone),
                      max_tokens=1200, temperature=0.6)
    if result and result.get("cover_letter"):
        return {"engine": "llm", "cover_letter": result["cover_letter"], "key_points": result.get("key_points", [])}
    gap = keyword_gap(resume_text, job_text)
    named = [display_case(s, resume_text) for s in gap["present"][:4]]
    skills = (", ".join(named[:-1]) + f" and {named[-1]}") if len(named) > 1 else (named[0] if named else
                                                                                  "the skills this role calls for")
    highlight = _best_bullet(resume_text, job_text)
    para2 = (f"Most recently, I {_lower_first(_strengthen(highlight))}. " if highlight else "") + \
        f"That work draws directly on {skills}, which sit at the center of this role."
    letter = (
        f"Dear {company} hiring team,\n\n"
        f"The {title} role caught my attention because it lines up closely with the work I do best. "
        f"I'd like to bring that experience to {company}.\n\n"
        f"{para2}\n\n"
        f"I'd welcome the chance to talk about how I can contribute to your team's goals. "
        f"My resume is attached, and thank you for your time.\n\n"
        f"Best regards,\n{name or 'Your name'}"
    )
    return {"engine": "rules", "cover_letter": letter,
            "key_points": [f"Matches {len(gap['present'])} of the role's keywords", "Leads with a concrete achievement"]}


INTERVIEW_PROMPT = """Prepare interview practice for this candidate and role.

JOB: {title} at {company}
{job}

RESUME:
{resume}

{reference}Return JSON: {{"questions": [{{"type": "behavioral|technical|role|company", "question": "...",
"why_asked": "...", "answer_tips": ["..."]}}]}} with 8 questions mixing types, tailored to the job's skills."""

_BEHAVIORAL = [
    ("Tell me about a time you delivered a project under a tight deadline.", "Tests prioritisation and ownership."),
    ("Describe a disagreement with a teammate and how you resolved it.", "Tests collaboration and communication."),
    ("Tell me about a mistake you made and what you learned.", "Tests self-awareness and growth."),
    ("Walk me through your most impactful project.", "Tests depth and ability to explain impact."),
]


def _domain_questions(job_text: str, limit: int = 4) -> tuple[Optional[str], list[dict]]:
    """Knowledge-base questions for the job's domain, preferring ones about skills the job names."""
    from app.career.kb import service as kb
    did = kb.best_domain(job_text)
    if not did:
        return None, []
    low = job_text.lower()
    bank = kb.interview_bank(did)
    bank.sort(key=lambda q: -sum(1 for w in re.findall(r"[a-z0-9+#.]{3,}", q["question"].lower()) if w in low))
    return did, bank[:limit]


def interview_questions(job_text: str, title: str, company: str, resume_text: str = "") -> dict:
    domain_id, bank = _domain_questions(f"{title}\n{job_text}")
    reference = ""
    if bank:
        reference = ("REFERENCE QUESTIONS this field commonly asks (adapt, don't copy blindly):\n"
                     + "\n".join(f"- {q['question']}" for q in bank) + "\n\n")
    result = llm_json(INTERVIEW_PROMPT.format(title=title, company=company, job=job_text[:4000],
                                              resume=resume_text[:3000], reference=reference),
                      max_tokens=2000, temperature=0.5)
    if result and isinstance(result.get("questions"), list) and result["questions"]:
        return {"engine": "llm", "domain": domain_id, "questions": result["questions"]}
    questions = [{"type": "behavioral", "question": q, "why_asked": w,
                  "answer_tips": ["Use STAR: Situation, Task, Action, Result.", "End with a measurable result."]}
                 for q, w in _BEHAVIORAL]
    for q in bank:
        questions.append({"type": "technical", "question": q["question"],
                          "why_asked": f"Common {q['level']}-level {q['topic']} question in this field.",
                          "answer_tips": [f"Model answer: {q['answer']}"] + [f"Expect a follow-up: {f}" for f in q.get("follow_ups", [])[:2]]})
    skills = [] if bank else (keyword_gap(resume_text, job_text)["job_keywords"][:4] or ["the core tools in this role"])
    for skill in skills:
        questions.append({"type": "technical", "question": f"How have you used {skill} in production? What trade-offs did you make?",
                          "why_asked": f"{skill} is a listed requirement.",
                          "answer_tips": ["Name a specific project.", "Explain one decision and its alternative."]})
    questions.append({"type": "company", "question": f"Why do you want to work at {company}?",
                      "why_asked": "Tests motivation and research.",
                      "answer_tips": ["Reference the product or mission.", "Tie it to your own goals."]})
    return {"engine": "rules", "domain": domain_id, "questions": questions}


FEEDBACK_PROMPT = """You are an interview coach. Evaluate this answer.

QUESTION: {question}
ANSWER: {answer}
ROLE: {title}

Return JSON: {{"score": 1-10, "strengths": ["..."], "improvements": ["..."], "improved_answer": "..."}}"""


def interview_feedback(question: str, answer: str, title: str = "") -> dict:
    result = llm_json(FEEDBACK_PROMPT.format(question=question, answer=answer[:4000], title=title),
                      max_tokens=1200, temperature=0.4)
    if result and "score" in result:
        return {"engine": "llm", **result}
    words = len(answer.split())
    lower = answer.lower()
    checks = {
        "situation": bool(re.search(r"\b(when|at my|while|during|in my role)\b", lower)),
        "action": bool(re.search(r"\b(i (built|led|designed|created|wrote|decided|implemented|fixed|drove))\b", lower)),
        "result": bool(re.search(r"\b(result|so that|which led|reduc|increas|improv|saved|grew)\w*", lower)),
        "metric": bool(re.search(r"\d", answer)),
    }
    score = 3 + sum(checks.values()) + (1 if 80 <= words <= 300 else 0) + (1 if " i " in f" {lower} " else 0)
    improvements = []
    if not checks["situation"]:
        improvements.append("Open with the context: where you were and what was at stake.")
    if not checks["action"]:
        improvements.append("Say what *you* did, using 'I' and specific verbs.")
    if not checks["result"]:
        improvements.append("Close with the outcome of your actions.")
    if not checks["metric"]:
        improvements.append("Add a number: time saved, % improvement, users, revenue.")
    if words < 80:
        improvements.append("Expand to about 1–2 minutes of speaking (100–250 words).")
    if words > 300:
        improvements.append("Tighten it: aim for under 2 minutes.")
    return {"engine": "rules", "score": min(10, score),
            "strengths": [k.title() + " is clear" for k, v in checks.items() if v] or ["You answered the question directly"],
            "improvements": improvements or ["Strong structure. Practise saying it out loud."],
            "improved_answer": ""}


REFERRAL_PROMPT = """Write a short, friendly LinkedIn message (under 90 words) asking {contact} ({position} at {company})
for a referral or a quick chat about the {title} role. Relationship: {relationship}. Candidate: {name}, {headline}.
Be specific and low-pressure. Return JSON: {{"message": "..."}}"""


def referral_message(contact: str, position: str, company: str, title: str, relationship: str,
                     name: str, headline: str) -> str:
    result = llm_json(REFERRAL_PROMPT.format(contact=contact, position=position or "a team member", company=company,
                                             title=title, relationship=relationship, name=name or "I",
                                             headline=headline or "a candidate"), max_tokens=400, temperature=0.7)
    if result and result.get("message"):
        return result["message"]
    first = contact.split(" ")[0] if contact else "there"
    hook = {"alumni": "We went to the same school, so I hoped you wouldn't mind a note.",
            "colleague": "It's been a while since we worked together, and I hope you're doing well."}.get(
        relationship, "I hope you're doing well.")
    return (f"Hi {first}, {hook} I'm applying for the {title} role at {company} and it looks like a great fit "
            f"for my background{(' as ' + headline) if headline else ''}. Would you be open to a quick chat about "
            f"the team, or to referring me if it seems like a match? Happy to send my resume. Thanks! {name}").strip()


def salary_guidance(title: str, salary_min: Optional[int], salary_max: Optional[int], offer: Optional[int] = None) -> dict:
    band = None
    if salary_min or salary_max:
        lo, hi = salary_min or salary_max, salary_max or salary_min
        band = {"min": lo, "max": hi, "target": int(lo + 0.75 * (hi - lo))}
    tips = [
        "Let them name a number first; if pressed, give a range whose bottom is your real target.",
        "Negotiate total compensation: base, equity, signing bonus, level and start date.",
        "Anchor on the role's scope and market data, not your current pay.",
        "Get the final offer in writing before resigning anywhere.",
    ]
    script = (f"Thank you, I'm excited about the {title} role. Based on the scope and market data, "
              f"I was expecting something closer to {('$' + format(band['target'], ',')) if band else 'the upper end of the band'}. "
              "Is there flexibility on the base or a signing bonus?")
    if offer and band and offer < band["target"]:
        tips.insert(0, f"The offer of ${offer:,} is below the 75th percentile of the posted band (${band['target']:,}). There's room to counter.")
    return {"band": band, "tips": tips, "counter_script": script}
