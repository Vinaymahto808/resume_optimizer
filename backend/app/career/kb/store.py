"""Vector stores for the knowledge base.

``PineconeStore`` is used when both PINECONE_API_KEY and OPENAI_API_KEY are set
and the index has been filled by ``python -m app.career.kb.ingest``. Otherwise
``LocalStore`` searches the same chunks in memory (hashed embeddings plus a
keyword-overlap boost), so every feature works in dev and tests without keys.
"""
import logging
import math
import os
import re
import threading
from typing import Optional

import numpy as np

from app.career.kb import content
from app.career.vectors import _STOP, local_embedding
from app.config import settings

logger = logging.getLogger(__name__)

NAMESPACE = "career-kb"
EMBED_MODEL = "text-embedding-3-small"
EMBED_DIM = 1536
_WORD_RE = re.compile(r"[a-z0-9][a-z0-9+#.\-]*")


def index_name() -> str:
    return os.getenv("KB_PINECONE_INDEX", "career-kb")


# Question words and filler that say nothing about the topic ("how do I ...", "difference between").
_QUERY_STOP = _STOP | set("""how what why when which who does did doing should would could best way ways pick choose
explain difference between versus mean means meaning tell know need want become get good start started help please
common typical about make using""".split())


def _words(text: str) -> set[str]:
    return {w.strip(".-") for w in _WORD_RE.findall(text.lower()) if len(w) > 2} - _QUERY_STOP


def _match_filter(chunk: dict, domain: Optional[str], kinds: Optional[set[str]]) -> bool:
    return (domain is None or chunk["domain"] == domain) and (not kinds or chunk["kind"] in kinds)


def _bare_title(chunk: dict) -> str:
    # Titles start with the domain name ("CRM Developer / Consultant interview ..."): don't let it count as a match.
    return chunk["title"].replace(chunk["domain_name"], " ")


class LocalStore:
    """Hybrid search: IDF-weighted keyword overlap (body and title) plus hashed-embedding cosine.

    Each hit also carries ``lexical``, the share of the query's informative terms the chunk
    contains, which the RAG grader uses as evidence of real relevance."""
    name = "local"

    def __init__(self):
        self._lock = threading.Lock()
        self._chunks: list[dict] = []
        self._matrix: Optional[np.ndarray] = None
        self._words: list[set[str]] = []
        self._title_words: list[set[str]] = []
        self._idf: dict[str, float] = {}

    def _build(self):
        if self._matrix is not None:
            return
        chunks = content.chunks()
        self._chunks = chunks
        self._words = [_words(f"{_bare_title(c)} {c['text']}") for c in chunks]
        self._title_words = [_words(_bare_title(c)) for c in chunks]
        df: dict[str, int] = {}
        for words in self._words:
            for w in words:
                df[w] = df.get(w, 0) + 1
        n = len(chunks) or 1
        self._idf = {w: math.log(1 + n / c) for w, c in df.items()}
        vecs = [local_embedding(f"{c['title']}\n{c['text']}") for c in chunks]
        self._matrix = np.asarray(vecs, dtype=np.float64) if vecs else np.zeros((0, 1))

    def _weight(self, words: set[str]) -> float:
        # Unknown words are rare by definition: give them the highest weight seen.
        top = max(self._idf.values(), default=1.0)
        return sum(self._idf.get(w, top) for w in words)

    def search(self, query: str, top_k: int = 6, domain: Optional[str] = None,
               kinds: Optional[set[str]] = None) -> list[dict]:
        with self._lock:
            self._build()
        if not self._chunks:
            return []
        q_vec = np.asarray(local_embedding(query), dtype=np.float64)
        dense = self._matrix @ q_vec
        q_words = _words(query)
        q_weight = self._weight(q_words) or 1.0
        results = []
        for i, chunk in enumerate(self._chunks):
            if not _match_filter(chunk, domain, kinds):
                continue
            lexical = self._weight(q_words & self._words[i]) / q_weight
            title = self._weight(q_words & self._title_words[i]) / q_weight
            score = 0.25 * max(float(dense[i]), 0.0) + 0.45 * lexical + 0.30 * title
            results.append((score, lexical, chunk))
        results.sort(key=lambda r: -r[0])
        return [{**chunk, "score": round(score, 4), "lexical": round(lexical, 3)}
                for score, lexical, chunk in results[:top_k]]


class PineconeStore:
    name = "pinecone"

    def __init__(self, index):
        self._index = index

    def search(self, query: str, top_k: int = 6, domain: Optional[str] = None,
               kinds: Optional[set[str]] = None) -> list[dict]:
        flt: dict = {}
        if domain:
            flt["domain"] = {"$eq": domain}
        if kinds:
            flt["kind"] = {"$in": sorted(kinds)}
        res = self._index.query(vector=embed_openai([query])[0], top_k=top_k, include_metadata=True,
                                namespace=NAMESPACE, filter=flt or None)
        out = []
        for match in res.matches or []:
            meta = match.metadata or {}
            out.append({"id": match.id, "domain": meta.get("domain", ""), "domain_name": meta.get("domain_name", ""),
                        "kind": meta.get("kind", ""), "title": meta.get("title", ""), "text": meta.get("text", ""),
                        "score": round(float(match.score), 4)})
        return out


def embed_openai(texts: list[str]) -> list[list[float]]:
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    resp = client.embeddings.create(input=[t[:8000] for t in texts], model=EMBED_MODEL)
    return [d.embedding for d in resp.data]


def pinecone_client():
    from pinecone import Pinecone
    return Pinecone(api_key=settings.PINECONE_API_KEY)


def pinecone_configured() -> bool:
    return bool(settings.PINECONE_API_KEY and settings.OPENAI_API_KEY) and os.getenv("KB_STORE", "") != "local"


_local = LocalStore()
_store = None
_store_lock = threading.Lock()


def get_store():
    """Pinecone when configured and filled, else the in-memory store. Decided once per process."""
    global _store
    with _store_lock:
        if _store is not None:
            return _store
        _store = _local
        if pinecone_configured():
            try:
                pc = pinecone_client()
                if pc.has_index(index_name()):
                    index = pc.Index(index_name())
                    stats = index.describe_index_stats()
                    ns = (getattr(stats, "namespaces", None) or {}).get(NAMESPACE)
                    count = (ns.get("vector_count", 0) if isinstance(ns, dict)
                             else getattr(ns, "vector_count", 0)) if ns else 0
                    if count:
                        _store = PineconeStore(index)
                    else:
                        logger.warning("Pinecone index %s is empty; run `python -m app.career.kb.ingest`", index_name())
                else:
                    logger.warning("Pinecone index %s not found; run `python -m app.career.kb.ingest`", index_name())
            except Exception as exc:  # network/auth problems must not take the feature down
                logger.warning("Pinecone unavailable, using local knowledge store: %s", exc)
        return _store


def search(query: str, top_k: int = 6, domain: Optional[str] = None, kinds: Optional[set[str]] = None) -> list[dict]:
    store = get_store()
    try:
        return store.search(query, top_k=top_k, domain=domain, kinds=kinds)
    except Exception as exc:
        if isinstance(store, LocalStore):
            raise
        logger.warning("Pinecone query failed, falling back to local store: %s", exc)
        return _local.search(query, top_k=top_k, domain=domain, kinds=kinds)


def reset_store():
    """Forget the cached store choice (tests, or after ingesting)."""
    global _store
    with _store_lock:
        _store = None
