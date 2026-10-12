"""Load the knowledge-base chunks into Pinecone.

    python -m app.career.kb.ingest            # create the index if needed, upsert every chunk
    python -m app.career.kb.ingest --dry-run  # validate content and print chunk counts only

Needs PINECONE_API_KEY and OPENAI_API_KEY. Chunk ids are stable, so re-running
updates changed text in place and removes chunks that no longer exist.
"""
import argparse
import os
import sys
from collections import Counter

from app.career.kb import content, store

BATCH = 64


def ingest(dry_run: bool = False) -> dict:
    chunks = content.chunks()
    summary = {"chunks": len(chunks), "by_domain": dict(Counter(c["domain"] for c in chunks)),
               "by_kind": dict(Counter(c["kind"] for c in chunks))}
    if dry_run:
        return summary
    if not store.pinecone_configured():
        raise SystemExit("Set PINECONE_API_KEY and OPENAI_API_KEY (and not KB_STORE=local) to ingest into Pinecone.")

    from pinecone import ServerlessSpec
    pc = store.pinecone_client()
    name = store.index_name()
    if not pc.has_index(name):
        region = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
        pc.create_index(name=name, dimension=store.EMBED_DIM, metric="cosine",
                        spec=ServerlessSpec(cloud=os.getenv("PINECONE_CLOUD", "aws"), region=region))  # waits until ready
    index = pc.Index(name)

    for start in range(0, len(chunks), BATCH):
        batch = chunks[start:start + BATCH]
        vectors = store.embed_openai([f"{c['title']}\n{c['text']}" for c in batch])
        index.upsert(namespace=store.NAMESPACE, vectors=[
            {"id": c["id"], "values": vec,
             "metadata": {"domain": c["domain"], "domain_name": c["domain_name"], "kind": c["kind"],
                          "title": c["title"], "text": c["text"]}}
            for c, vec in zip(batch, vectors)])

    wanted = {c["id"] for c in chunks}
    stale = [item.id for page in index.list(namespace=store.NAMESPACE) for item in page.vectors if item.id not in wanted]
    for start in range(0, len(stale), 1000):
        index.delete(ids=stale[start:start + 1000], namespace=store.NAMESPACE)
    store.reset_store()
    return {**summary, "index": name, "namespace": store.NAMESPACE, "removed": len(stale)}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="validate content without calling Pinecone")
    args = parser.parse_args(argv)
    result = ingest(dry_run=args.dry_run)
    for key, value in result.items():
        print(f"{key}: {value}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
