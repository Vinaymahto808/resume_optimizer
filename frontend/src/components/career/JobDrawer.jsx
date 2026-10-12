import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { career, apiError } from "../../api";
import { usePlan } from "../../contexts/PlanContext";
import { Bar, CopyButton, Cost, Drawer, ErrorNote, Loading, MatchRing, Note, Pill, Spinner, Tabs } from "./ui";
import { downloadText, fmtDate } from "./format";
import TailorReview from "./TailorReview";

const salary = (j) =>
  j.salary_min && j.salary_max ? `$${Math.round(j.salary_min / 1000)}k – $${Math.round(j.salary_max / 1000)}k`
    : j.salary_min || j.salary_max ? `$${Math.round((j.salary_min || j.salary_max) / 1000)}k` : null;

function MatchPanel({ job, onDeep }) {
  const m = job.match;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (!m) return <Note tone="info">Add your resume in the <Link to="/resume-editor">Resume editor</Link> to see your match score.</Note>;
  const deep = async () => {
    setBusy(true);
    setError(null);
    try {
      onDeep(await career.deepMatch(job.id));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cp-stack">
      <div className="cp-grid-2">
        <Bar label="Skills" value={m.breakdown.skills} />
        <Bar label="Experience fit" value={m.breakdown.semantic} />
        <Bar label="Title" value={m.breakdown.title} />
        <Bar label="Preferences" value={m.breakdown.preferences} />
      </div>
      {m.sponsorship_blocked && <Note tone="warn">This posting says it can't sponsor visas, and your profile says you need sponsorship.</Note>}
      {m.reasons?.length > 0 && <ul className="cp-small" style={{ margin: 0, paddingLeft: 18 }}>{m.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      {m.matched_skills?.length > 0 && (
        <div><div className="cp-label">Skills you have</div><div className="cp-row">{m.matched_skills.map((s) => <Pill key={s} tone="green">{s}</Pill>)}</div></div>
      )}
      {m.missing_skills?.length > 0 && (
        <div><div className="cp-label">Skills the job asks for that aren't on your resume</div><div className="cp-row">{m.missing_skills.map((s) => <Pill key={s} tone="amber">{s}</Pill>)}</div></div>
      )}
      {m.deep ? (
        <div className="cp-card cp-card-tight cp-stack" style={{ gap: 8 }}>
          <div className="cp-eyebrow">AI deep match</div>
          {m.deep.summary && <p className="cp-small" style={{ margin: 0 }}>{m.deep.summary}</p>}
          {m.deep.strengths?.length > 0 && <div className="cp-small"><strong>Strengths:</strong> {m.deep.strengths.join("; ")}</div>}
          {m.deep.gaps?.length > 0 && <div className="cp-small"><strong>Gaps:</strong> {m.deep.gaps.join("; ")}</div>}
          {m.deep.advice?.length > 0 && <div className="cp-small"><strong>Advice:</strong> {m.deep.advice.join("; ")}</div>}
        </div>
      ) : (
        <button className="btn-secondary" onClick={deep} disabled={busy} style={{ alignSelf: "flex-start" }}>
          {busy ? <Spinner /> : <>Run AI deep match<Cost /></>}
        </button>
      )}
      <ErrorNote message={error} />
    </div>
  );
}

function CoverLetterPanel({ job, applicationId }) {
  const [tone, setTone] = useState("professional");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await career.coverLetter({ job_id: job.id, tone, application_id: applicationId || undefined }));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cp-stack">
      <div className="cp-row">
        <select value={tone} onChange={(e) => setTone(e.target.value)} style={{ width: "auto" }} aria-label="Tone">
          <option value="professional">Professional</option>
          <option value="enthusiastic">Enthusiastic</option>
          <option value="concise">Concise</option>
        </select>
        <button className="btn-primary" onClick={run} disabled={busy}>{busy ? <Spinner /> : <>{result ? "Regenerate" : "Write cover letter"}<Cost /></>}</button>
      </div>
      <ErrorNote message={error} />
      {result && (
        <>
          <textarea className="sr-textarea" rows={14} value={result.cover_letter}
            onChange={(e) => setResult({ ...result, cover_letter: e.target.value })} />
          <div className="cp-row">
            <CopyButton text={result.cover_letter} />
            <button className="btn-secondary cp-btn-sm" onClick={() => downloadText(`Cover_Letter_${job.company}.txt`, result.cover_letter)}>Download</button>
            <span className="cp-muted">Built only from your resume. Edit before sending.</span>
          </div>
        </>
      )}
    </div>
  );
}

function InsidersPanel({ job }) {
  const { openPaywall } = usePlan();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  useEffect(() => {
    career.insiders(job.id).then(setData).catch((e) => setError(apiError(e)));
  }, [job.id]);
  const draft = async (c) => {
    setBusyId(c.id);
    setError(null);
    try {
      const r = await career.referralMessage(c.id, job.id);
      setDrafts((d) => ({ ...d, [c.id]: r.message }));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusyId(null);
    }
  };
  if (!data) return error ? <ErrorNote message={error} /> : <Loading />;
  if (!data.count) {
    return <Note tone="info">You don't have imported connections at {data.company}. Import your LinkedIn Connections.csv in <Link to="/account">Account</Link>.</Note>;
  }
  if (data.locked) {
    return (
      <div className="cp-stack">
        <Note tone="info">You know <strong>{data.count}</strong> {data.count === 1 ? "person" : "people"} at {data.company}.</Note>
        <button className="btn-primary" onClick={() => openPaywall("Insider Connections are a Turbo feature.")}>Upgrade to see who</button>
      </div>
    );
  }
  return (
    <div className="cp-stack">
      {data.insiders.map((c) => (
        <div key={c.id} className="cp-card cp-card-tight cp-stack" style={{ gap: 8 }}>
          <div className="cp-between">
            <div>
              <strong style={{ color: "var(--text-heading)" }}>{c.name}</strong>
              <div className="cp-small">{c.position || "Employee"} · {c.relationship}</div>
            </div>
            <div className="cp-row">
              {c.profile_url && <a className="btn-secondary cp-btn-sm" href={c.profile_url} target="_blank" rel="noreferrer">Profile</a>}
              <button className="btn-primary cp-btn-sm" onClick={() => draft(c)} disabled={busyId === c.id}>
                {busyId === c.id ? <Spinner /> : <>Referral message<Cost /></>}
              </button>
            </div>
          </div>
          {drafts[c.id] && (
            <>
              <textarea className="sr-textarea" rows={6} value={drafts[c.id]} onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))} />
              <CopyButton text={drafts[c.id]} />
            </>
          )}
        </div>
      ))}
      <ErrorNote message={error} />
    </div>
  );
}

