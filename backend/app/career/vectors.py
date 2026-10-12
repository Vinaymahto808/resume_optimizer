"""Embeddings and an in-process vector index over job postings.

With ``OPENAI_API_KEY`` set, OpenAI ``text-embedding-3-small`` vectors are
used. Otherwise a deterministic hashed TF-IDF-style embedding is used, which
still captures lexical/semantic overlap (unlike a random hash vector). Vectors
are stored as JSON on each row; the index is a numpy matrix rebuilt when the
job table changes.
"""
import hashlib
import json
import logging
import math
import re
import threading
from typing import Optional

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

LOCAL_DIM = 768
_TOKEN_RE = re.compile(r"[a-z][a-z0-9+#.\-]{1,}")
_STOP = set("""a an and are as at be by for from has have in is it its of on or our that the this to we with you your
will who what when where which while about into over under within across their they them than then also more most
such can may must should would could not no yes all any each other some new work working team role job position
experience years year strong ability skills skill including using use used help""".split())


def _tokens(text: str) -> list[str]:
    toks = [t.strip(".-") for t in _TOKEN_RE.findall(text.lower())]
    return [t for t in toks if t and t not in _STOP and len(t) > 1]


def _bucket(feature: str) -> tuple[int, float]:
    digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
    value = int.from_bytes(digest, "little")
    return value % LOCAL_DIM, (1.0 if (value >> 63) & 1 else -1.0)


def local_embedding(text: str) -> list[float]:
    """Signed feature hashing over unigrams + bigrams with sublinear tf."""
    toks = _tokens(text)
    counts: dict[str, int] = {}
    for tok in toks:
        counts[tok] = counts.get(tok, 0) + 1
    for a, b in zip(toks, toks[1:]):
        key = f"{a}_{b}"
        counts[key] = counts.get(key, 0) + 1
    vec = np.zeros(LOCAL_DIM, dtype=np.float64)
    for feature, count in counts.items():
        idx, sign = _bucket(feature)
        weight = 1.0 + math.log(count)
        if "_" in feature:
            weight *= 0.6
        vec[idx] += sign * weight
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec.round(5).tolist()


def _openai_embedding(text: str) -> Optional[list[float]]:
    if not settings.OPENAI_API_KEY:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        resp = client.embeddings.create(input=text[:8000], model="text-embedding-3-small")
        return resp.data[0].embedding
    except Exception as exc:  # network/quota errors fall back to local vectors
        logger.warning("OpenAI embedding failed, using local embedding: %s", exc)
        return None


def embed(text: str) -> list[float]:
    return _openai_embedding(text) or local_embedding(text)


def dumps(vec: list[float]) -> str:
    return json.dumps(vec)


def loads(raw: str) -> Optional[np.ndarray]:
    if not raw:
        return None
    try:
        return np.asarray(json.loads(raw), dtype=np.float64)
    except (ValueError, TypeError):
        return None


def cosine(a: Optional[np.ndarray], b: Optional[np.ndarray]) -> float:
    if a is None or b is None or a.shape != b.shape:
        return 0.0
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom else 0.0


class JobVectorIndex:
    """Cached matrix of job embeddings for brute-force cosine search."""

    def __init__(self):
        self._lock = threading.Lock()
        self._version: tuple = ()
        self._ids: list[str] = []
        self._matrix: Optional[np.ndarray] = None

    def invalidate(self):
        with self._lock:
            self._version = ()

    def _refresh(self, db):
        from sqlalchemy import func
        from app.career.models import PlatformJob

        count, latest = db.query(func.count(PlatformJob.id), func.max(PlatformJob.ingested_at)).filter(
            PlatformJob.active.is_(True)).one()
        version = (count, latest)
        if version == self._version and self._matrix is not None:
            return
        rows = db.query(PlatformJob.id, PlatformJob.embedding).filter(PlatformJob.active.is_(True)).all()
        ids, vecs, dim = [], [], None
        for job_id, raw in rows:
            vec = loads(raw)
            if vec is None:
                continue
            dim = dim or vec.shape[0]
            if vec.shape[0] != dim:
                continue
            ids.append(job_id)
            vecs.append(vec)
        self._ids = ids
        self._matrix = np.vstack(vecs) if vecs else None
        if self._matrix is not None:
            norms = np.linalg.norm(self._matrix, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            self._matrix = self._matrix / norms
        self._version = version

    def search(self, db, query_vec: list[float], top_k: int = 200) -> list[tuple[str, float]]:
        with self._lock:
            self._refresh(db)
            if self._matrix is None:
                return []
            q = np.asarray(query_vec, dtype=np.float64)
            if q.shape[0] != self._matrix.shape[1]:
                return []
            norm = np.linalg.norm(q)
            if norm == 0:
                return []
            scores = self._matrix @ (q / norm)
            order = np.argsort(-scores)[:top_k]
            return [(self._ids[i], float(scores[i])) for i in order]


job_index = JobVectorIndex()
