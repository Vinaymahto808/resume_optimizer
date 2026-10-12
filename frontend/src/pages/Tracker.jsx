import { useCallback, useEffect, useState } from "react";
import SEO from "../components/SEO";
import { career, apiError } from "../api";
import { CopyButton, EmptyState, ErrorNote, Field, Loading, Modal, Note, Pill, Spinner, Tabs } from "../components/career/ui";
import { downloadText, fmtDate, scoreTone } from "../components/career/format";
import JobDrawer from "../components/career/JobDrawer";

const STAGES = ["Wishlist", "Applied", "Screen", "Technical", "Offer", "Rejected"];

function AddApplication({ onClose, onAdded }) {
  const [form, setForm] = useState({ role: "", company: "", location: "", url: "", stage: "Wishlist", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onAdded(await career.createApplication(form));
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Add an application" onClose={onClose}>
      <form className="cp-stack" onSubmit={submit}>
        <div className="cp-grid-2">
          <Field label="Role"><input required maxLength={300} value={form.role} onChange={set("role")} /></Field>
          <Field label="Company"><input required maxLength={200} value={form.company} onChange={set("company")} /></Field>
          <Field label="Location"><input maxLength={200} value={form.location} onChange={set("location")} /></Field>
          <Field label="Stage">
            <select value={form.stage} onChange={set("stage")}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
        </div>
        <Field label="Posting URL"><input type="url" maxLength={2000} value={form.url} onChange={set("url")} placeholder="https://" /></Field>
        <Field label="Notes"><textarea className="sr-textarea" maxLength={5000} value={form.notes} onChange={set("notes")} /></Field>
        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? <Spinner /> : "Add to tracker"}</button>
      </form>
    </Modal>
  );
}

