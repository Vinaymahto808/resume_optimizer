import { useEffect, useRef, useState } from "react";
import SEO from "../components/SEO";
import { career, apiError } from "../api";
import { Cost, EmptyState, ErrorNote, Field, Loading, Markdown, MatchRing, Note, Pill, Spinner, Tabs } from "../components/career/ui";
import JobDrawer from "../components/career/JobDrawer";

const SUGGESTIONS = [
  "Find remote jobs that match my resume",
  "Which companies sponsor H-1B for my profile?",
  "What should I follow up on?",
  "What keywords is my resume missing?",
  "How do I negotiate a ₹25 LPA offer?",
  "Tell me about Stripe",
];
const k = (n) => `$${Math.round(n / 1000)}k`;

function InsightsCard({ data }) {
  const pay = data.salary?.overall;
  const facts = [
    ["Open roles", `${data.open_roles.count}${data.open_roles.remote ? ` (${data.open_roles.remote} remote)` : ""}`],
    ["Posted, 30 days", `${data.velocity.last_30_days} · ${data.velocity.trend}`],
    ["Typical pay", pay ? `${k(pay.median_low)} – ${k(pay.median_high)}` : "Not posted"],
    ["Insiders", data.insiders.count ? `${data.insiders.count}${data.insiders.locked ? " (Turbo)" : ""}` : "None yet"],
  ];
  return (
    <div className="cp-card cp-card-tight cp-stack" style={{ gap: 10 }}>
      <div className="cp-grid-4">
        {facts.map(([label, value]) => <div key={label} className="cp-stat"><div className="cp-stat-label">{label}</div><div style={{ fontWeight: 700, color: "var(--text-heading)" }}>{value}</div></div>)}
      </div>
      <div className="cp-small"><strong>H-1B:</strong> {data.h1b.verdict}</div>
      {data.skills.length > 0 && <div className="cp-row">{data.skills.slice(0, 10).map((s) => <Pill key={s.skill}>{s.skill}</Pill>)}</div>}
    </div>
  );
}

function JobStrip({ jobs, onOpen }) {
  if (!jobs?.length) return null;
  return (
    <div className="cp-hscroll">
      {jobs.map((j) => (
        <button key={j.id} type="button" className="cp-card cp-card-tight cp-card-click cp-mini-job cp-job-card" onClick={() => onOpen(j.id)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title}</div>
            <div className="cp-muted">{j.company}</div>
            <div className="cp-row" style={{ marginTop: 4 }}>{j.h1b_sponsor && <Pill tone="purple">H-1B</Pill>}{j.remote && <Pill tone="accent">Remote</Pill>}</div>
          </div>
          {j.match && <MatchRing score={j.match.score} size={40} />}
        </button>
      ))}
    </div>
  );
}

function ToolCards({ calls, onOpen }) {
  const search = calls?.find((c) => c.tool === "search_jobs");
  const insights = calls?.find((c) => c.tool === "company_insights")?.result;
  return (
    <>
      {insights?.open_roles && <InsightsCard data={insights} />}
      <JobStrip jobs={search?.result?.jobs || insights?.open_roles?.top} onOpen={onOpen} />
    </>
  );
}

function Chat({ onOpenJob }) {
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    career.chatHistory().then((r) => setMessages(r.messages)).catch(() => {}).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const send = async (text) => {
    const message = text.trim();
    if (!message || sending) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setSending(true);
    try {
      const turn = await career.chat(message);
      setMessages((m) => [...m, { role: "assistant", content: turn.reply, tool_calls: turn.tool_calls }]);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    await career.clearChat().catch(() => {});
    setMessages([]);
  };

  if (!loaded) return <Loading />;
  return (
    <div className="cp-card cp-stack">
      <div className="cp-chat">
        {messages.length === 0 && (
          <div className="cp-stack">
            <p className="cp-small" style={{ margin: 0 }}>Ask Sage about jobs, your pipeline, resume gaps, salary, referrals or a company.</p>
            <div className="cp-row">{SUGGESTIONS.map((s) => <button key={s} className="btn-secondary cp-btn-sm" onClick={() => send(s)}>{s}</button>)}</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`cp-bubble ${m.role === "user" ? "cp-bubble--user" : "cp-bubble--bot"}`}>
            {m.role === "user" ? m.content : (
              <div className="cp-stack" style={{ gap: 10 }}>
                <Markdown text={m.content} />
                <ToolCards calls={m.tool_calls} onOpen={onOpenJob} />
              </div>
            )}
          </div>
        ))}
        {sending && <div className="cp-bubble cp-bubble--bot"><Spinner /> <span className="cp-muted">Sage is thinking…</span></div>}
        <div ref={endRef} />
      </div>
      <ErrorNote message={error} />
      <form className="cp-row" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} placeholder="Ask Sage anything about your job search…" style={{ flex: 1, minWidth: 180 }} />
        <button className="btn-primary" type="submit" disabled={sending || !input.trim()}>Send</button>
        {messages.length > 0 && <button type="button" className="btn-secondary" onClick={clear}>Clear</button>}
      </form>
    </div>
  );
}

