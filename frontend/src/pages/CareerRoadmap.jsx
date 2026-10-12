import { useEffect, useRef, useState } from "react";
import SEO from "../components/SEO";
import { career, apiError } from "../api";
import { AdHorizontal } from "../components/AdBanner";
import { CopyButton, EmptyState, ErrorNote, Loading, Markdown, MatchRing, Note, Pill, Spinner, Tabs } from "../components/career/ui";

const STATUS = { done: ["green", "Done"], current: ["accent", "You are here"], todo: ["slate", "Up next"] };
const LEVELS = [{ id: "", label: "All levels" }, { id: "junior", label: "Junior" }, { id: "mid", label: "Mid" }, { id: "senior", label: "Senior" }];
const SUGGESTED = {
  network_engineer: ["What is the difference between OSPF and BGP?", "How do I troubleshoot a VLAN that can't reach the gateway?"],
  fullstack_developer: ["SSR vs CSR vs SSG: when do I use each?", "How do JWTs compare with session cookies?"],
  backend_developer: ["How do idempotency keys work?", "Explain database isolation levels"],
  java_developer: ["How does HashMap work internally?", "When should I use virtual threads?"],
  aws_cloud_engineer: ["Security groups vs NACLs?", "How do I design a highly available web app on AWS?"],
  crm_developer: ["What are governor limits and how do I bulkify Apex?", "When should I use Flow instead of Apex?"],
  ai_engineer: ["How do I evaluate a RAG system?", "When should I use LangGraph instead of a simple chain?"],
  ml_engineer: ["How do I handle class imbalance?", "How do I detect data drift in production?"],
  system_design: ["Explain consistent hashing", "How would you design a rate limiter?"],
};

function SkillPills({ have, missing }) {
  return (
    <div className="cp-row" style={{ gap: 6 }}>
      {have.map((s) => <Pill key={s} tone="green" title="On your resume">✓ {s}</Pill>)}
      {missing.map((s) => <Pill key={s} tone="slate" title="Not on your resume yet">{s}</Pill>)}
    </div>
  );
}

