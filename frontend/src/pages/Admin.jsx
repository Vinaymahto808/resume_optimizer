import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import { careerAdmin, apiError } from "../api";
import { clearAdminToken, getAdminToken } from "../lib/adminSession";
import { useAuth } from "../contexts/AuthContext";
import { EmptyState, ErrorNote, Field, Loading, Modal, Note, Pill, Spinner, Tabs } from "../components/career/ui";
import { fmtDate, fmtDateTime, inr } from "../components/career/format";

function Payments() {
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [shot, setShot] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    careerAdmin.payments(status).then((r) => setRows(r.requests)).catch((e) => setError(apiError(e)));
  }, [status]);
  useEffect(load, [load]);

  const viewShot = async (id) => {
    try { setShot(await careerAdmin.paymentScreenshot(id)); } catch (e) { setError(apiError(e)); }
  };
  const act = async (id, fn) => {
    setBusyId(id);
    setError(null);
    try { await fn(); load(); } catch (e) { setError(apiError(e)); } finally { setBusyId(null); }
  };

  return (
    <div className="cp-stack">
      <Note tone="warn">
        <strong>Verify the UTR and amount in your UPI / bank app before approving.</strong> A screenshot alone is not proof:
        approve only when the matching credit appears with the reference code in the note.
      </Note>
      <Tabs tabs={["pending", "approved", "rejected"].map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) }))} value={status} onChange={setStatus} />
      <ErrorNote message={error} />
      {!rows ? <Loading /> : rows.length === 0 ? <EmptyState title={`No ${status} payments`} /> : (
        <div className="cp-card cp-table-wrap" style={{ padding: 0 }}>
          <table className="cp-table pay-table">
            <thead><tr><th>Submitted</th><th>User</th><th>Plan</th><th>UTR</th><th>Reference</th><th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="Submitted" className="cp-muted">{fmtDateTime(r.created_at)}</td>
                  <td data-label="User" className="pay-user">{r.email}<div className="cp-muted">{r.client_id}</div></td>
                  <td data-label="Plan">{r.plan_label} · <strong>{inr(r.amount_inr)}</strong></td>
                  <td data-label="UTR" style={{ fontFamily: "monospace" }}>{r.utr}</td>
                  <td data-label="Reference" style={{ fontFamily: "monospace" }}>{r.reference_code}</td>
                  <td className="pay-actions">
                    <div className="cp-row">
                      <button className="btn-secondary cp-btn-sm" onClick={() => viewShot(r.id)}>Screenshot</button>
                      {r.status === "pending" && (
                        <>
                          <button className="btn-primary cp-btn-sm" disabled={busyId === r.id}
                            onClick={() => window.confirm(`Approve ${inr(r.amount_inr)} from ${r.email}? Check UTR ${r.utr} in your UPI app first.`)
                              && act(r.id, () => careerAdmin.approvePayment(r.id))}>Approve</button>
                          <button className="btn-secondary cp-btn-sm cp-btn-danger" disabled={busyId === r.id}
                            onClick={() => {
                              const reason = window.prompt("Reason for rejecting (shown to the user):", "Payment not found for this UTR");
                              if (reason && reason.trim().length >= 3) act(r.id, () => careerAdmin.rejectPayment(r.id, reason.trim()));
                            }}>Reject</button>
                        </>
                      )}
                      {r.status === "rejected" && <span className="cp-muted">{r.reject_reason}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {shot && (
        <Modal title="Payment screenshot" onClose={() => { URL.revokeObjectURL(shot); setShot(null); }}>
          <img src={shot} alt="Payment screenshot submitted by the user" style={{ width: "100%", borderRadius: 8 }} />
        </Modal>
      )}
    </div>
  );
}

function PlanEditor({ user, onClose, onSaved }) {
  const [plan, setPlan] = useState(user.plan);
  const [days, setDays] = useState(30);
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = plan === "free" ? { plan } : expires ? { plan, expires_at: new Date(expires).toISOString() } : { plan, days: Number(days) };
      onSaved(await careerAdmin.setPlan(user.client_id, body));
      onClose();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Plan for ${user.email}`} onClose={onClose}>
      <form className="cp-stack" onSubmit={save}>
        <Field label="Plan">
          <select value={plan} onChange={(e) => setPlan(e.target.value)}><option value="free">Free</option><option value="turbo">Turbo</option></select>
        </Field>
        {plan === "turbo" && (
          <div className="cp-grid-2">
            <Field label="Extend by (days)" hint="From the current expiry, or from today."><input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
            <Field label="…or exact expiry"><input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} /></Field>
          </div>
        )}
        <ErrorNote message={error} />
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? <Spinner /> : "Save plan"}</button>
      </form>
    </Modal>
  );
}

function Users() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    careerAdmin.users(query).then(setData).catch((e) => setError(apiError(e)));
  }, [query]);
  useEffect(load, [load]);

  const toggleAdmin = async (u) => {
    if (!window.confirm(`${u.is_admin ? "Remove admin access from" : "Make admin:"} ${u.email}?`)) return;
    try { await careerAdmin.setAdmin(u.id, !u.is_admin); load(); } catch (e) { setError(apiError(e)); }
  };

  return (
    <div className="cp-stack">
      <form className="cp-row" onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} placeholder="Search email or name" style={{ flex: 1, minWidth: 180 }} />
        <button className="btn-primary" type="submit">Search</button>
      </form>
      <ErrorNote message={error} />
      {!data ? <Loading /> : (
        <div className="cp-card cp-table-wrap" style={{ padding: 0 }}>
          <table className="cp-table">
            <thead><tr><th>User</th><th>Joined</th><th>Plan</th><th>Resume</th><th>Apps</th><th /></tr></thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}{u.is_admin && <> <Pill tone="purple">Admin</Pill></>}<div className="cp-muted">{u.full_name}</div></td>
                  <td className="cp-muted">{fmtDate(u.created_at)}</td>
                  <td>{u.plan === "turbo" ? <Pill tone="green">Turbo</Pill> : <Pill>Free</Pill>}{u.plan_expires_at && <div className="cp-muted">until {fmtDate(u.plan_expires_at)}</div>}</td>
                  <td>{u.has_resume ? "Yes" : "—"}</td>
                  <td>{u.applications}</td>
                  <td>
                    <div className="cp-row">
                      <button className="btn-secondary cp-btn-sm" onClick={() => setEditing(u)}>Plan</button>
                      {u.id !== me?.id && <button className="btn-secondary cp-btn-sm" onClick={() => toggleAdmin(u)}>{u.is_admin ? "Remove admin" : "Make admin"}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cp-muted" style={{ padding: "8px 12px", margin: 0 }}>{data.total} user(s)</p>
        </div>
      )}
      {editing && <PlanEditor user={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}

const ATS = ["greenhouse", "lever", "ashby", "workday", "smartrecruiters"];

function JobSources() {
  const [boards, setBoards] = useState(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ ats: "greenhouse", slug: "", crawl_now: true });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);

  const load = useCallback(() => {
    careerAdmin.boards(filter || undefined).then((r) => setBoards(r.boards)).catch((e) => setMsg({ ok: false, text: apiError(e) }));
  }, [filter]);
  useEffect(load, [load]);

  const act = async (key, fn, ok) => {
    setBusy(key);
    setMsg(null);
    try { await fn(); if (ok) setMsg({ ok: true, text: ok }); load(); } catch (e) { setMsg({ ok: false, text: apiError(e) }); } finally { setBusy(""); }
  };

  return (
    <div className="cp-stack">
      <form className="cp-card cp-stack" onSubmit={(e) => { e.preventDefault(); act("add", () => careerAdmin.addBoard(form), "Board added."); setForm((f) => ({ ...f, slug: "" })); }}>
        <div className="cp-eyebrow">Add a company careers board</div>
        <div className="cp-row" style={{ alignItems: "flex-end" }}>
          <div style={{ width: 170 }}>
            <Field label="ATS"><select value={form.ats} onChange={(e) => setForm({ ...form, ats: e.target.value })}>{ATS.map((a) => <option key={a}>{a}</option>)}</select></Field>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Field label="Board token or careers URL">
              <input required maxLength={300} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder={form.ats === "workday" ? "company.wd5.myworkdayjobs.com/company/External" : "https://boards.greenhouse.io/company"} />
            </Field>
          </div>
          <button className="btn-primary" type="submit" disabled={busy !== ""}>{busy === "add" ? <Spinner /> : "Add"}</button>
        </div>
        <label className="cp-check"><input type="checkbox" checked={form.crawl_now} onChange={(e) => setForm({ ...form, crawl_now: e.target.checked })} />Crawl it now</label>
      </form>
      {msg && <Note tone={msg.ok ? "info" : "warn"}>{msg.text}</Note>}
      <div className="cp-between">
        <Tabs tabs={[{ id: "", label: "All" }, ...ATS.map((a) => ({ id: a, label: a }))]} value={filter} onChange={setFilter} />
        <button className="btn-secondary" disabled={busy !== ""} onClick={() => act("all", () => careerAdmin.ingest(true), "Full crawl started. Check System for progress.")}>Crawl all sources</button>
      </div>
      {!boards ? <Loading /> : (
        <div className="cp-card cp-table-wrap" style={{ padding: 0 }}>
          <table className="cp-table">
            <thead><tr><th>Board</th><th>Source</th><th>Last crawl</th><th>Jobs</th><th /></tr></thead>
            <tbody>
              {boards.map((b) => (
                <tr key={b.id} style={{ opacity: b.active ? 1 : 0.5 }}>
                  <td><strong>{b.slug}</strong><div className="cp-muted">{b.ats}</div></td>
                  <td><Pill>{b.source}</Pill></td>
                  <td>
                    {b.last_crawled_at ? fmtDateTime(b.last_crawled_at) : <span className="cp-muted">Never</span>}
                    {b.last_status && <div><Pill tone={b.last_status === "ok" ? "green" : "red"} title={b.last_status}>{b.last_status === "ok" ? "OK" : "Error"}</Pill></div>}
                  </td>
                  <td>{b.last_count}</td>
                  <td>
                    <div className="cp-row">
                      <button className="btn-secondary cp-btn-sm" disabled={busy !== ""} onClick={() => act(b.id, () => careerAdmin.crawlBoard(b.id), `Crawling ${b.slug}…`)}>Crawl</button>
                      <button className="btn-secondary cp-btn-sm" disabled={busy !== ""} onClick={() => act(b.id, () => careerAdmin.updateBoard(b.id, { active: !b.active }))}>{b.active ? "Pause" : "Resume"}</button>
                      <button className="btn-secondary cp-btn-sm cp-btn-danger" disabled={busy !== ""}
                        onClick={() => window.confirm(`Remove ${b.slug}?`) && act(b.id, () => careerAdmin.deleteBoard(b.id))}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function System() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(() => { careerAdmin.system().then(setData).catch((e) => setError(apiError(e))); }, []);
  useEffect(load, [load]);
  if (!data) return error ? <ErrorNote message={error} /> : <Loading />;
  const ing = data.ingestion || {};
  return (
    <div className="cp-stack">
      <div className="cp-grid-4">
        <div className="cp-stat"><div className="cp-stat-value">{data.users}</div><div className="cp-stat-label">Users</div></div>
        <div className="cp-stat"><div className="cp-stat-value">{data.turbo_profiles}</div><div className="cp-stat-label">Turbo profiles</div></div>
        <div className="cp-stat"><div className="cp-stat-value">{data.jobs_active.toLocaleString()}</div><div className="cp-stat-label">Active jobs</div></div>
        <div className="cp-stat"><div className="cp-stat-value">{data.pending_payments}</div><div className="cp-stat-label">Pending payments</div></div>
      </div>
      <div className="cp-card cp-stack">
        <div className="cp-row"><strong>LLM:</strong> {data.llm ? <Pill tone="green">Connected</Pill> : <Pill tone="amber">Not configured: rule-based fallbacks in use</Pill>}</div>
        <div className="cp-row"><strong>Billing:</strong> <Pill>{data.billing_mode}</Pill></div>
        <div className="cp-row"><strong>Ingestion:</strong> {ing.running ? <Pill tone="accent">Running</Pill> : <Pill>Idle</Pill>}
          <span className="cp-muted">Last run {ing.last_run ? fmtDateTime(ing.last_run) : "never"}{ing.next_run ? ` · next ${fmtDateTime(ing.next_run)}` : ""}</span></div>
        {ing.last_stats && (
          <pre className="cp-desc" style={{ background: "var(--bg-soft)", padding: 12, borderRadius: 8, margin: 0 }}>{JSON.stringify(ing.last_stats, null, 2)}</pre>
        )}
        <button className="btn-secondary" style={{ alignSelf: "flex-start" }} onClick={load}>Refresh</button>
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("payments");
  // Signed in with the admin password (see AdminLogin), independent of any user account.
  if (!getAdminToken()) return <Navigate to="/admin/login" replace />;
  const signOut = () => { clearAdminToken(); navigate("/admin/login", { replace: true }); };
  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <span className="admin-bar-brand">ProfileOptimizer · Admin</span>
        <button className="btn-secondary cp-btn-sm" onClick={signOut}>Log out</button>
      </header>
      <div className="cp-page" style={{ maxWidth: 1300 }}>
        <SEO title="Admin" description="Admin console" />
        <div className="cp-page-head">
          <div>
            <div className="cp-eyebrow">Admin</div>
            <h1 className="cp-title">Admin console</h1>
          </div>
          <Tabs tabs={[{ id: "payments", label: "Payments" }, { id: "users", label: "Users" }, { id: "sources", label: "Job sources" }, { id: "system", label: "System" }]}
            value={tab} onChange={setTab} />
        </div>
        {tab === "payments" && <Payments />}
        {tab === "users" && <Users />}
        {tab === "sources" && <JobSources />}
        {tab === "system" && <System />}
      </div>
    </div>
  );
}
