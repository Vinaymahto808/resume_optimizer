"""Tests for the multi-domain career knowledge base (app/career/kb).

LLM and Pinecone keys are cleared, so retrieval runs on the local store and
answers come from the extractive fallback; the LangGraph flow itself still runs."""
import os

os.environ["JOB_INGEST_ENABLED"] = "0"

import pytest

from app.career import tools
from app.career.kb import content, rag, service, store
from app.career.skills import extract_skills
from tests.test_career import H, client  # noqa: F401  (shared isolated-DB fixture)

NETWORK_RESUME = """Ravi Kumar
Network Engineer - Infra Corp (2020 - Present)
• Configured OSPF and BGP across 40 Cisco routers and managed VLAN, STP and EtherChannel on campus switches
• Deployed Palo Alto firewalls and IPsec site-to-site VPNs; automated config backups with Python and Netmiko
Skills: CCNA, Cisco IOS, subnetting, DHCP, DNS, Wireshark, Python
"""


@pytest.fixture(autouse=True)
def _no_keys(monkeypatch):
    for key in ("GROQ_API_KEY", "OPENAI_API_KEY", "PINECONE_API_KEY"):
        monkeypatch.setattr(f"app.config.settings.{key}", "", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    store.reset_store()
    yield
    store.reset_store()


def test_every_domain_file_is_valid_and_chunked():
    domains = content.domains()
    assert {"network_engineer", "fullstack_developer", "backend_developer", "java_developer", "aws_cloud_engineer",
            "crm_developer", "ai_engineer", "ml_engineer", "system_design"} <= set(domains)
    chunks = content.chunks()
    ids = [c["id"] for c in chunks]
    assert len(ids) == len(set(ids))
    for did in domains:
        kinds = {c["kind"] for c in chunks if c["domain"] == did}
        assert {"overview", "roadmap", "interview", "concept", "certifications"} <= kinds


def test_validate_rejects_bad_terms():
    bad = dict(content.domains()["network_engineer"])
    bad["titles"] = ["Network Engineer", "noc engineer", "network admin"]
    with pytest.raises(content.ContentError):
        content.validate(bad)


@pytest.mark.parametrize("text,expected", [
    (NETWORK_RESUME, "network_engineer"),
    ("Salesforce developer building Apex triggers, LWC and SOQL; Sales Cloud and Service Cloud", "crm_developer"),
    ("LLM engineer: RAG over company docs with LangGraph, Pinecone, embeddings and the OpenAI API", "ai_engineer"),
    ("Java 21 and Spring Boot microservices with Hibernate, JPA, Maven and JUnit", "java_developer"),
    ("AWS: VPC design, IAM least privilege, EKS, Terraform, CloudFormation and CloudWatch alarms", "aws_cloud_engineer"),
])
def test_detects_domain(text, expected):
    assert service.best_domain(text) == expected


def test_no_domain_for_unrelated_text():
    assert service.best_domain("Pastry chef with 8 years of French baking experience") is None


def test_skill_gap_marks_roadmap_and_next_skills():
    gap = service.skill_gap("network_engineer", NETWORK_RESUME)
    assert 0 < gap["coverage"] <= 100
    assert "ospf" in gap["skills"]["core"]["have"]
    statuses = [s["status"] for s in gap["roadmap"]]
    assert statuses.count("current") <= 1 and set(statuses) <= {"done", "current", "todo"}
    assert all(s not in gap["skills"]["core"]["have"] for s in gap["next_skills"])
    empty = service.skill_gap("network_engineer", "")
    assert empty["coverage"] == 0 and empty["roadmap"][0]["status"] == "current"


def test_interview_bank_filters():
    seniors = service.interview_bank("system_design", level="senior")
    assert seniors and all(q["level"] == "senior" for q in seniors)
    assert len(service.interview_bank("ai_engineer", limit=3)) == 3


def test_kb_terms_extend_skill_extraction():
    found = extract_skills("Built Apex triggers and LWC components; tuned OSPF and BGP; regression testing")
    assert {"apex", "lwc", "ospf", "bgp"} <= set(found)
    assert "regression" not in found   # too generic to count as a skill


def test_rag_answers_from_the_right_domain_with_sources():
    result = rag.ask("What is the difference between OSPF and BGP?")
    assert result["domain"]["id"] == "network_engineer"
    assert result["engine"] == "extractive" and result["store"] == "local"
    assert result["orchestrator"] in {"langgraph", "sequential"}
    assert result["sources"] and all(s["domain"] == "network_engineer" for s in result["sources"])
    assert any("bgp" in s["title"].lower() or "ospf" in s["title"].lower() for s in result["sources"])


def test_rag_broadens_when_domain_has_nothing_relevant():
    result = rag.ask("How should I shard a database and pick a partition key?", domain="crm_developer")
    assert result["sources"]
    assert any(s["domain"] != "crm_developer" for s in result["sources"])


def test_rag_sequential_matches_graph(monkeypatch):
    monkeypatch.setattr(rag, "_graph", None)
    monkeypatch.setattr(rag, "_graph_built", True)
    result = rag.ask("How do I become a Salesforce developer?")
    assert result["orchestrator"] == "sequential"
    assert result["domain"]["id"] == "crm_developer" and result["sources"]


def test_interview_questions_use_domain_bank():
    job = "Network Engineer. Must know OSPF, BGP, VLANs, STP, Cisco IOS and Palo Alto firewalls."
    out = tools.interview_questions(job, "Network Engineer", "Acme")
    assert out["domain"] == "network_engineer"
    technical = [q for q in out["questions"] if q["type"] == "technical"]
    assert technical and technical[0]["answer_tips"][0].startswith("Model answer:")


def test_tailor_reports_domain_keywords():
    job = "Salesforce Developer: Apex, Lightning Web Components, SOQL, Salesforce Flow, Sales Cloud integrations."
    resume = "Salesforce admin. Built Salesforce Flow automations and reports.\n• Built Flow automations for Sales Cloud"
    out = tools.tailor_resume(resume, job, "Salesforce Developer", "Acme")
    assert out["domain"]["id"] == "crm_developer"
    assert "apex" in out["domain"]["keywords_missing"]


# ------------------------------------------------------------------ API ----

def test_api_domains_and_detail(client):
    r = client.get("/api/career/kb/domains")
    assert r.status_code == 200 and len(r.json()["domains"]) >= 9
    r = client.get("/api/career/kb/domains/aws_cloud_engineer")
    assert r.status_code == 200 and r.json()["certifications"]
    assert client.get("/api/career/kb/domains/nope").status_code == 404


def test_api_gap_detects_from_resume(client):
    r = client.post("/api/career/kb/gap", headers=H, json={"resume_text": NETWORK_RESUME})
    assert r.status_code == 200
    body = r.json()
    assert body["domain"]["id"] == "network_engineer" and body["detected"][0]["id"] == "network_engineer"
    r = client.post("/api/career/kb/gap", headers=H, json={})
    assert r.status_code == 400


def test_api_interview(client):
    r = client.get("/api/career/kb/interview?domain=java_developer&level=senior&limit=5")
    assert r.status_code == 200 and all(q["level"] == "senior" for q in r.json()["questions"])


def test_api_ask_and_free_cap(client, monkeypatch):
    from app.career.kb import routes
    monkeypatch.setattr(routes, "FREE_DAILY_QUESTIONS", 2)
    for _ in range(2):
        r = client.post("/api/career/kb/ask", headers=H, json={"question": "Explain consistent hashing"})
        assert r.status_code == 200 and r.json()["sources"]
    r = client.post("/api/career/kb/ask", headers=H, json={"question": "Explain consistent hashing"})
    assert r.status_code == 402
    # Knowledge questions don't spend AI credits.
    assert client.get("/api/career/me", headers=H).json()["plan"]["credits_used"] == 0


def test_sage_answers_concepts_and_roadmaps(client):
    client.put("/api/career/me", headers=H, json={"full_name": "Ravi", "resume_text": NETWORK_RESUME})
    r = client.post("/api/career/copilot/chat", headers=H, json={"message": "What is the difference between OSPF and BGP?"})
    assert r.status_code == 200
    body = r.json()
    assert body["tool_calls"][0]["tool"] == "career_knowledge" and "Sources" in body["reply"]
    r = client.post("/api/career/copilot/chat", headers=H, json={"message": "Give me a roadmap to grow as a network engineer"})
    assert r.json()["tool_calls"][0]["tool"] == "skill_roadmap" and "%" in r.json()["reply"]
    r = client.post("/api/career/copilot/chat", headers=H, json={"message": "Practice interview questions for network engineer"})
    assert r.json()["tool_calls"][0]["tool"] == "interview_prep" and "Network Engineer" in r.json()["reply"]
