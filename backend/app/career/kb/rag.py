"""Question answering over the knowledge base as a LangGraph state graph.

    route ──> retrieve ──> grade ──(nothing relevant, first try)──> broaden ──> retrieve
                                └─(relevant chunks)──> generate ──> END

``route`` picks the domain (explicit choice, else detected from the question,
else from the resume). ``grade`` drops weak matches; if nothing survives a
domain-filtered search, ``broaden`` retries across all domains once.
``generate`` answers with the LLM using only the graded chunks as context and
cites them; without an LLM it returns an extractive answer from the same chunks.
If langgraph is not installed the same node functions run in sequence.
"""
import logging
import re
from typing import Optional, TypedDict

from app.career.kb import service, store
from app.career.llm import llm_text

logger = logging.getLogger(__name__)

TOP_K = 6
_INTERVIEW_RE = re.compile(r"\binterview|question|asked|prepare|prep\b", re.I)
_ROADMAP_RE = re.compile(r"\broadmap|learn|study|start|beginner|become|switch|path|certif", re.I)


class RagState(TypedDict, total=False):
    question: str
    resume_text: str
    domain: Optional[str]
    domain_source: str
    kinds: Optional[set]
    docs: list
    graded: list
    attempts: int
    answer: str
    engine: str


def route(state: RagState) -> RagState:
    question = state["question"]
    domain, source = state.get("domain"), "user"
    if not domain or not service.get_domain(domain):
        # A question is short, so two skill hits are enough evidence (resumes need more).
        domain, source = service.best_domain(question, min_score=2.0), "question"
        if not domain and state.get("resume_text"):
            domain, source = service.best_domain(state["resume_text"]), "resume"
    kinds = None
    if _INTERVIEW_RE.search(question):
        kinds = {"interview", "concept"}
    elif _ROADMAP_RE.search(question):
        kinds = {"roadmap", "certifications", "projects", "overview"}
    return {"domain": domain, "domain_source": source if domain else "none", "kinds": kinds, "attempts": 0}


def retrieve(state: RagState) -> RagState:
    docs = store.search(state["question"], top_k=TOP_K, domain=state.get("domain"), kinds=state.get("kinds"))
    if len(docs) < 3 and state.get("kinds"):  # the kind filter was too narrow for this question
        seen = {d["id"] for d in docs}
        docs += [d for d in store.search(state["question"], top_k=TOP_K, domain=state.get("domain"))
                 if d["id"] not in seen]
    return {"docs": docs[:TOP_K], "attempts": state.get("attempts", 0) + 1}


def _floor() -> float:
    # Cosine scores from OpenAI embeddings and the local hybrid score live on different scales.
    return 0.25 if store.get_store().name == "pinecone" else 0.12


def grade(state: RagState) -> RagState:
    docs = state.get("docs") or []
    if not docs:
        return {"graded": []}
    top = docs[0]["score"]
    # Local hits must also share a real part of the question's informative terms (IDF-weighted).
    keep = [d for d in docs if d["score"] >= max(_floor(), 0.55 * top) and d.get("lexical", 1.0) >= 0.3]
    return {"graded": keep[:5]}


def needs_broadening(state: RagState) -> str:
    if not state.get("graded") and state.get("domain") and state.get("attempts", 0) < 2:
        return "broaden"
    return "generate"


def broaden(state: RagState) -> RagState:
    return {"domain": None, "kinds": None}


ANSWER_PROMPT = """You are Sage, a career coach for job seekers. Answer the question using the reference notes.

QUESTION: {question}
{domain_line}{resume_line}
REFERENCE NOTES (numbered):
{context}

Rules:
- Base the answer on the notes and cite them inline like [1] or [2][3].
- If the notes don't cover something, say so briefly and give general guidance without a citation.
- Be specific and practical: name skills, tools, steps, or a model interview answer as the question needs.
- Use short markdown (headings or bullets) and stay under 300 words.
- Never invent salary numbers, statistics, or company facts."""


