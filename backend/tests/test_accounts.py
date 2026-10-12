"""Login ↔ career profile mapping, extension pairing tokens, admin access and the column migration."""
import os

os.environ["JOB_INGEST_ENABLED"] = "0"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.career import vectors
from app.database import Base, get_db
import main  # noqa: E402  (registers every model on Base before create_all)

PASSWORD = "Str0ng!Passw0rd#"
ANON = {"X-Client-Id": "pytest-anon-0001"}


@pytest.fixture()
def client(monkeypatch):
    for key in ("ADMIN_TOKEN", "ADMIN_EMAILS", "UPI_ID"):
        monkeypatch.delenv(key, raising=False)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def _db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    vectors.job_index.invalidate()
    main.app.dependency_overrides[get_db] = _db
    with TestClient(main.app) as c:
        yield c
    main.app.dependency_overrides.pop(get_db, None)


def _signup(client, email="jane@example.com", name="Jane Doe"):
    r = client.post("/api/auth/register", json={"email": email, "password": PASSWORD, "full_name": name})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"Authorization": f"Bearer {data['access_token']}"}, data["user"]


def test_login_maps_to_own_career_profile(client):
    auth, user = _signup(client)
    me = client.get("/api/career/me", headers=auth).json()
    assert me["client_id"] == f"u_{user['id']}"
    assert me["email"] == "jane@example.com" and me["full_name"] == "Jane Doe"
    client.post("/api/career/applications", headers=auth, json={"role": "ML Engineer", "company": "Acme"})
    # Same browser, logged out: a different (anonymous) profile with no access to the account's data.
    assert client.get("/api/career/applications", headers=ANON).json()["applications"] == []
    assert len(client.get("/api/career/applications", headers=auth).json()["applications"]) == 1
    # The JWT wins over a client id sent alongside it.
    assert client.get("/api/career/me", headers={**auth, **ANON}).json()["client_id"] == f"u_{user['id']}"


def test_account_ids_cannot_be_claimed_anonymously(client):
    _, user = _signup(client)
    r = client.get("/api/career/me", headers={"X-Client-Id": f"u_{user['id']}"})
    assert r.status_code == 401


def test_invalid_token_is_rejected_not_downgraded(client):
    r = client.get("/api/career/me", headers={"Authorization": "Bearer not-a-jwt", **ANON})
    assert r.status_code == 401
    assert client.get("/api/career/me", headers={"Authorization": "Basic abc"}).status_code == 401


def test_extension_pairing_token_lifecycle(client):
    auth, user = _signup(client)
    assert client.get("/api/career/extension/token", headers=auth).json() == {"active": False}
    issued = client.post("/api/career/extension/token", headers=auth).json()
    token = issued["token"]
    assert token.startswith("pox_") and issued["active"] and issued["hint"] == token[-4:]
    ext = {"X-Extension-Token": token}
    assert client.get("/api/career/me", headers=ext).json()["client_id"] == f"u_{user['id']}"
    assert client.get("/api/career/autofill/profile", headers=ext).status_code == 200
    # The extension itself can't mint or revoke codes.
    assert client.post("/api/career/extension/token", headers=ext).status_code == 403
    # Rotating revokes the old code.
    newer = client.post("/api/career/extension/token", headers=auth).json()["token"]
    assert client.get("/api/career/me", headers=ext).status_code == 401
    assert client.get("/api/career/me", headers={"X-Extension-Token": newer}).status_code == 200
    assert client.delete("/api/career/extension/token", headers=auth).json()["revoked"] == 1
    assert client.get("/api/career/me", headers={"X-Extension-Token": newer}).status_code == 401


def test_anonymous_browser_can_pair_extension(client):
    token = client.post("/api/career/extension/token", headers=ANON).json()["token"]
    assert client.get("/api/career/me", headers={"X-Extension-Token": token}).json()["client_id"] == ANON["X-Client-Id"]


def test_admin_requires_admin_user(client):
    assert client.get("/api/career/admin/users").status_code == 401
    auth, _ = _signup(client)
    assert client.get("/api/career/admin/users", headers=auth).status_code == 403
    assert client.get("/api/career/admin/payments", headers=auth).status_code == 403
    assert client.get("/api/auth/me", headers=auth).json()["is_admin"] is False