function InterviewPrep() {
  const [apps, setApps] = useState(null);
  const [jobId, setJobId] = useState("");
  const [jd, setJd] = useState("");
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    career.applications().then((r) => {
      const withJob = r.applications.filter((a) => a.job_id && a.stage !== "Rejected");
      setApps(withJob);
      if (withJob[0]) setJobId(withJob[0].job_id);
    }).catch(() => setApps([]));
  }, []);

  const generate = async () => {
    setBusy("q");
    setError(null);
    try {
      const r = await career.interviewQuestions(jobId ? { job_id: jobId } : { job_description: jd });
      setQuestions(r.questions);
      setAnswers({});
      setFeedback({});
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
    }
  };
  const review = async (i, q) => {
    setBusy(`f${i}`);
    setError(null);
    try {
      const role = apps.find((a) => a.job_id === jobId)?.role || "";
      const r = await career.interviewFeedback({ question: q.question, answer: answers[i] || "", title: role });
      setFeedback((f) => ({ ...f, [i]: r }));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
    }
  };

  if (!apps) return <Loading />;
  return (
    <div className="cp-stack">
      <div className="cp-card cp-stack">
        <Field label="Practice for a saved job">
          <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
            {apps.map((a) => <option key={a.id} value={a.job_id}>{a.role} · {a.company}</option>)}
            <option value="">Paste a job description instead</option>
          </select>
        </Field>
        {!jobId && (
          <Field label="Job description">
            <textarea className="sr-textarea" rows={6} maxLength={50000} value={jd} onChange={(e) => setJd(e.target.value)} />
          </Field>
        )}
        <button className="btn-primary" onClick={generate} disabled={busy !== "" || (!jobId && jd.trim().length < 30)} style={{ alignSelf: "flex-start" }}>
          {busy === "q" ? <Spinner /> : <>Generate questions<Cost /></>}
        </button>
        <ErrorNote message={error} />
      </div>
      {questions?.map((q, i) => (
        <div key={i} className="cp-card cp-stack" style={{ gap: 10 }}>
          <div className="cp-between">
            <strong style={{ color: "var(--text-heading)" }}>{i + 1}. {q.question}</strong>
            {q.type && <Pill>{q.type}</Pill>}
          </div>
          {q.why_asked && <span className="cp-muted">Why they ask: {q.why_asked}</span>}
          {q.answer_tips?.length > 0 && <span className="cp-muted">Tips: {q.answer_tips.join(" · ")}</span>}
          <textarea className="sr-textarea" rows={4} maxLength={6000} placeholder="Type your answer (use STAR: situation, task, action, result)"
            value={answers[i] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} />
          <button className="btn-secondary cp-btn-sm" style={{ alignSelf: "flex-start" }} disabled={busy !== "" || (answers[i] || "").trim().length < 20} onClick={() => review(i, q)}>
            {busy === `f${i}` ? <Spinner /> : <>Get feedback<Cost /></>}
          </button>
          {feedback[i] && (
            <Note tone="info">
              <strong>Score {feedback[i].score}/10.</strong>{" "}
              {feedback[i].strengths?.length > 0 && <>Strengths: {feedback[i].strengths.join("; ")}. </>}
              {feedback[i].improvements?.length > 0 && <>Improve: {feedback[i].improvements.join("; ")}.</>}
              {feedback[i].improved_answer && <><br /><br /><em>{feedback[i].improved_answer}</em></>}
            </Note>
          )}
        </div>
      ))}
    </div>
  );
}

function CompanyInsights({ onOpenJob }) {
  const [name, setName] = useState("");
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lookup = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setData(await career.companyInsights(name.trim()));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cp-stack">
      <form className="cp-card cp-row" onSubmit={lookup}>
        <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={200} required placeholder="Company name, e.g. Stripe" style={{ flex: 1, minWidth: 180 }} />
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? <Spinner /> : "Get insights"}</button>
      </form>
      <ErrorNote message={error} />
      {data && (
        <div className="cp-card cp-stack">
          <h3 className="cp-modal-title">{data.company}</h3>
          <p className="cp-small" style={{ margin: 0 }}>{data.summary}</p>
          <InsightsCard data={data} />
          {data.open_roles.top.length > 0 && <><div className="cp-label">Top open roles for you</div><JobStrip jobs={data.open_roles.top} onOpen={onOpenJob} /></>}
          <span className="cp-muted">Based only on postings we've indexed{data.engine === "llm" ? "; summary written by AI from those facts" : ""}.</span>
        </div>
      )}
      {!data && !busy && <EmptyState title="Research a company">Open roles, H-1B signal, pay bands, skills, hiring speed and who you know there.</EmptyState>}
    </div>
  );
}

export default function Orion() {
  const [tab, setTab] = useState("chat");
  const [jobId, setJobId] = useState(null);
  return (
    <div className="cp-page">
      <SEO title="Sage AI Coach" description="Your AI job-search copilot: jobs, pipeline, interview prep and company research." />
      <div className="cp-page-head">
        <div>
          <div className="cp-eyebrow">Sage AI Coach</div>
          <h1 className="cp-title">Your job-search copilot</h1>
          <p className="cp-sub">Answers use your resume, tracker and the jobs we index. Sage never invents jobs or experience.</p>
        </div>
        <Tabs tabs={[{ id: "chat", label: "Chat" }, { id: "interview", label: "Interview prep" }, { id: "company", label: "Company insights" }]} value={tab} onChange={setTab} />
      </div>
      {tab === "chat" && <Chat onOpenJob={setJobId} />}
      {tab === "interview" && <InterviewPrep />}
      {tab === "company" && <CompanyInsights onOpenJob={setJobId} />}
      {jobId && <JobDrawer jobId={jobId} onClose={() => setJobId(null)} />}
    </div>
  );
}
