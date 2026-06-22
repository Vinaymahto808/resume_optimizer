import hashlib
import numpy as np
import os
from typing import Optional
from app.config import settings

HAS_OPENAI = False
openai = None

HAS_PINECONE = False
pinecone = None

_local_vector_store: dict[str, dict] = {}

def get_openai_client():
    global openai, HAS_OPENAI
    if not HAS_OPENAI:
        try:
            import openai as _o
            openai = _o
            HAS_OPENAI = True
        except ImportError:
            return None
    api_key = getattr(settings, "OPENAI_API_KEY", None) or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return openai.OpenAI(api_key=api_key)

def generate_embedding(text: str, model: str = "text-embedding-3-small") -> Optional[list[float]]:
    client = get_openai_client()
    if client:
        try:
            resp = client.embeddings.create(input=text, model=model)
            return resp.data[0].embedding
        except Exception:
            pass
    return _fallback_embedding(text)

def _fallback_embedding(text: str, dim: int = 1536) -> list[float]:
    raw = hashlib.md5(text.encode("utf-8")).hexdigest()
    seed = int(raw, 16) % (2**32)
    rng = np.random.default_rng(seed)
    vec = rng.uniform(-1.0, 1.0, dim)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    a = np.array(vec_a, dtype=np.float64)
    b = np.array(vec_b, dtype=np.float64)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)

def batch_generate_embeddings(texts: list[str]) -> list[Optional[list[float]]]:
    return [generate_embedding(t) for t in texts]

def search_similar(
    query_vector: list[float],
    candidates: list[tuple[str, list[float]]],
    top_k: int = 10,
) -> list[dict]:
    scores = []
    for cid, cvec in candidates:
        sim = cosine_similarity(query_vector, cvec)
        scores.append({"id": cid, "score": sim})
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores[:top_k]

def get_pinecone_index():
    global pinecone, HAS_PINECONE
    api_key = getattr(settings, "PINECONE_API_KEY", None) or os.getenv("PINECONE_API_KEY")
    env = getattr(settings, "PINECONE_ENVIRONMENT", None) or os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")
    index_name = getattr(settings, "PINECONE_INDEX_NAME", None) or os.getenv("PINECONE_INDEX_NAME", "resume-embeddings")
    if not api_key:
        return None
    if not HAS_PINECONE:
        try:
            import pinecone as _p
            pinecone = _p
            HAS_PINECONE = True
        except ImportError:
            return None
    try:
        pc = pinecone.Pinecone(api_key=api_key, environment=env)
        if index_name not in pc.list_indexes().names():
            return None
        return pc.Index(index_name)
    except Exception:
        return None

def upsert_embedding(id: str, vector: list[float], metadata: dict = None):
    index = get_pinecone_index()
    if index:
        try:
            index.upsert(vectors=[(id, vector, metadata or {})])
            return
        except Exception:
            pass
    _local_vector_store[id] = {"vector": vector, "metadata": metadata or {}}

def query_embeddings(
    vector: list[float], top_k: int = 10, filter: dict = None
) -> list[dict]:
    index = get_pinecone_index()
    if index:
        try:
            resp = index.query(vector=vector, top_k=top_k, filter=filter, include_metadata=True)
            return [
                {"id": m.id, "score": m.score, "metadata": m.metadata}
                for m in resp.matches
            ]
        except Exception:
            pass
    candidates = [
        (cid, entry["vector"])
        for cid, entry in _local_vector_store.items()
    ]
    results = search_similar(vector, candidates, top_k=top_k)
    for r in results:
        entry = _local_vector_store.get(r["id"])
        r["metadata"] = entry["metadata"] if entry else {}
    return results

def compute_similarity_score(profile_text: str, job_text: str) -> float:
    vec_a = generate_embedding(profile_text)
    vec_b = generate_embedding(job_text)
    if vec_a is None or vec_b is None:
        return 0.0
    return round(cosine_similarity(vec_a, vec_b) * 100, 2)