function ApplicationModal({ app, onClose, onChange, onDelete, onOpenJob }) {
  const [notes, setNotes] = useState(app.notes || "");
  const [packet, setPacket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (app.has_tailored_resume || app.has_cover_letter) career.packet(app.id).then(setPacket).catch(() => {});
  }, [app.id, app.has_tailored_resume, app.has_cover_letter]);

  const update = async (body) => {
    setBusy(true);
    setError(null);
    try {
      onChange(await career.updateApplication(app.id, body));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${app.role} at ${app.company} from your tracker?`)) return;
    try {
      await career.deleteApplication(app.id);
      onDelete(app.id);
      onClose();
    } catch (e) {
      setError(apiError(e));
    }
  };

  return (
    <Modal title={`${app.role} · ${app.company}`} onClose={onClose}>
      <div className="cp-row">
        {app.match_score > 0 && <Pill tone={scoreTone(app.match_score)}>{app.match_score}% match</Pill>}
        {app.location && <Pill>{app.location}</Pill>}
        {app.salary_range && <Pill>{app.salary_range}</Pill>}
        {app.applied_at && <Pill tone="accent">Applied {fmtDate(app.applied_at)}</Pill>}
      </div>
      <Field label="Stage">
        <select value={app.stage} disabled={busy} onChange={(e) => update({ stage: e.target.value })}>
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Notes">
        <textarea className="sr-textarea" rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (app.notes || "") && update({ notes })} />
      </Field>
      {packet && (
        <div className="cp-stack">
          <div className="cp-label">Documents</div>
          {packet.tailored_resume && (
            <div className="cp-row">
              <span className="cp-small" style={{ flex: 1 }}>Tailored resume</span>
              <CopyButton text={packet.tailored_resume} />
              <button className="btn-secondary cp-btn-sm" onClick={() => downloadText(`Resume_${app.company}.txt`, packet.tailored_resume)}>Download</button>
            </div>
          )}
          {packet.cover_letter && (
            <div className="cp-row">
              <span className="cp-small" style={{ flex: 1 }}>Cover letter</span>
              <CopyButton text={packet.cover_letter} />
              <button className="btn-secondary cp-btn-sm" onClick={() => downloadText(`Cover_Letter_${app.company}.txt`, packet.cover_letter)}>Download</button>
            </div>
          )}
        </div>
      )}
      <ErrorNote message={error} />
      <div className="cp-row">
        {app.job_id && <button className="btn-secondary" onClick={() => onOpenJob(app.job_id)}>Job details & AI tools</button>}
        {app.url && <a className="btn-secondary" href={app.url} target="_blank" rel="noreferrer">Open posting ↗</a>}
        <button className="btn-secondary cp-btn-danger" onClick={remove}>Delete</button>
      </div>
    </Modal>
  );
}

const daysSince = (iso) => (iso ? Math.floor((Date.now() - new Date(`${iso}Z`).getTime()) / 86400000) : 0);

export default function Tracker() {
  const [apps, setApps] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("board");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [jobId, setJobId] = useState(null);

  const load = useCallback(() => {
    career.applications().then((r) => setApps(r.applications)).catch((e) => setError(apiError(e)));
  }, []);
  useEffect(load, [load]);

  const replace = (a) => {
    setApps((list) => list.map((x) => (x.id === a.id ? a : x)));
    setSelected(a);
  };
  const move = async (a, stage) => {
    try {
      replace(await career.updateApplication(a.id, { stage }));
    } catch (e) {
      setError(apiError(e));
    }
  };

  if (!apps) return <div className="cp-page">{error ? <ErrorNote message={error} /> : <Loading />}</div>;

  const followUps = apps.filter((a) => a.stage === "Applied" && daysSince(a.applied_at) >= 7);
  const active = apps.filter((a) => a.stage !== "Rejected").length;

  return (
    <div className="cp-page" style={{ maxWidth: 1400 }}>
      <SEO title="Application Tracker" description="Track every job application from wishlist to offer." />
      <div className="cp-page-head">
        <div>
          <div className="cp-eyebrow">Tracker</div>
          <h1 className="cp-title">Your applications</h1>
          <p className="cp-sub">{apps.length} tracked · {active} active</p>
        </div>
        <div className="cp-row">
          <Tabs tabs={[{ id: "board", label: "Board" }, { id: "list", label: "List" }]} value={view} onChange={setView} />
          <button className="btn-primary" onClick={() => setAdding(true)}>+ Add application</button>
        </div>
      </div>

      {followUps.length > 0 && (
        <Note tone="warn">
          <strong>Time to follow up:</strong>{" "}
          {followUps.slice(0, 4).map((a) => `${a.role} at ${a.company} (${daysSince(a.applied_at)} days)`).join(" · ")}
        </Note>
      )}
      <ErrorNote message={error} />

      {apps.length === 0 ? (
        <EmptyState title="Nothing tracked yet" action={<button className="btn-primary" onClick={() => setAdding(true)}>Add your first application</button>}>
          Save jobs from AI Job Match, or add applications you've made elsewhere.
        </EmptyState>
      ) : view === "board" ? (
        <div className="cp-board">
          {STAGES.map((stage) => {
            const items = apps.filter((a) => a.stage === stage);
            return (
              <div key={stage} className="cp-col">
                <div className="cp-col-head"><span>{stage}</span><Pill>{items.length}</Pill></div>
                {items.map((a) => (
                  <div key={a.id} className="cp-card cp-card-tight cp-stack" style={{ gap: 6 }}>
                    <button className="cp-link" style={{ textAlign: "left", color: "var(--text-heading)" }} onClick={() => setSelected(a)}>{a.role}</button>
                    <span className="cp-small">{a.company}</span>
                    <div className="cp-row">
                      {a.match_score > 0 && <Pill tone={scoreTone(a.match_score)}>{a.match_score}%</Pill>}
                      {a.has_tailored_resume && <Pill tone="accent">Resume</Pill>}
                      {a.has_cover_letter && <Pill tone="accent">Letter</Pill>}
                    </div>
                    <select aria-label="Move to stage" value={a.stage} onChange={(e) => move(a, e.target.value)} style={{ padding: "5px 8px", fontSize: 12 }}>
                      {STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cp-card cp-table-wrap" style={{ padding: 0 }}>
          <table className="cp-table">
            <thead><tr><th>Role</th><th>Company</th><th>Stage</th><th>Match</th><th>Updated</th></tr></thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <td><button className="cp-link" onClick={() => setSelected(a)}>{a.role}</button></td>
                  <td>{a.company}</td>
                  <td>
                    <select aria-label="Stage" value={a.stage} onChange={(e) => move(a, e.target.value)} style={{ padding: "5px 8px", fontSize: 12, width: "auto" }}>
                      {STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>{a.match_score ? `${a.match_score}%` : "—"}</td>
                  <td className="cp-muted">{fmtDate(a.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && <AddApplication onClose={() => setAdding(false)} onAdded={(a) => setApps((l) => [a, ...l])} />}
      {selected && (
        <ApplicationModal key={selected.id} app={selected} onClose={() => setSelected(null)} onChange={replace}
          onDelete={(id) => setApps((l) => l.filter((x) => x.id !== id))} onOpenJob={(id) => { setSelected(null); setJobId(id); }} />
      )}
      {jobId && <JobDrawer jobId={jobId} onClose={() => setJobId(null)} onChanged={load} />}
    </div>
  );
}
