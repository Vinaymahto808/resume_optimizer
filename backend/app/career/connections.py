"""Insider Connections: import the user's own LinkedIn connections export (or
add contacts by hand) and match them to target companies for referrals."""
import csv
import io

from app.career.models import Connection

# LinkedIn's "Connections.csv" export starts with a few "Notes:" lines before the header row.
_HEADER_KEYS = {"first name", "last name", "company", "position"}


def parse_linkedin_csv(raw: bytes) -> list[dict]:
    text = raw.decode("utf-8-sig", errors="ignore")
    lines = text.splitlines()
    start = next((i for i, line in enumerate(lines) if _HEADER_KEYS <= {c.strip().lower() for c in line.split(",")}), None)
    if start is None:
        start = next((i for i, line in enumerate(lines) if "name" in line.lower()), 0)
    reader = csv.DictReader(io.StringIO("\n".join(lines[start:])))
    out = []
    for row in reader:
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        name = row.get("name") or " ".join(p for p in (row.get("first name"), row.get("last name")) if p)
        if not name:
            continue
        out.append({
            "name": name, "company": row.get("company", ""), "position": row.get("position", "") or row.get("title", ""),
            "email": row.get("email address", "") or row.get("email", ""),
            "profile_url": row.get("url", "") or row.get("profile url", ""),
            "school": row.get("school", ""), "relationship": (row.get("relationship") or "connection").lower(),
        })
    return out


def import_connections(db, client_id: str, rows: list[dict], school: str = "") -> int:
    existing = {(c.name.lower(), (c.company or "").lower()) for c in
                db.query(Connection).filter(Connection.client_id == client_id).all()}
    added = 0
    for row in rows[:20000]:
        key = (row["name"].lower(), (row.get("company") or "").lower())
        if key in existing:
            continue
        relationship = row.get("relationship") or "connection"
        if school and row.get("school") and school.lower() in row["school"].lower():
            relationship = "alumni"
        if relationship not in {"connection", "alumni", "colleague"}:
            relationship = "connection"
        db.add(Connection(client_id=client_id, name=row["name"][:200], company=(row.get("company") or "")[:200],
                          position=(row.get("position") or "")[:200], email=(row.get("email") or "")[:200],
                          profile_url=(row.get("profile_url") or "")[:500], school=(row.get("school") or "")[:200],
                          relationship=relationship))
        existing.add(key)
        added += 1
    db.commit()
    return added