def _context(docs: list[dict]) -> str:
    return "\n\n".join(f"[{i + 1}] {d['title']}\n{d['text'][:1800]}" for i, d in enumerate(docs))


def _clip(text: str, limit: int = 900) -> str:
    """Shorten to whole sentences so an extractive answer never stops mid-word."""
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    end = max(cut.rfind(". "), cut.rfind(".\n"))
    return cut[:end + 1].strip() if end > limit // 3 else cut.rsplit(" ", 1)[0] + "…"


def _extractive(question: str, docs: list[dict]) -> str:
    if not docs:
        return ("I don't have notes on that yet. Try naming a domain, for example *network engineer*, "
                "*Salesforce developer*, *AWS cloud*, *AI engineer* or *system design*.")
    lines = [f"Here's what my career notes say about **{question.strip().rstrip('?')}**:"]
    for i, d in enumerate(docs[:3]):
        text = d["text"]
        if d["kind"] == "interview":
            text = text.split("\nFollow-ups:")[0]
        lines.append(f"\n**{d['title']}** [{i + 1}]\n{_clip(text)}")
    return "\n".join(lines)


def generate(state: RagState) -> RagState:
    docs = state.get("graded") or []
    domain = service.get_domain(state["domain"]) if state.get("domain") else None
    if docs:
        prompt = ANSWER_PROMPT.format(
            question=state["question"], context=_context(docs),
            domain_line=f"DOMAIN: {domain['name']}\n" if domain else "",
            resume_line=f"CANDIDATE RESUME (excerpt): {state['resume_text'][:1200]}\n" if state.get("resume_text") else "")
        answer = llm_text(prompt, max_tokens=900, temperature=0.3)
        if answer:
            return {"answer": answer.strip(), "engine": "llm"}
    return {"answer": _extractive(state["question"], docs), "engine": "extractive"}


def _build_graph():
    try:
        from langgraph.graph import END, StateGraph
    except ImportError:
        logger.info("langgraph not installed; running the RAG nodes sequentially")
        return None
    graph = StateGraph(RagState)
    graph.add_node("route", route)
    graph.add_node("retrieve", retrieve)
    graph.add_node("grade", grade)
    graph.add_node("broaden", broaden)
    graph.add_node("generate", generate)
    graph.set_entry_point("route")
    graph.add_edge("route", "retrieve")
    graph.add_edge("retrieve", "grade")
    graph.add_conditional_edges("grade", needs_broadening, {"broaden": "broaden", "generate": "generate"})
    graph.add_edge("broaden", "retrieve")
    graph.add_edge("generate", END)
    return graph.compile()


_graph = None
_graph_built = False


def _run_sequential(state: RagState) -> RagState:
    state = {**state, **route(state)}
    while True:
        state = {**state, **retrieve(state)}
        state = {**state, **grade(state)}
        if needs_broadening(state) == "broaden":
            state = {**state, **broaden(state)}
            continue
        return {**state, **generate(state)}


def ask(question: str, domain: Optional[str] = None, resume_text: str = "") -> dict:
    global _graph, _graph_built
    if not _graph_built:
        _graph, _graph_built = _build_graph(), True
    initial: RagState = {"question": question.strip(), "domain": domain, "resume_text": resume_text or ""}
    final = _graph.invoke(initial) if _graph is not None else _run_sequential(initial)
    detected = service.get_domain(final["domain"]) if final.get("domain") else None
    return {
        "answer": final["answer"],
        "engine": final["engine"],
        "orchestrator": "langgraph" if _graph is not None else "sequential",
        "store": store.get_store().name,
        "domain": {"id": detected["id"], "name": detected["name"], "source": final.get("domain_source")}
        if detected else None,
        "sources": [{"n": i + 1, "id": d["id"], "title": d["title"], "domain": d["domain"], "kind": d["kind"],
                     "score": d["score"]} for i, d in enumerate(final.get("graded") or [])],
    }
