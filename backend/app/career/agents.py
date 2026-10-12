"""Agent layer: the Sage AI coach (tool-calling chat) and the auto-apply agent.

Sage runs a plan -> call tool -> observe loop when an LLM is configured
(prompt chaining with JSON tool calls, provider-agnostic). Without an LLM it
routes by intent to the same tools and writes templated replies, so the UI
and its structured result cards behave the same either way.
"""
import json
import logging
import re
from datetime import datetime
from typing import Callable, Optional

from sqlalchemy import func

from app.career import tools
from app.career.autofill import packet_json
from app.career.llm import llm_json
from app.career.matching import ProfileContext, job_to_dict, score_job, search_jobs
from app.career.models import ChatMessage, Connection, PlatformJob, SeekerProfile, TrackedApplication
from app.career.enrichment import normalize_company

logger = logging.getLogger(__name__)

STAGES = ["Wishlist", "Applied", "Screen", "Technical", "Offer", "Rejected"]


# ---------------------------------------------------------------- tools ----

def tool_search_jobs(db, profile, args):
    ctx = ProfileContext(profile)
    kwargs = dict(location=args.get("location", ""), remote_only=bool(args.get("remote_only")),
                  h1b_only=bool(args.get("h1b_only")), limit=int(args.get("limit", 5)))
    query = args.get("query", "")
    result = search_jobs(db, ctx, query=query, **kwargs)
    relaxed = False
    if not result["total"] and query:
        # Title keywords too narrow: fall back to semantic ranking over all jobs.
        result, relaxed = search_jobs(db, ctx, **kwargs), True
    return {"total": result["total"], "jobs": result["jobs"], "query": query, "relaxed": relaxed}


def tool_tracker_summary(db, profile, args):
    apps = db.query(TrackedApplication).filter(TrackedApplication.client_id == profile.client_id).all()
    by_stage = {s: 0 for s in STAGES}
    for app in apps:
        by_stage[app.stage] = by_stage.get(app.stage, 0) + 1
    stale = [a for a in apps if a.stage == "Applied" and a.applied_at and (datetime.utcnow() - a.applied_at).days >= 7]
    return {
        "total": len(apps), "by_stage": by_stage,
        "follow_ups": [{"id": a.id, "role": a.role, "company": a.company,
                        "days": (datetime.utcnow() - a.applied_at).days} for a in stale[:5]],
        "recent": [{"id": a.id, "role": a.role, "company": a.company, "stage": a.stage}
                   for a in sorted(apps, key=lambda a: a.updated_at or a.created_at, reverse=True)[:5]],
    }


def tool_add_to_tracker(db, profile, args):
    job = db.get(PlatformJob, args.get("job_id", "")) if args.get("job_id") else None
    if not job:
        return {"error": "Job not found"}
    return {"application": application_dict(save_job_to_tracker(db, profile, job))}


def tool_resume_gaps(db, profile, args):
    job = _resolve_job(db, profile, args)
    if not job:
        return {"error": "No target job found. Save a job first or name one."}
    gap = tools.keyword_gap(profile.resume_text or "", f"{job.title}\n{job.description}")
    return {"job": job_to_dict(job), **gap}


def tool_interview_prep(db, profile, args):
    job = _resolve_job(db, profile, args)
    if not job:
        # No saved job: fall back to the knowledge base's question bank for the asked or resume domain.
        domain = _kb_domain(profile, args)
        if not domain:
            return {"error": "Save a job first, or tell me the field (e.g. network engineer, Salesforce, AWS)."}
        from app.career.kb import service as kb
        bank = kb.interview_bank(domain, level=args.get("level"), limit=8)
        return {"job": None, "domain": kb.get_domain(domain)["name"],
                "questions": [{"type": "technical", "question": q["question"], "why_asked": q["topic"],
                               "answer_tips": [q["answer"]]} for q in bank]}
    return {"job": job_to_dict(job), **tools.interview_questions(job.description, job.title, job.company,
                                                                profile.resume_text or "")}


def tool_salary(db, profile, args):
    job = _resolve_job(db, profile, args)
    title = job.title if job else args.get("title", "this role")
    offer = args.get("offer")
    try:
        offer = int(str(offer).replace(",", "").replace("$", "").replace("k", "000")) if offer else None
    except ValueError:
        offer = None
    return {"job": job_to_dict(job) if job else None,
            **tools.salary_guidance(title, job.salary_min if job else None, job.salary_max if job else None, offer)}