function RoadmapView({ gap }) {
  return (
    <div className="cp-stack">
      <div className="cp-card kb-summary">
        <MatchRing score={gap.coverage} size={76} label="coverage" />
        <div className="cp-stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
          <div className="cp-row">
            <strong style={{ color: "var(--text-heading)", fontSize: 16 }}>{gap.domain.name}</strong>
            <Pill tone={gap.level === "strong" ? "green" : gap.level === "developing" ? "amber" : "slate"}>{gap.level}</Pill>
          </div>
          <p className="cp-small" style={{ margin: 0 }}>{gap.domain.summary}</p>
          {!gap.has_resume && <Note tone="warn">Add your resume in Profile to see which skills you already have.</Note>}
          {gap.next_skills.length > 0 && (
            <div className="cp-row" style={{ gap: 6 }}>
              <span className="cp-label" style={{ margin: 0 }}>Learn next:</span>
              {gap.next_skills.map((s) => <Pill key={s} tone="accent">{s}</Pill>)}
            </div>
          )}
        </div>
      </div>

      <div className="cp-card cp-stack">
        <h3 className="kb-h">Learning roadmap</h3>
        <ol className="kb-stages">
          {gap.roadmap.map((stage, i) => {
            const [tone, label] = STATUS[stage.status];
            return (
              <li key={stage.stage} className={`kb-stage kb-stage--${stage.status}`}>
                <div className="kb-stage-dot">{stage.status === "done" ? "✓" : i + 1}</div>
                <div className="cp-stack" style={{ gap: 8, minWidth: 0 }}>
                  <div className="cp-row">
                    <strong style={{ color: "var(--text-heading)" }}>{stage.stage}</strong>
                    <Pill tone={tone}>{label}</Pill>
                    <span className="cp-muted">~{stage.duration_weeks} weeks</span>
                  </div>
                  <ul className="kb-list">{stage.goals.map((g) => <li key={g}>{g}</li>)}</ul>
                  <SkillPills have={stage.skills_have} missing={stage.skills_missing} />
                  <div className="cp-small"><strong>Project:</strong> {stage.project}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <AdHorizontal />

      <div className="cp-card cp-stack">
        <h3 className="kb-h">Skills employers look for</h3>
        {[["core", "Core"], ["advanced", "Advanced"], ["tools", "Tools"]].map(([tier, label]) => (
          <div key={tier} className="cp-stack" style={{ gap: 6 }}>
            <span className="cp-label" style={{ margin: 0 }}>{label} · {gap.skills[tier].have.length}/{gap.skills[tier].have.length + gap.skills[tier].missing.length}</span>
            <SkillPills have={gap.skills[tier].have} missing={gap.skills[tier].missing} />
          </div>
        ))}
        {gap.ats_keywords_missing.length > 0 && (
          <Note tone="info">ATS keywords recruiters search for that your resume doesn't mention yet (add only ones you've used): {gap.ats_keywords_missing.join(", ")}</Note>
        )}
      </div>

      <div className="cp-grid-2">
        <div className="cp-card cp-stack">
          <h3 className="kb-h">Certifications</h3>
          {gap.certifications.map((c) => (
            <div key={c.name} className="cp-stack" style={{ gap: 2 }}>
              <div className="cp-row"><strong style={{ color: "var(--text-heading)", fontSize: 13 }}>{c.name}</strong><Pill>{c.level}</Pill></div>
              <span className="cp-muted">{c.provider} · {c.why}</span>
            </div>
          ))}
        </div>
        <div className="cp-card cp-stack">
          <h3 className="kb-h">Portfolio projects</h3>
          {gap.projects.map((p) => (
            <div key={p.name} className="cp-stack" style={{ gap: 2 }}>
              <strong style={{ color: "var(--text-heading)", fontSize: 13 }}>{p.name}</strong>
              <span className="cp-muted">{p.description}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cp-card cp-stack">
        <div className="cp-between">
          <h3 className="kb-h">Strong resume bullets for this field</h3>
          <CopyButton text={gap.resume_bullets.map((b) => `• ${b}`).join("\n")} label="Copy all" />
        </div>
        <ul className="kb-list">{gap.resume_bullets.map((b) => <li key={b}>{b}</li>)}</ul>
        <span className="cp-muted">Examples only: swap in your own projects and real numbers.</span>
      </div>
    </div>
  );
}

function InterviewView({ domain }) {
  const [level, setLevel] = useState("");
  const key = `${domain}|${level}`;
  // Loading until the stored result belongs to the current domain + level.
  const [result, setResult] = useState({ key: null, questions: [], error: null });
  useEffect(() => {
    let alive = true;
    career.kbInterview(domain, { level, limit: 30 })
      .then((r) => alive && setResult({ key, questions: r.questions, error: null }))
      .catch((err) => alive && setResult({ key, questions: [], error: apiError(err) }));
    return () => { alive = false; };
  }, [domain, level, key]);
  const state = { ...result, loading: result.key !== key };
  return (
    <div className="cp-stack">
      <Tabs tabs={LEVELS} value={level} onChange={setLevel} />
      <ErrorNote message={state.error} />
      {state.loading ? <Loading label="Loading questions" /> : state.questions.map((q, i) => (
        <details key={q.question} className="cp-card kb-q">
          <summary>
            <span className="kb-q-title">{i + 1}. {q.question}</span>
            <span className="cp-row" style={{ gap: 6 }}><Pill>{q.level}</Pill><Pill tone="purple">{q.topic}</Pill></span>
          </summary>
          <div className="cp-stack" style={{ gap: 8, marginTop: 12 }}>
            <p className="cp-small" style={{ margin: 0, lineHeight: 1.6 }}>{q.answer}</p>
            {q.follow_ups?.length > 0 && <span className="cp-muted">Likely follow-ups: {q.follow_ups.join(" · ")}</span>}
          </div>
        </details>
      ))}
      {!state.loading && !state.questions.length && !state.error && <EmptyState title="No questions at this level yet" />}
    </div>
  );
}

function AskView({ domain }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const ask = async (q) => {
    const text = (q ?? question).trim();
    if (text.length < 3) return;
    setQuestion(text);
    setBusy(true);
    setError(null);
    try {
      setResult(await career.kbAsk(text, domain));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cp-stack">
      <form className="cp-card cp-row" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={1000} placeholder="Ask anything: a concept, a comparison, how to prepare…" style={{ flex: 1, minWidth: 200 }} />
        <button className="btn-primary" type="submit" disabled={busy || question.trim().length < 3}>{busy ? <Spinner /> : "Ask"}</button>
      </form>
      {(SUGGESTED[domain] || []).length > 0 && (
        <div className="cp-row" style={{ gap: 6 }}>
          {SUGGESTED[domain].map((s) => <button key={s} type="button" className="btn-secondary cp-btn-sm" onClick={() => ask(s)} disabled={busy}>{s}</button>)}
        </div>
      )}
      <ErrorNote message={error} />
      {result && (
        <div className="cp-card cp-stack">
          <Markdown text={result.answer} />
          {result.sources.length > 0 && (
            <div className="cp-stack" style={{ gap: 4 }}>
              <span className="cp-label" style={{ margin: 0 }}>Sources</span>
              {result.sources.map((s) => <span key={s.id} className="cp-muted">[{s.n}] {s.title}</span>)}
            </div>
          )}
          <span className="cp-muted">
            Answered from our curated career notes{result.engine === "llm" ? ", written up by AI" : ""}.
          </span>
        </div>
      )}
      {!result && !busy && <EmptyState title="Ask the career knowledge base">Answers cite the notes they come from, so you can check them.</EmptyState>}
    </div>
  );
}

export default function CareerRoadmap() {
  const [domains, setDomains] = useState([]);
  const [domain, setDomain] = useState(null);
  const [detected, setDetected] = useState([]);
  const [gap, setGap] = useState(null);
  const [tab, setTab] = useState("roadmap");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // First load: list domains, then let the resume pick the starting domain.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await career.kbDomains();
        if (!alive) return;
        setDomains(list.domains);
        try {
          const g = await career.kbGap();
          if (!alive) return;
          setGap(g);
          setDomain(g.domain.id);
          setDetected(g.detected);
        } catch {
          // No resume (or nothing detected): wait for the user to pick a domain.
        }
      } catch (err) {
        if (alive) setError(apiError(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const pick = async (id) => {
    setDomain(id);
    if (gap?.domain.id === id) return;
    setLoading(true);
    setError(null);
    try {
      setGap(await career.kbGap(id));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Badge only clear fits: a strong score that is close to the best match (not a lone shared "python").
  const top = detected[0]?.score || 0;
  const detectedIds = new Set(detected.filter((d) => d.score >= 4 && d.score >= 0.6 * top).map((d) => d.id));
  const chipsRef = useRef(null);
  useEffect(() => {
    chipsRef.current?.querySelector(".kb-domain--active")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [domain, domains]);
  return (
    <div className="cp-page">
      <SEO title="Career Roadmap" description="Pick your field and get a skill-gap roadmap, certifications, interview questions and answers from a curated career knowledge base." canonical="https://www.profileotimizer.online/career-roadmap" />
      <div className="cp-page-head">
        <div>
          <div className="cp-eyebrow">Career knowledge base</div>
          <h1 className="cp-title">Your roadmap, field by field</h1>
          <p className="cp-sub">Skills, certifications, interview answers and concepts for {domains.length || 9} tech careers, checked against your resume.</p>
        </div>
        {domain && <Tabs tabs={[{ id: "roadmap", label: "Roadmap" }, { id: "interview", label: "Interview prep" }, { id: "ask", label: "Ask" }]} value={tab} onChange={setTab} />}
      </div>

      <div className="kb-domains" role="listbox" aria-label="Career domain" ref={chipsRef}>
        {domains.map((d) => (
          <button key={d.id} type="button" role="option" aria-selected={domain === d.id}
            className={`kb-domain${domain === d.id ? " kb-domain--active" : ""}`} onClick={() => pick(d.id)}>
            <span>{d.name}</span>
            {detectedIds.has(d.id) && <small>From your resume</small>}
          </button>
        ))}
      </div>

      <ErrorNote message={error} />
      {loading && <Loading label="Loading your roadmap" />}
      {!loading && !domain && !error && (
        <EmptyState title="Pick a field to start">Choose a career above. Add your resume in Profile and we'll pick the closest field for you.</EmptyState>
      )}
      {!loading && domain && tab === "roadmap" && gap && <RoadmapView gap={gap} />}
      {domain && tab === "interview" && <InterviewView domain={domain} />}
      {domain && tab === "ask" && <AskView domain={domain} />}
    </div>
  );
}