function ApplyPanel({ job, onApplied }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await career.autoApply(job.id);
      setResult(r);
      if (r.application) onApplied?.(r.application);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cp-stack">
      <p className="cp-small" style={{ margin: 0 }}>
        The agent checks your match, tailors your resume, writes a cover letter and prepares an autofill packet.
        Nothing is submitted: you review it and submit, or let the Chrome extension fill the form.
      </p>
      {!result && <button className="btn-primary" onClick={run} disabled={busy}>{busy ? <Spinner /> : <>Prepare application<Cost /></>}</button>}
      <ErrorNote message={error} />
      {result && (
        <>
          <ol className="cp-small" style={{ margin: 0, paddingLeft: 18 }}>
            {result.steps.map((s, i) => <li key={i}><strong>{s.step.replace(/_/g, " ")}</strong> · {s.status}{s.detail ? `: ${s.detail}` : ""}</li>)}
          </ol>
          {result.status === "ready" ? (
            <>
              <Note tone="info">Packet ready and saved in your <Link to="/tracker">tracker</Link>. Review it, then open the posting to submit.</Note>
              <div className="cp-row">
                {job.url && <a className="btn-primary" href={job.url} target="_blank" rel="noreferrer">Open posting to submit</a>}
                {result.cover_letter && <button className="btn-secondary" onClick={() => downloadText(`Cover_Letter_${job.company}.txt`, result.cover_letter)}>Download cover letter</button>}
                {result.tailored?.tailored_resume && <button className="btn-secondary" onClick={() => downloadText(`Resume_${job.company}.txt`, result.tailored.tailored_resume)}>Download tailored resume</button>}
              </div>
            </>
          ) : <Note tone="warn">Skipped: {result.steps[result.steps.length - 1]?.detail}</Note>}
        </>
      )}
    </div>
  );
}