def tool_find_insiders(db, profile, args):
    company = args.get("company") or ""
    if not company:
        job = _resolve_job(db, profile, args)
        company = job.company if job else ""
    if not company:
        return {"error": "Which company?"}
    return {"company": company, "insiders": find_insiders(db, profile, company)}


def tool_company_insights(db, profile, args):
    from app.career.insights import company_insights
    company = args.get("company") or ""
    if not company:
        job = _resolve_job(db, profile, args)
        company = job.company if job else ""
    if not company:
        return {"error": "Which company should I look into?"}
    return company_insights(db, profile, company)


def _kb_domain(profile, args) -> Optional[str]:
    """Domain id from explicit args, else the user's message, else their resume."""
    from app.career.kb import service as kb
    if kb.get_domain(args.get("domain") or ""):
        return args["domain"]
    return kb.best_domain(args.get("topic", ""), min_score=2.0) or kb.best_domain(profile.resume_text or "")


def tool_career_knowledge(db, profile, args):
    from app.career.kb import rag
    question = (args.get("question") or "").strip()
    if not question:
        return {"error": "What would you like to know?"}
    return rag.ask(question, domain=args.get("domain"), resume_text=profile.resume_text or "")


def tool_skill_roadmap(db, profile, args):
    from app.career.kb import service as kb
    domain = _kb_domain(profile, args)
    if not domain:
        return {"error": "Which field are you aiming for? For example: " + ", ".join(
            d["name"] for d in kb.list_domains())}
    return kb.skill_gap(domain, profile.resume_text or "")


TOOLS: dict[str, tuple[Callable, str]] = {
    "search_jobs": (tool_search_jobs, "Find matching jobs. args: query, location, remote_only, h1b_only, limit"),
    "tracker_summary": (tool_tracker_summary, "Summarize the user's application pipeline and follow-ups. args: none"),
    "add_to_tracker": (tool_add_to_tracker, "Save a job to the tracker. args: job_id"),
    "resume_gaps": (tool_resume_gaps, "Keyword gaps between resume and a job. args: job_id (optional)"),
    "interview_prep": (tool_interview_prep, "Interview questions for a job. args: job_id (optional)"),
    "salary_guidance": (tool_salary, "Salary band and negotiation script. args: job_id (optional), offer"),
    "find_insiders": (tool_find_insiders, "People the user knows at a company. args: company or job_id"),
    "company_insights": (tool_company_insights, "Open roles, H-1B signal, salary bands, common skills, hiring velocity "
                                                "and insiders at a company. args: company (or job_id)"),
    "career_knowledge": (tool_career_knowledge, "Answer a career or technical question from the curated knowledge base "
                                                "(skills, certifications, concepts, interview answers, system design) "
                                                "with sources. args: question, domain (optional id)"),
    "skill_roadmap": (tool_skill_roadmap, "Compare the user's resume with a career domain: skills they have and lack, "
                                          "a staged learning roadmap, certifications and projects. args: domain (id) "
                                          "or topic"),
}

KB_DOMAINS_HINT = ("Knowledge-base domain ids: network_engineer, fullstack_developer, backend_developer, "
                   "java_developer, aws_cloud_engineer, crm_developer, ai_engineer, ml_engineer, system_design.")


def _resolve_job(db, profile, args) -> Optional[PlatformJob]:
    if args.get("job_id"):
        return db.get(PlatformJob, args["job_id"])
    app = db.query(TrackedApplication).filter(
        TrackedApplication.client_id == profile.client_id, TrackedApplication.job_id.isnot(None),
        TrackedApplication.stage.notin_(["Rejected", "Offer"]),
    ).order_by(TrackedApplication.updated_at.desc()).first()
    return db.get(PlatformJob, app.job_id) if app else None


# --------------------------------------------------------- shared helpers --

def application_dict(app: TrackedApplication) -> dict:
    return {
        "id": app.id, "job_id": app.job_id, "role": app.role, "company": app.company, "location": app.location,
        "url": app.url, "ats": app.ats, "stage": app.stage, "match_score": app.match_score,
        "salary_range": app.salary_range, "notes": app.notes,
        "has_tailored_resume": bool(app.tailored_resume), "has_cover_letter": bool(app.cover_letter),
        "autofill_ready": bool(app.autofill_packet),
        "applied_at": app.applied_at.isoformat() if app.applied_at else None,
        "created_at": app.created_at.isoformat() if app.created_at else None,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
    }