def test_admin_bootstrap_and_actions(client, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "Boss@Example.com")
    admin, admin_user = _signup(client, email="boss@example.com", name="Boss")
    member, member_user = _signup(client, email="member@example.com", name="Member")
    assert client.get("/api/auth/me", headers=admin).json()["is_admin"] is True
    assert client.get("/api/auth/me", headers=member).json()["is_admin"] is False

    users = client.get("/api/career/admin/users?q=member", headers=admin).json()
    assert users["total"] == 1 and users["users"][0]["email"] == "member@example.com"
    assert client.get("/api/career/admin/payments", headers=admin).status_code == 200
    assert client.get("/api/career/admin/system", headers=admin).json()["users"] == 2

    # Plan override for an account that never opened the career features.
    r = client.patch(f"/api/career/admin/profiles/u_{member_user['id']}/plan", headers=admin,
                     json={"plan": "turbo", "days": 90})
    assert r.status_code == 200 and r.json()["plan"] == "turbo"
    assert client.get("/api/career/me", headers=member).json()["plan"]["plan"] == "turbo"
    client.patch(f"/api/career/admin/profiles/u_{member_user['id']}/plan", headers=admin, json={"plan": "free"})
    assert client.get("/api/career/me", headers=member).json()["plan"]["plan"] == "free"
    assert client.patch("/api/career/admin/profiles/nobody-here-1234/plan", headers=admin,
                        json={"plan": "turbo"}).status_code == 404

    # Promote, then the new admin can act; nobody can demote themselves.
    assert client.patch(f"/api/career/admin/users/{member_user['id']}", headers=admin,
                        json={"is_admin": True}).json()["is_admin"] is True
    assert client.get("/api/career/admin/users", headers=member).status_code == 200
    assert client.patch(f"/api/career/admin/users/{admin_user['id']}", headers=admin,
                        json={"is_admin": False}).status_code == 400


def test_admin_token_fallback(client, monkeypatch):
    assert client.get("/api/career/admin/users", headers={"X-Admin-Token": "x"}).status_code == 503
    monkeypatch.setenv("ADMIN_TOKEN", "fallback-token-123")
    assert client.get("/api/career/admin/users", headers={"X-Admin-Token": "wrong"}).status_code == 401
    assert client.get("/api/career/admin/users", headers={"X-Admin-Token": "fallback-token-123"}).status_code == 200


def test_ensure_columns_adds_is_admin_once(tmp_path):
    from app.career.migrations import ensure_columns
    engine = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE users (id VARCHAR PRIMARY KEY, email VARCHAR, hashed_password VARCHAR)"))
        conn.execute(text("INSERT INTO users VALUES ('1', 'a@b.c', 'x')"))
    assert ensure_columns(engine) == ["users.is_admin"]
    assert ensure_columns(engine) == []
    assert "is_admin" in {c["name"] for c in inspect(engine).get_columns("users")}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT is_admin FROM users")).scalar() == 0


def test_turbo_unlocks_unlimited_scans(client, monkeypatch, tmp_path):
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path), raising=False)
    monkeypatch.setattr("app.v1_routes.task_manager.start_processing", lambda *a, **k: None)  # no background scan
    auth, _ = _signup(client, email="scanner@example.com")
    doc = ("resume.txt", b"Jane Doe\njane@example.com\nExperience\nAnalyst 2020 - Present\nSkills\nSQL, Excel\n", "text/plain")
    assert client.post("/api/v1/upload", headers=auth, files={"file": doc}).status_code == 200
    blocked = client.post("/api/v1/upload", headers=auth, files={"file": doc})
    assert blocked.status_code == 403 and "Turbo" in blocked.json()["detail"]
    assert client.post("/api/career/plan/upgrade", headers=auth, json={}).json()["plan"] == "turbo"
    assert client.post("/api/v1/upload", headers=auth, files={"file": doc}).status_code == 200


def test_fast_scan_result_still_links_to_resume(client, monkeypatch, tmp_path):
    """Regression: the scan used to start before the resume row existed, so a fast scan lost its resume_id."""
    from app.task_manager import task_manager
    monkeypatch.setattr("app.config.settings.UPLOAD_DIR", str(tmp_path), raising=False)
    # Run the scan synchronously, i.e. the fastest possible finish.
    monkeypatch.setattr("app.v1_routes.task_manager.start_processing", lambda tid, fn: fn(task_manager.get_task(tid)))
    monkeypatch.setattr("app.database.SessionLocal", lambda: (_ for _ in ()).throw(RuntimeError("no db in test")))
    auth, _ = _signup(client, email="fastscan@example.com")
    doc = ("resume.txt", b"Jane Doe\njane@example.com\nExperience\nAnalyst 2020 - Present\nSkills\nSQL, Excel\n", "text/plain")
    task_id = client.post("/api/v1/upload", headers=auth, files={"file": doc}).json()["task_id"]
    status = client.get(f"/api/v1/scan/{task_id}/status").json()
    assert status["status"] == "completed" and status["result"]["resume_id"]
    listed = client.get("/api/resumes/", headers=auth).json()
    assert status["result"]["resume_id"] in [r["id"] for r in listed]
