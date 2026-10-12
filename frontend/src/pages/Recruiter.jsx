import { useCallback, useEffect, useState } from "react";
import SEO from "../components/SEO";
import { career, apiError } from "../api";
import { EmptyState, ErrorNote, Field, Loading, MatchRing, Modal, Note, Pill, Spinner } from "../components/career/ui";

const CAND_STATUSES = ["sourced", "contacted", "interviewing", "rejected", "hired"];
const VERDICT = { verified: ["Verified", "green"], review: ["Review", "amber"], high_risk: ["High risk", "red"], unchecked: ["Unchecked", "slate"] };

function NewRole({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", company: "", location: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onCreated(await career.createRole(form));
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="Open a role" onClose={onClose}>
      <form className="cp-stack" onSubmit={submit}>
        <div className="cp-grid-2">
          <Field label="Job title"><input required maxLength={300} value={form.title} onChange={set("title")} /></Field>
          <Field label="Company"><input maxLength={200} value={form.company} onChange={set("company")} /></Field>
        </div>
        <Field label="Location"><input maxLength={200} value={form.location} onChange={set("location")} /></Field>
        <Field label="Job description" hint="Skills are extracted from this to rank candidates.">
          <textarea className="sr-textarea" rows={8} required minLength={30} maxLength={50000} value={form.description} onChange={set("description")} />
        </Field>
        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? <Spinner /> : "Create role"}</button>
      </form>
    </Modal>
  );
}

