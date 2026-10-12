import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { career, apiError } from "../api";
import { usePlan } from "../contexts/PlanContext";
import { Cost, EmptyState, ErrorNote, Field, Loading, Note, Pill, Spinner } from "../components/career/ui";
import { fmtDateTime } from "../components/career/format";
import JobDrawer from "../components/career/JobDrawer";

const STATUS = {
  queued: ["Queued", "slate"],
  prepared: ["Prepared", "accent"],
  needs_review: ["Needs review", "amber"],
  submitted: ["Submitted", "green"],
  failed: ["Failed", "red"],
};
const splitList = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);

function TaskRow({ task, onChanged, onOpenJob }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [label, tone] = STATUS[task.status] || [task.status, "slate"];
  const sending = task.status === "prepared" && task.submit_channel === "extension";
  const reviewable = task.status === "needs_review" || sending;

  const toggle = async () => {
    setOpen(!open);
    if (!open && !detail) {
      try { setDetail(await career.agentTask(task.id)); } catch (e) { setError(apiError(e)); }
    }
  };
  const resolve = async (outcome) => {
    setBusy(true);
    setError(null);
    try {
      setDetail(await career.resolveAgentTask(task.id, outcome));
      onChanged();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
      <button type="button" onClick={toggle} className="cp-between" style={{ width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: 14 }}>{task.job?.title || "Job"}</div>
          <div className="cp-small">{task.job?.company} · {task.match_score}% match{task.reason ? ` · ${task.reason}` : ""}</div>
        </div>
        <Pill tone={tone}>{sending ? "Sending in your browser" : label}</Pill>
      </button>
      {open && (
        <div className="cp-stack" style={{ marginTop: 10, gap: 8 }}>
          {!detail && !error && <Spinner />}
          {detail?.log && (
            <ol className="cp-small" style={{ margin: 0, paddingLeft: 18 }}>
              {detail.log.map((e, i) => (
                <li key={i}><span className="cp-muted">{fmtDateTime(e.at)}</span> <strong>{e.step.replace(/_/g, " ")}</strong> {e.status}{e.detail ? `: ${e.detail}` : ""}</li>
              ))}
            </ol>
          )}
          <ErrorNote message={error} />
          <div className="cp-row">
            {task.job && <button className="btn-secondary cp-btn-sm" onClick={() => onOpenJob(task.job_id)}>Review packet</button>}
            {task.job?.url && <a className="btn-secondary cp-btn-sm" href={task.job.url} target="_blank" rel="noreferrer">Open posting ↗</a>}
            {reviewable && (
              <>
                <button className="btn-primary cp-btn-sm" disabled={busy} onClick={() => resolve("submitted")}>I submitted it</button>
                <button className="btn-secondary cp-btn-sm" disabled={busy} onClick={() => resolve("failed")}>Dismiss</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Agent() {
  const { openPaywall } = usePlan();
  const [overview, setOverview] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [scope, setScope] = useState("today");
  const [roles, setRoles] = useState("");
  const [locations, setLocations] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);
  const [jobId, setJobId] = useState(null);

  const apply = (o) => {
    setOverview(o);
    setRoles(o.settings.roles.join(", "));
    setLocations(o.settings.locations.join(", "));
  };
  const loadTasks = useCallback(() => {
    career.agentTasks(scope).then((r) => setTasks(r.tasks)).catch((e) => setError(apiError(e)));
  }, [scope]);

  useEffect(() => {
    career.agent().then(apply).catch((e) => setError(apiError(e)));
  }, []);
  useEffect(loadTasks, [loadTasks]);

  const save = async (patch) => {
    setBusy("save");
    setError(null);
    try {
      apply(await career.updateAgent(patch));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
    }
  };
  const run = async () => {
    setBusy("run");
    setError(null);
    setNote(null);
    try {
      const r = await career.runAgent();
      apply(r);
      setNote(typeof r.stats.skipped === "string" ? r.stats.skipped : `Queued ${r.stats.queued ?? 0} new job(s).`);
      loadTasks();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
    }
  };

  if (!overview) return <div className="cp-page">{error ? <ErrorNote message={error} /> : <Loading />}</div>;
  const s = overview.settings;
  const counts = overview.today.by_status;

  return (
    <div className="cp-page">
      <SEO title="Background Agent" description="Let the agent find and prepare applications for jobs that fit your rules." />
      <div className="cp-page-head">
        <div>
          <div className="cp-eyebrow">Background Agent Mode</div>
          <h1 className="cp-title">Apply while you sleep</h1>
          <p className="cp-sub">Finds new jobs that fit your rules, tailors your resume and cover letter, and queues each application.</p>
        </div>
        {overview.turbo ? (
          <button className={s.enabled ? "btn-primary" : "btn-secondary"} disabled={busy !== ""} onClick={() => save({ enabled: !s.enabled })} aria-pressed={s.enabled}>
            {s.enabled ? "Agent is ON · turn off" : "Turn agent on"}
          </button>
        ) : (
          <button className="btn-primary" onClick={() => openPaywall("Background Agent Mode is a Turbo feature.")}>Upgrade to use the agent</button>
        )}
      </div>

      {overview.missing_answers.length > 0 && (
        <Note tone="warn">
          Every application will wait for your review until your profile has: {overview.missing_answers.join(", ")}.{" "}
          <Link to="/account">Add them in Account</Link>.
        </Note>
      )}

      <div className="cp-grid-5">
        {Object.entries(STATUS).map(([k, [label]]) => (
          <div key={k} className="cp-stat"><div className="cp-stat-value">{counts[k] ?? 0}</div><div className="cp-stat-label">{label}</div></div>
        ))}
      </div>
      <p className="cp-muted" style={{ margin: "-8px 0 0" }}>
        Today: {overview.today.total} of {s.daily_cap} · Last run {s.last_run_at ? fmtDateTime(s.last_run_at) : "never"}
      </p>

      <div className="cp-grid-2" style={{ alignItems: "start" }}>
        <div className="cp-card cp-stack">
          <div className="cp-eyebrow">Rules</div>
          <Field label={`Minimum match: ${s.min_match}%`}>
            <input type="range" min={0} max={100} step={5} defaultValue={s.min_match} key={s.min_match} style={{ padding: 0, accentColor: "var(--accent)" }}
              onPointerUp={(e) => save({ min_match: Number(e.currentTarget.value) })}
              onKeyUp={(e) => save({ min_match: Number(e.currentTarget.value) })} />
          </Field>
          <Field label="Roles (comma-separated title keywords)">
            <input value={roles} onChange={(e) => setRoles(e.target.value)} onBlur={() => save({ roles: splitList(roles) })} placeholder="Data Scientist, ML Engineer" />
          </Field>
          <Field label="Locations">
            <input value={locations} onChange={(e) => setLocations(e.target.value)} onBlur={() => save({ locations: splitList(locations) })} placeholder="Bengaluru, Remote" />
          </Field>
          <Field label="Daily cap">
            <select value={s.daily_cap} onChange={(e) => save({ daily_cap: Number(e.target.value) })}>
              {[3, 5, 10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} applications / day</option>)}
            </select>
          </Field>
          <label className="cp-check"><input type="checkbox" checked={s.remote_only} onChange={(e) => save({ remote_only: e.target.checked })} />Remote only</label>
          <label className="cp-check"><input type="checkbox" checked={s.h1b_only} onChange={(e) => save({ h1b_only: e.target.checked })} />H-1B sponsors only</label>
          <div className="cp-divider" />
          <Field label="When a packet is ready">
            <select value={s.auto_submit ? "submit" : "prepare"} disabled={!overview.turbo}
              onChange={(e) => {
                const submit = e.target.value === "submit";
                if (submit && !window.confirm("Let the agent submit applications from your browser without asking each time?")) return;
                save({ auto_submit: submit });
              }}>
              <option value="prepare">Prepare and notify me (recommended)</option>
              <option value="submit">Submit without asking (beta)</option>
            </select>
          </Field>
          <p className="cp-muted" style={{ margin: 0 }}>
            Unattended submit only applies to verified {s.auto_submit_ats.join(" and ")} postings, through the Chrome extension
            in your own browser. Unverified postings and missing answers always wait for you.
          </p>
          <ErrorNote message={error} />
          {note && <Note tone="info">{note}</Note>}
          <button className="btn-primary" onClick={run} disabled={busy !== "" || !overview.turbo}>
            {busy === "run" ? <Spinner /> : <>Run now<Cost /></>}
          </button>
        </div>

        <div className="cp-card">
          <div className="cp-between">
            <div className="cp-eyebrow">{scope === "today" ? "Today's queue" : "All activity"}</div>
            <button className="cp-link" onClick={() => setScope(scope === "today" ? "all" : "today")}>{scope === "today" ? "Show all" : "Show today"}</button>
          </div>
          {tasks.length === 0 ? (
            <EmptyState title="Nothing queued yet">Turn the agent on or tap Run now.</EmptyState>
          ) : (
            tasks.map((t) => (
              <TaskRow key={t.id} task={t} onOpenJob={setJobId}
                onChanged={() => { loadTasks(); career.agent().then(apply).catch(() => {}); }} />
            ))
          )}
        </div>
      </div>
      {jobId && <JobDrawer jobId={jobId} onClose={() => setJobId(null)} />}
    </div>
  );
}