function TailorPanel({ job }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await career.tailor({ job_id: job.id }));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="cp-stack">
      {!result && (
        <>
          <p className="cp-small" style={{ margin: 0 }}>Rewrites your bullets for this job using only experience already on your resume.</p>
          <button className="btn-primary" onClick={run} disabled={busy} style={{ alignSelf: "flex-start" }}>{busy ? <Spinner /> : <>Tailor my resume<Cost /></>}</button>
        </>
      )}
      <ErrorNote message={error} />
      {result && <TailorReview result={result} />}
    </div>
  );
}

const TABS = [
  { id: "match", label: "Match" },
  { id: "tailor", label: "Tailor resume" },
  { id: "letter", label: "Cover letter" },
  { id: "insiders", label: "Insiders" },
  { id: "apply", label: "Apply" },
  { id: "about", label: "Description" },
];

/** Job detail drawer: match breakdown and every per-job AI action. */
export default function JobDrawer({ jobId, onClose, onChanged }) {
  const [job, setJob] = useState(null);
  const [tab, setTab] = useState("match");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    career.job(jobId).then((j) => !cancelled && setJob(j)).catch((e) => !cancelled && setError(apiError(e)));
    return () => { cancelled = true; };
  }, [jobId]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await career.decide(job.id, "like");
      setJob({ ...job, decision: "like", application_id: r.application?.id || job.application_id });
      onChanged?.();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer title={job ? job.title : "Job"} onClose={onClose}>
      {!job ? (error ? <ErrorNote message={error} /> : <Loading />) : (
        <>
          <div className="cp-job-card">
            {job.match && <MatchRing score={job.match.score} size={68} label={job.match.label} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 className="cp-job-title" style={{ fontSize: 18 }}>{job.title}</h2>
              <p className="cp-job-meta">{job.company} · {job.location || "Remote"}{job.posted_at ? ` · posted ${fmtDate(job.posted_at)}` : ""}</p>
              <div className="cp-row" style={{ marginTop: 8 }}>
                {job.remote && <Pill tone="accent">Remote</Pill>}
                {job.h1b_sponsor && <Pill tone="purple" title={`Signal: ${job.h1b_signal}`}>H-1B</Pill>}
                {job.verified ? <Pill tone="green">Verified</Pill> : <Pill tone="red" title={job.verification_flags.join(", ")}>Unverified</Pill>}
                {salary(job) && <Pill>{salary(job)}</Pill>}
                {job.ats_platform && <Pill>{job.ats_platform}</Pill>}
              </div>
            </div>
          </div>
          {!job.verified && job.verification_flags?.length > 0 && <Note tone="warn">Be careful: {job.verification_flags.join(", ")}.</Note>}
          <div className="cp-row">
            {job.decision === "like" || job.application_id
              ? <Link className="btn-secondary" to="/tracker">Saved in tracker ✓</Link>
              : <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : "Save to tracker"}</button>}
            {job.url && <a className="btn-secondary" href={job.url} target="_blank" rel="noreferrer">Open posting ↗</a>}
          </div>
          <ErrorNote message={error} />
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
          {tab === "match" && <MatchPanel job={job} onDeep={(m) => setJob({ ...job, match: m })} />}
          {tab === "tailor" && <TailorPanel job={job} />}
          {tab === "letter" && <CoverLetterPanel job={job} applicationId={job.application_id} />}
          {tab === "insiders" && <InsidersPanel job={job} />}
          {tab === "apply" && <ApplyPanel job={job} onApplied={(a) => { setJob({ ...job, application_id: a.id }); onChanged?.(); }} />}
          {tab === "about" && <div className="cp-desc">{job.description || job.snippet}</div>}
        </>
      )}
    </Drawer>
  );
}