function CandidateModal({ candidateId, onClose, onChanged }) {
  const [cand, setCand] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const [delivery, setDelivery] = useState(null);

  useEffect(() => {
    career.candidate(candidateId).then(setCand).catch((e) => setError(apiError(e)));
  }, [candidateId]);

  const act = async (name, fn) => {
    setBusy(name);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
    }
  };

  if (!cand) return <Modal title="Candidate" onClose={onClose}>{error ? <ErrorNote message={error} /> : <Loading />}</Modal>;
  const [vLabel, vTone] = VERDICT[cand.fraud_verdict] || VERDICT.unchecked;
  const blocked = cand.fraud_verdict === "high_risk";

  return (
    <Modal title={cand.name || "Candidate"} onClose={onClose} wide>
      <div className="cp-job-card">
        <MatchRing score={Math.round(cand.match_score)} size={64} label="match" />
        <div style={{ flex: 1 }}>
          <div className="cp-small">{cand.email || "No email"}{cand.phone ? ` · ${cand.phone}` : ""}</div>
          <div className="cp-row" style={{ marginTop: 6 }}>
            <Pill tone={vTone}>{vLabel} · risk {cand.fraud_score}</Pill>
            <Pill>{cand.source === "platform" ? "Opted-in job seeker" : "Uploaded resume"}</Pill>
          </div>
        </div>
        <select aria-label="Candidate stage" value={cand.status} style={{ width: "auto" }}
          onChange={(e) => act("status", async () => { setCand(await career.updateCandidate(cand.id, e.target.value)); onChanged(); })}>
          {CAND_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {cand.fraud_flags.length > 0 && (
        <div className="cp-stack" style={{ gap: 6 }}>
          <div className="cp-label">Fraud checks</div>
          {cand.fraud_flags.map((f, i) => (
            <div key={i} className="cp-small"><Pill tone={f.severity >= 3 ? "red" : f.severity >= 2 ? "amber" : "slate"}>{f.category}</Pill> {f.detail}</div>
          ))}
        </div>
      )}
      {cand.match?.matched_skills?.length > 0 && (
        <div><div className="cp-label">Matched skills</div><div className="cp-row">{cand.match.matched_skills.map((s) => <Pill key={s} tone="green">{s}</Pill>)}</div></div>
      )}
      {cand.match?.missing_skills?.length > 0 && (
        <div><div className="cp-label">Missing skills</div><div className="cp-row">{cand.match.missing_skills.map((s) => <Pill key={s} tone="amber">{s}</Pill>)}</div></div>
      )}
      {blocked && <Note tone="warn">Outreach is blocked for high-risk profiles. Verify this candidate's identity before contacting them.</Note>}
      {!blocked && (
        draft ? (
          <div className="cp-stack">
            <Field label="Subject"><input maxLength={200} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></Field>
            <Field label="Message"><textarea className="sr-textarea" rows={8} maxLength={5000} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
            <div className="cp-row">
              <button className="btn-primary" disabled={busy !== "" || !cand.email}
                onClick={() => act("send", async () => { const r = await career.contactCandidate(cand.id, { ...draft, send: true }); setCand(r.candidate); setDelivery(r.delivery); onChanged(); })}>
                {busy === "send" ? <Spinner /> : "Send email"}
              </button>
              <button className="btn-secondary" disabled={busy !== ""}
                onClick={() => act("save", async () => { const r = await career.contactCandidate(cand.id, { ...draft, send: false }); setCand(r.candidate); onChanged(); })}>
                Mark contacted (I'll send it myself)
              </button>
            </div>
            {delivery && <Note tone="info">Email sent{delivery.provider ? ` via ${delivery.provider}` : ""}.</Note>}
          </div>
        ) : (
          <button className="btn-secondary" style={{ alignSelf: "flex-start" }} disabled={busy !== ""}
            onClick={() => act("draft", async () => setDraft(await career.draftOutreach(cand.id)))}>
            {busy === "draft" ? <Spinner /> : "Draft outreach"}
          </button>
        )
      )}
      <ErrorNote message={error} />
      {cand.resume_text && <details><summary className="cp-link">Resume text</summary><div className="cp-desc" style={{ marginTop: 8 }}>{cand.resume_text}</div></details>}
    </Modal>
  );
}

function RoleView({ roleId, onBack, onDeleted }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [paste, setPaste] = useState({ name: "", text: "" });
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    career.role(roleId).then(setData).catch((e) => setError(apiError(e)));
  }, [roleId]);
  useEffect(load, [load]);

  const act = async (name, fn) => {
    setBusy(name);
    setError(null);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
    }
  };
  const upload = (files) => act("upload", async () => {
    const r = await career.addCandidates(roleId, Array.from(files));
    setNote(`Added ${r.added.length} candidate(s).${r.errors.length ? ` ${r.errors.length} file(s) couldn't be read.` : ""}`);
    load();
  });

  if (!data) return error ? <ErrorNote message={error} /> : <Loading />;
  const { role, candidates } = data;
  return (
    <div className="cp-stack">
      <button className="cp-link" style={{ alignSelf: "flex-start" }} onClick={onBack}>← All roles</button>
      <div className="cp-card cp-stack">
        <div className="cp-between">
          <div>
            <h2 className="cp-title" style={{ fontSize: 19 }}>{role.title}</h2>
            <p className="cp-sub">{[role.company, role.location].filter(Boolean).join(" · ")}</p>
          </div>
          <button className="btn-secondary cp-btn-danger" onClick={() => act("delete", async () => {
            if (!window.confirm("Delete this role and its candidates?")) return;
            await career.deleteRole(role.id);
            onDeleted();
          })}>Delete role</button>
        </div>
        <div className="cp-row">{role.skills.map((s) => <Pill key={s}>{s}</Pill>)}</div>
        <div className="cp-row">
          <button className="btn-primary" disabled={busy !== ""} onClick={() => act("source", async () => {
            const r = await career.sourceCandidates(role.id);
            setNote(`Sourced ${r.added.length} opted-in job seeker(s).`);
            load();
          })}>{busy === "source" ? <Spinner /> : "Source from platform"}</button>
          <label className="btn-secondary" style={{ cursor: "pointer" }}>
            {busy === "upload" ? <Spinner /> : "Upload resumes (PDF/DOCX/TXT)"}
            <input type="file" multiple accept=".pdf,.docx,.doc,.txt" hidden onChange={(e) => e.target.files?.length && upload(e.target.files)} />
          </label>
        </div>
        <details>
          <summary className="cp-link">Or paste a resume</summary>
          <div className="cp-stack" style={{ marginTop: 8 }}>
            <input placeholder="Candidate name" maxLength={200} value={paste.name} onChange={(e) => setPaste({ ...paste, name: e.target.value })} />
            <textarea className="sr-textarea" rows={5} maxLength={50000} value={paste.text} onChange={(e) => setPaste({ ...paste, text: e.target.value })} />
            <button className="btn-secondary" style={{ alignSelf: "flex-start" }} disabled={busy !== "" || paste.text.trim().length < 50}
              onClick={() => act("paste", async () => { await career.addCandidates(role.id, [], paste.text, paste.name); setPaste({ name: "", text: "" }); load(); })}>
              Add candidate
            </button>
          </div>
        </details>
        {note && <Note tone="info">{note}</Note>}
        <ErrorNote message={error} />
      </div>

      {candidates.length === 0 ? (
        <EmptyState title="No candidates yet">Source opted-in job seekers or upload resumes. Every candidate is ranked and fraud-checked.</EmptyState>
      ) : (
        <div className="cp-card cp-table-wrap" style={{ padding: 0 }}>
          <table className="cp-table">
            <thead><tr><th>Candidate</th><th>Match</th><th>Fraud check</th><th>Stage</th></tr></thead>
            <tbody>
              {candidates.map((c) => {
                const [label, tone] = VERDICT[c.fraud_verdict] || VERDICT.unchecked;
                return (
                  <tr key={c.id}>
                    <td><button className="cp-link" onClick={() => setOpenId(c.id)}>{c.name || "Unnamed"}</button><div className="cp-muted">{c.source === "platform" ? "Platform" : "Upload"}</div></td>
                    <td><strong>{Math.round(c.match_score)}%</strong></td>
                    <td><Pill tone={tone}>{label}</Pill>{c.fraud_flags.length > 0 && <div className="cp-muted">{c.fraud_flags.length} flag(s)</div>}</td>
                    <td style={{ textTransform: "capitalize" }}>{c.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {openId && <CandidateModal candidateId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

export default function Recruiter() {
  const [dash, setDash] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [roleId, setRoleId] = useState(null);

  const load = useCallback(() => {
    career.recruiterDashboard().then(setDash).catch((e) => setError(apiError(e)));
  }, []);
  useEffect(load, [load]);

  return (
    <div className="cp-page">
      <SEO title="For Employers" description="Source, rank and fraud-check candidates for your open roles." />
      <div className="cp-page-head">
        <div>
          <div className="cp-eyebrow">For employers</div>
          <h1 className="cp-title">Hire faster, without fake candidates</h1>
          <p className="cp-sub">Rank candidates against your role and catch fabricated resumes before you reach out.</p>
        </div>
        {!roleId && <button className="btn-primary" onClick={() => setCreating(true)}>+ Open a role</button>}
      </div>
      <ErrorNote message={error} />
      {roleId ? (
        <RoleView roleId={roleId} onBack={() => { setRoleId(null); load(); }} onDeleted={() => { setRoleId(null); load(); }} />
      ) : !dash ? <Loading /> : (
        <>
          <div className="cp-grid-3">
            <div className="cp-stat"><div className="cp-stat-value">{dash.roles.length}</div><div className="cp-stat-label">Open roles</div></div>
            <div className="cp-stat"><div className="cp-stat-value">{dash.talent_reach}</div><div className="cp-stat-label">Opted-in job seekers</div></div>
            <div className="cp-stat"><div className="cp-stat-value">{dash.fraud_blocked}</div><div className="cp-stat-label">High-risk profiles caught</div></div>
          </div>
          {dash.roles.length === 0 ? (
            <EmptyState title="No roles yet" action={<button className="btn-primary" onClick={() => setCreating(true)}>Open your first role</button>} />
          ) : (
            <div className="cp-stack">
              {dash.roles.map((r) => (
                <button key={r.id} type="button" className="cp-card cp-card-click" onClick={() => setRoleId(r.id)}>
                  <div className="cp-between">
                    <div>
                      <p className="cp-job-title">{r.title}</p>
                      <p className="cp-job-meta">{[r.company, r.location].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="cp-row"><Pill>{r.candidates} candidates</Pill><Pill tone="green">{r.verified} verified</Pill></div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {creating && <NewRole onClose={() => setCreating(false)} onCreated={(r) => { load(); setRoleId(r.id); }} />}
    </div>
  );
}