def _salary_range(job: PlatformJob) -> str:
    if job.salary_min and job.salary_max:
        return f"${job.salary_min // 1000}k - ${job.salary_max // 1000}k"
    if job.salary_min or job.salary_max:
        return f"${(job.salary_min or job.salary_max) // 1000}k"
    return ""


def save_job_to_tracker(db, profile: SeekerProfile, job: PlatformJob, stage: str = "Wishlist") -> TrackedApplication:
    app = db.query(TrackedApplication).filter(TrackedApplication.client_id == profile.client_id,
                                              TrackedApplication.job_id == job.id).first()
    if app:
        return app
    match = score_job(ProfileContext(profile), job) if profile.resume_text else {"score": 0}
    app = TrackedApplication(
        client_id=profile.client_id, job_id=job.id, role=job.title, company=job.company, location=job.location,
        url=job.url, ats=job.ats_platform, stage=stage, match_score=match["score"], salary_range=_salary_range(job),
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


def find_insiders(db, profile: SeekerProfile, company: str) -> list[dict]:
    target = normalize_company(company)
    if not target:
        return []
    rows = db.query(Connection).filter(Connection.client_id == profile.client_id).all()
    out = []
    for c in rows:
        norm = normalize_company(c.company)
        if norm and (norm == target or norm.startswith(target + " ") or target.startswith(norm + " ")):
            out.append({"id": c.id, "name": c.name, "position": c.position, "company": c.company,
                        "relationship": c.relationship, "profile_url": c.profile_url, "email": c.email})
    rank = {"colleague": 0, "alumni": 1, "connection": 2}
    out.sort(key=lambda c: (rank.get(c["relationship"], 3), c["name"]))
    return out


# --------------------------------------------------------------- Sage ----

ORION_SYSTEM = """You are Sage, an AI career coach inside ProfileOptimizer. You help with job matching,
application tracking, resume tailoring, interview prep, salary negotiation and referrals. Be concise, warm and
specific. Use tools when you need the user's data; never invent jobs or applications.

TOOLS:
{tools}
{domains}
For conceptual, learning-path or "how do I become" questions, use career_knowledge or skill_roadmap
instead of answering from memory, and keep the [n] citations from career_knowledge in your reply.

USER PROFILE: {profile}

CONVERSATION SO FAR:
{history}

TOOL RESULTS THIS TURN:
{observations}

Decide the next step. Return JSON, either
{{"tool": "<tool name>", "args": {{...}}}} to call a tool, or
{{"reply": "<markdown answer for the user>"}} when you can answer."""


def _profile_brief(profile: SeekerProfile) -> str:
    from app.career.matching import parse_prefs
    prefs = parse_prefs(profile)
    return json.dumps({"name": profile.full_name, "headline": profile.headline, "location": profile.location,
                       "has_resume": bool(profile.resume_text), "preferences": prefs})[:1500]


def _history(db, client_id: str, limit: int = 8) -> list[ChatMessage]:
    rows = db.query(ChatMessage).filter(ChatMessage.client_id == client_id).order_by(
        ChatMessage.created_at.desc()).limit(limit).all()
    return list(reversed(rows))


def _llm_turn(db, profile: SeekerProfile, message: str) -> Optional[dict]:
    history = "\n".join(f"{m.role}: {m.content[:600]}" for m in _history(db, profile.client_id)) + f"\nuser: {message}"
    tool_list = "\n".join(f"- {name}: {desc}" for name, (_, desc) in TOOLS.items())
    observations, calls = [], []
    for _ in range(3):
        decision = llm_json(ORION_SYSTEM.format(tools=tool_list, domains=KB_DOMAINS_HINT,
                                                profile=_profile_brief(profile), history=history,
                                                observations=json.dumps(observations)[:6000] or "none"),
                            max_tokens=1200, temperature=0.4)
        if decision is None:
            return None
        if decision.get("reply"):
            return {"reply": decision["reply"], "tool_calls": calls}
        name = decision.get("tool")
        if name not in TOOLS:
            break
        args = decision.get("args") or {}
        try:
            result = TOOLS[name][0](db, profile, args)
        except Exception as exc:  # tool errors are reported back to the model
            logger.warning("Coach tool %s failed: %s", name, exc)
            result = {"error": str(exc)}
        calls.append({"tool": name, "args": args, "result": result})
        observations.append({"tool": name, "result": result})
    return {"reply": "Here's what I found.", "tool_calls": calls}


_INTENTS = [
    ("skill_roadmap", r"roadmap|learning path|what (should|do) i (learn|study)|skill gap|become an? |switch (to|into)|career path"),
    ("career_knowledge", r"what is|what are|explain|difference between|\bvs\.?\b|versus|how does|how do(es)? .{1,30} work|"
                         r"certif|system design|design an? |concept"),
    ("company_insights", r"insight|tell me about|what('s| is) it like|research|hiring (at|velocity)|how (is|are) .{1,40} hiring|about (the )?company"),
    ("salary_guidance", r"salary|negotiat|offer|compensation|pay\b|counter"),
    ("interview_prep", r"interview|prep|practice|questions"),
    ("find_insiders", r"referr|insider|connection|know (anyone|someone)|network"),
    ("resume_gaps", r"resume|keyword|tailor|gap|ats"),
    ("tracker_summary", r"track|application|pipeline|status|follow.?up|applied"),
    ("search_jobs", r"job|role|match|find|search|recommend|opening|position|remote|h-?1b|visa"),
]
_INTENT_INDEX = {name: i for i, (name, _) in enumerate(_INTENTS)}


_FILLER = set("""find show search get give me my any some a an the for as in at near with that which who can could you
please i im i'm want looking look jobs job roles role positions position openings opening remote sponsor sponsors
sponsorship h1b h-1b visa visas recommend recommendations new latest best top good matching match matches me? hiring
companies company work working onsite hybrid""".split())


def _extract_query(message: str) -> str:
    message = re.split(r"\b(?:in|near|at)\s+[A-Z]", message)[0]
    words = [w.strip("?.!,").lower() for w in message.split()]
    kept = [w for w in words if w and w not in _FILLER and not w.isdigit()]
    return " ".join(kept[:4])


_NOT_COMPANY = {"my", "me", "the", "a", "an", "this", "that", "it", "jobs", "job", "applications", "pipeline", "resume"}


def _extract_company(message: str) -> str:
    m = (re.search(r"\b(?:at|about|on|into|for)\s+([A-Z][A-Za-z0-9&.\- ]{1,40})", message)
         or re.search(r"\b(?:at|about|on|into|for)\s+([A-Za-z0-9&.\-]{2,40})\s*\??$", message))
    if not m:
        return ""
    name = re.sub(r"\s+(hiring|like|jobs?|insights?|culture)$", "", m.group(1).strip(" ?.!"), flags=re.I)
    return "" if not name or name.lower().split()[0] in _NOT_COMPANY else name


def _rules_turn(db, profile: SeekerProfile, message: str) -> dict:
    low = message.lower()
    intent = next((name for name, pattern in _INTENTS if re.search(pattern, low)), None)
    if intent == "career_knowledge" and re.search(r"\bmy (applications?|tracker|pipeline|jobs?|matches|offer)\b", low):
        # "what are my applications?" is about the user's data, not general knowledge.
        later = _INTENTS[_INTENT_INDEX["career_knowledge"] + 1:]
        intent = next((name for name, pattern in later if re.search(pattern, low)), None) or intent
    if intent is None:
        return {"reply": ("I'm Sage, your AI career coach. I can:\n"
                          "- **Find matching jobs** (\"find remote data engineer jobs that sponsor H-1B\")\n"
                          "- **Review your pipeline** (\"what should I follow up on?\")\n"
                          "- **Spot resume gaps** for a saved job\n"
                          "- **Prep interviews** and **negotiate salary**\n"
                          "- **Find insiders** for referrals\n"
                          "- **Research a company** (\"tell me about Stripe\")\n"
                          "- **Explain concepts and plan your learning** (\"OSPF vs BGP\", "
                          "\"roadmap to become a Salesforce developer\")"), "tool_calls": []}
    args: dict = {}
    if intent == "career_knowledge":
        args = {"question": message}
    elif intent in ("skill_roadmap", "interview_prep"):
        args = {"topic": message}
    elif intent == "search_jobs":
        args = {"query": _extract_query(message), "remote_only": "remote" in low,
                "h1b_only": bool(re.search(r"h-?1b|visa|sponsor", low)), "limit": 5}
    elif intent == "salary_guidance":
        m = re.search(r"\$?\s?(\d{2,3}(?:,\d{3})|\d{2,3}k)", low)
        if m:
            args["offer"] = m.group(1)
    elif intent == "find_insiders":
        m = re.search(r"\bat\s+([A-Za-z0-9&.\- ]{2,40})", message)
        if m:
            args["company"] = m.group(1).strip(" ?.!")
    elif intent == "company_insights":
        company = _extract_company(message)
        if company:
            args["company"] = company
        else:  # e.g. "tell me about my applications": use the next matching intent instead
            later = _INTENTS[_INTENT_INDEX["company_insights"] + 1:]
            intent = next((name for name, pattern in later if re.search(pattern, low)), None)
            if intent is None:
                return {"reply": "Which company should I look into?", "tool_calls": []}
            pattern = _INTENTS[_INTENT_INDEX["company_insights"]][1]
            return _rules_turn(db, profile, re.sub(pattern, "", message, flags=re.I))
    result = TOOLS[intent][0](db, profile, args)
    return {"reply": _render(intent, result, profile), "tool_calls": [{"tool": intent, "args": args, "result": result}]}


def _render(intent: str, r: dict, profile: SeekerProfile) -> str:
    if r.get("error"):
        return r["error"]
    if intent == "search_jobs":
        if not r["jobs"]:
            return "I couldn't find matching jobs yet. Try a broader search, or refresh jobs from the Jobs tab."
        lines = [f"Nothing matched \"{r['query']}\" exactly, so here are your closest overall matches:" if r.get("relaxed")
                 else f"I found **{r['total']}** jobs. Top picks:"]
        for j in r["jobs"]:
            score = f" · **{j['match']['score']}%** match" if j.get("match") else ""
            visa = " · H-1B" if j["h1b_sponsor"] else ""
            lines.append(f"- **{j['title']}** at {j['company']} ({j['location'] or 'Remote'}){score}{visa}")
        if not profile.resume_text:
            lines.append("\nAdd your resume to get match scores.")
        return "\n".join(lines)
    if intent == "tracker_summary":
        if not r["total"]:
            return "Your tracker is empty. Swipe right on jobs you like and I'll track them for you."
        stages = ", ".join(f"{k}: {v}" for k, v in r["by_stage"].items() if v)
        text = f"You're tracking **{r['total']}** applications ({stages})."
        if r["follow_ups"]:
            text += "\n\nWorth a follow-up (applied 7+ days ago):\n" + "\n".join(
                f"- {f['role']} at {f['company']} ({f['days']} days)" for f in r["follow_ups"])
        return text
    if intent == "resume_gaps":
        job = r["job"]
        text = f"For **{job['title']}** at {job['company']}, your resume covers {len(r['present'])} of {len(r['job_keywords'])} key skills."
        if r["missing"]:
            text += "\n\nMissing keywords (add only the ones you've used): " + ", ".join(r["missing"][:10])
        return text + "\n\nOpen the job and tap **Tailor resume** to rewrite your bullets for it."
    if intent == "career_knowledge":
        text = r["answer"]
        if r["sources"]:
            text += "\n\n**Sources:** " + "; ".join(f"[{s['n']}] {s['title']}" for s in r["sources"][:4])
        return text
    if intent == "skill_roadmap":
        lines = [f"For **{r['domain']['name']}**, your resume covers about **{r['coverage']}%** of the skills "
                 f"employers look for ({r['level']})."]
        if r["next_skills"]:
            lines.append("Learn next: " + ", ".join(r["next_skills"]))
        stage = next((st for st in r["roadmap"] if st["status"] == "current"), None)
        if stage:
            lines.append(f"\n**Current stage: {stage['stage']}** (~{stage['duration_weeks']} weeks)\n"
                         + "\n".join(f"- {g}" for g in stage["goals"]) + f"\n\nProject: {stage['project']}")
        if r["certifications"]:
            lines.append("\nCertifications to consider: " + ", ".join(c["name"] for c in r["certifications"][:3]))
        lines.append("\nOpen **Career Roadmap** for the full plan.")
        return "\n".join(lines)
    if intent == "interview_prep" and not r.get("job"):
        qs = r["questions"][:5]
        return f"Common **{r['domain']}** interview questions:\n" + "\n".join(
            f"{i + 1}. {q['question']}" for i, q in enumerate(qs)) + "\n\nAsk me to explain any of them."
    if intent == "interview_prep":
        qs = r["questions"][:5]
        return f"Practice questions for **{r['job']['title']}** at {r['job']['company']}:\n" + "\n".join(
            f"{i + 1}. {q['question']}" for i, q in enumerate(qs)) + "\n\nUse the Interview Prep panel to get feedback on your answers."
    if intent == "salary_guidance":
        band = r.get("band")
        text = (f"The posted band is **${band['min']:,} – ${band['max']:,}**; aim for about **${band['target']:,}**.\n\n"
                if band else "This posting has no salary band, so check Levels.fyi or Glassdoor for comparable roles.\n\n")
        return text + "\n".join(f"- {t}" for t in r["tips"]) + f"\n\n**Script:** \"{r['counter_script']}\""
    if intent == "find_insiders":
        if not r["insiders"]:
            return (f"You don't have any imported connections at **{r['company']}** yet. Import your LinkedIn "
                    "connections in Profile → Insider Connections.")
        return f"You know **{len(r['insiders'])}** people at {r['company']}:\n" + "\n".join(
            f"- {c['name']}, {c['position'] or 'employee'} ({c['relationship']})" for c in r["insiders"][:6])
    if intent == "company_insights":
        text = r["summary"]
        if r["open_roles"]["top"]:
            text += "\n\nTop open roles:\n" + "\n".join(
                f"- **{j['title']}** ({j['location'] or 'Remote'})" + (f" · {j['match']['score']}% match" if j.get("match") else "")
                for j in r["open_roles"]["top"][:5])
        if r["insiders"]["locked"]:
            text += f"\n\nYou know {r['insiders']['count']} people there. Upgrade to Turbo to see who."
        elif r["insiders"]["people"]:
            text += "\n\nInsiders: " + ", ".join(p["name"] for p in r["insiders"]["people"])
        return text
    return "Done."


def orion_chat(db, profile: SeekerProfile, message: str) -> dict:
    turn = _llm_turn(db, profile, message) or _rules_turn(db, profile, message)
    db.add(ChatMessage(client_id=profile.client_id, role="user", content=message))
    db.add(ChatMessage(client_id=profile.client_id, role="assistant", content=turn["reply"],
                       tool_calls=json.dumps([{"tool": c["tool"], "args": c["args"]} for c in turn["tool_calls"]])))
    db.commit()
    return turn


# ---------------------------------------------------------- auto-apply ----

def auto_apply(db, profile: SeekerProfile, job: PlatformJob, min_match: int = 0) -> dict:
    """Beta agent: match check -> tailor resume -> cover letter -> autofill packet
    -> tracker entry. Submission stays with the user (the extension fills the
    form; the user reviews and submits)."""
    steps = []
    ctx = ProfileContext(profile)
    match = score_job(ctx, job)
    steps.append({"step": "match", "status": "done", "detail": f"{match['score']}% match"})
    if match["score"] < min_match:
        steps.append({"step": "gate", "status": "stopped", "detail": f"Below your {min_match}% threshold"})
        return {"status": "skipped", "steps": steps, "match": match}
    if match["sponsorship_blocked"]:
        steps.append({"step": "gate", "status": "stopped", "detail": "Posting can't sponsor visas"})
        return {"status": "skipped", "steps": steps, "match": match}

    job_text = f"{job.title}\n{job.description}"
    tailored = tools.tailor_resume(profile.resume_text, job_text, job.title, job.company)
    steps.append({"step": "tailor_resume", "status": "done",
                  "detail": f"Keyword coverage {tailored['match_before']}% → {tailored['match_after']}%"})
    letter = tools.cover_letter(profile.resume_text, job_text, profile.full_name, job.title, job.company)
    steps.append({"step": "cover_letter", "status": "done", "detail": f"{len(letter['cover_letter'].split())} words"})

    app = save_job_to_tracker(db, profile, job)
    app.tailored_resume = tailored["tailored_resume"]
    app.cover_letter = letter["cover_letter"]
    app.autofill_packet = packet_json(profile, job_to_dict(job), tailored["tailored_resume"], letter["cover_letter"])
    app.notes = (app.notes + "\n" if app.notes else "") + "Auto-apply packet ready: open the posting with the extension to fill and submit."
    db.commit()
    steps.append({"step": "autofill_packet", "status": "done", "detail": "Ready for the Chrome extension"})
    return {"status": "ready", "steps": steps, "match": match, "application": application_dict(app),
            "apply_url": job.url, "tailored": tailored, "cover_letter": letter["cover_letter"]}


def stats_for_dashboard(db, profile: SeekerProfile) -> dict:
    total_jobs = db.query(func.count(PlatformJob.id)).filter(PlatformJob.active.is_(True)).scalar() or 0
    new_today = db.query(func.count(PlatformJob.id)).filter(
        PlatformJob.ingested_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)).scalar() or 0
    tracker = tool_tracker_summary(db, profile, {})
    return {"jobs_indexed": total_jobs, "new_today": new_today, "tracker": tracker}
