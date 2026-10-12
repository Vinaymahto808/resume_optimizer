/* Career sections of the Account page: plan & credits, job profile, alerts, insider connections, extension pairing. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { career, apiError } from "../../api";
import { usePlan } from "../../contexts/PlanContext";
import { CopyButton, ErrorNote, Field, Loading, Note, Pill, Spinner } from "./ui";
import { fmtDate, fmtDateTime } from "./format";

const card = { borderRadius: 16, padding: 28 };
const title = { fontSize: 18, fontWeight: 700, color: "var(--text)", margin: "0 0 4px", fontFamily: "var(--font-display)" };
const list = (v) => v.split(",").map((s) => s.trim()).filter(Boolean);

function Card({ id, heading, sub, children, right }) {
  // id = in-page anchor (/account#alerts etc.), used by links on the feature pages.
  return (
    <section id={id} className="cp-card cp-stack" style={{ ...card, scrollMarginTop: 90 }}>
      <div className="cp-between" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 style={title}>{heading}</h2>
          {sub && <p className="cp-small" style={{ margin: 0 }}>{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function PlanCard() {
  const { careerPlan, isTurbo, openPaywall, refreshCareer } = usePlan();
  const [busy, setBusy] = useState(false);
  if (!careerPlan) return null;
  const p = careerPlan;
  return (
    <Card id="plan" heading="Plan & AI credits"
      right={isTurbo ? <Pill tone="green">Turbo active</Pill> : <button className="btn-primary" onClick={() => openPaywall(null)}>Upgrade to Turbo</button>}>
      <div className="cp-grid-3 plan-stats">
        <div className="cp-stat"><div className="cp-stat-value">{p.plan_name}</div><div className="cp-stat-label">Plan</div></div>
        <div className="cp-stat">
          <div className="cp-stat-value">{p.credits_limit === null ? "Unlimited" : `${p.credits_remaining} / ${p.credits_limit}`}</div>
          <div className="cp-stat-label">AI credits left today</div>
        </div>
        <div className="cp-stat">
          <div className="cp-stat-value">{p.alerts_used} / {p.alerts_limit}</div>
          <div className="cp-stat-label">Job alerts</div>
        </div>
      </div>
      {p.expires_at && <span className="cp-small">Turbo renews / expires on {fmtDate(p.expires_at)}.</span>}
      {p.payment?.status === "pending" && <Note tone="warn">UPI payment {p.payment.utr} is under review.</Note>}
      {p.payment?.status === "rejected" && <Note tone="warn">Your last UPI payment was rejected: {p.payment.reject_reason}</Note>}
      {isTurbo && p.billing_mode === "dev" && (
        <button className="btn-secondary cp-btn-sm" style={{ alignSelf: "flex-start" }} disabled={busy}
          onClick={async () => { setBusy(true); await career.cancelPlan().catch(() => {}); await refreshCareer(); setBusy(false); }}>
          Cancel Turbo (dev)
        </button>
      )}
    </Card>
  );
}

function JobProfileCard() {
  const { careerProfile, setCareerProfile } = usePlan();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!careerProfile || form) return;
    const p = careerProfile.preferences || {};
    Promise.resolve().then(() => setForm({
      phone: careerProfile.phone || "", location: careerProfile.location || "", headline: careerProfile.headline || "",
      linkedin: careerProfile.linkedin || "", github: careerProfile.github || "", portfolio: careerProfile.portfolio || "",
      open_to_recruiters: !!careerProfile.open_to_recruiters,
      roles: (p.roles || []).join(", "), locations: (p.locations || []).join(", "), remote_only: !!p.remote_only,
      min_salary: p.min_salary || "", salary_expectation: p.salary_expectation || "",
      work_authorized: p.work_authorized === undefined || p.work_authorized === null ? "" : String(p.work_authorized),
      needs_sponsorship: p.needs_sponsorship === undefined || p.needs_sponsorship === null ? "" : String(p.needs_sponsorship),
      current_title: p.current_title || "", current_company: p.current_company || "",
      years_experience: p.years_experience || "", start_date: p.start_date || "",
    }));
  }, [careerProfile, form]);

  if (!form) return <Card heading="Job profile & preferences"><Loading /></Card>;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const bool = (v) => (v === "" ? null : v === "true");

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const updated = await career.updateMe({
        phone: form.phone, location: form.location, headline: form.headline, linkedin: form.linkedin,
        github: form.github, portfolio: form.portfolio, open_to_recruiters: form.open_to_recruiters,
        preferences: {
          roles: list(form.roles), locations: list(form.locations), remote_only: form.remote_only,
          min_salary: form.min_salary ? Number(form.min_salary) : null, salary_expectation: form.salary_expectation,
          work_authorized: bool(form.work_authorized), needs_sponsorship: bool(form.needs_sponsorship),
          current_title: form.current_title, current_company: form.current_company,
          years_experience: form.years_experience ? Number(form.years_experience) : null, start_date: form.start_date,
        },
      });
      setCareerProfile(updated);
      setMsg({ ok: true, text: "Saved. Matches and autofill now use these answers." });
    } catch (err) {
      setMsg({ ok: false, text: apiError(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="profile" heading="Job profile & preferences" sub="Used for matching, the background agent and Chrome autofill. Only you can see it.">
      <form className="cp-stack" onSubmit={save}>
        <div className="cp-grid-2">
          <Field label="Target roles (comma-separated)"><input maxLength={500} value={form.roles} onChange={set("roles")} placeholder="Data Analyst, BI Engineer" /></Field>
          <Field label="Preferred locations"><input maxLength={500} value={form.locations} onChange={set("locations")} placeholder="Bengaluru, Remote" /></Field>
          <Field label="Minimum salary (yearly, number)"><input type="number" min={0} value={form.min_salary} onChange={set("min_salary")} /></Field>
          <Field label="Salary expectation (for applications)"><input maxLength={100} value={form.salary_expectation} onChange={set("salary_expectation")} placeholder="₹18 LPA / $120k" /></Field>
          <Field label="Authorized to work where you apply?">
            <select value={form.work_authorized} onChange={set("work_authorized")}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select>
          </Field>
          <Field label="Need visa sponsorship?">
            <select value={form.needs_sponsorship} onChange={set("needs_sponsorship")}><option value="">Not set</option><option value="true">Yes</option><option value="false">No</option></select>
          </Field>
          <Field label="Current title"><input maxLength={200} value={form.current_title} onChange={set("current_title")} /></Field>
          <Field label="Current company"><input maxLength={200} value={form.current_company} onChange={set("current_company")} /></Field>
          <Field label="Years of experience"><input type="number" min={0} max={60} value={form.years_experience} onChange={set("years_experience")} /></Field>
          <Field label="Earliest start date / notice"><input maxLength={100} value={form.start_date} onChange={set("start_date")} placeholder="30 days" /></Field>
          <Field label="Phone"><input maxLength={50} value={form.phone} onChange={set("phone")} /></Field>
          <Field label="Location"><input maxLength={200} value={form.location} onChange={set("location")} /></Field>
          <Field label="Headline"><input maxLength={300} value={form.headline} onChange={set("headline")} /></Field>
          <Field label="LinkedIn URL"><input maxLength={500} value={form.linkedin} onChange={set("linkedin")} /></Field>
          <Field label="GitHub URL"><input maxLength={500} value={form.github} onChange={set("github")} /></Field>
          <Field label="Portfolio URL"><input maxLength={500} value={form.portfolio} onChange={set("portfolio")} /></Field>
        </div>
        <label className="cp-check"><input type="checkbox" checked={form.remote_only} onChange={set("remote_only")} />Only show me remote jobs</label>
        <label className="cp-check"><input type="checkbox" checked={form.open_to_recruiters} onChange={set("open_to_recruiters")} />Let recruiters on ProfileOptimizer find my profile</label>
        {msg && <Note tone={msg.ok ? "info" : "warn"}>{msg.text}</Note>}
        <button className="btn-primary" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>{busy ? <Spinner /> : "Save job profile"}</button>
      </form>
    </Card>
  );
}

function AlertsCard() {
  const { careerPlan, refreshCareer } = usePlan();
  const [alerts, setAlerts] = useState(null);
  const [form, setForm] = useState({ name: "", query: "", location: "", remote_only: false, h1b_only: false, min_match: 60, email: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback(() => career.alerts().then((r) => setAlerts(r.alerts)).catch((e) => setError(apiError(e))), []);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await career.createAlert({ ...form, name: form.name || form.query || "My alert", min_match: Number(form.min_match) });
      setForm((f) => ({ ...f, name: "", query: "" }));
      load();
      refreshCareer();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="alerts" heading="Job alerts" sub="We check new postings after every crawl and tell you about early matches."
      right={careerPlan && <Pill>{careerPlan.alerts_used} / {careerPlan.alerts_limit}</Pill>}>
      {!alerts ? <Loading /> : alerts.length > 0 && (
        <div className="cp-stack" style={{ gap: 8 }}>
          {alerts.map((a) => (
            <div key={a.id} className="cp-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
              <div>
                <strong style={{ color: "var(--text-heading)" }}>{a.name}</strong>
                <div className="cp-small">
                  {[a.query && `"${a.query}"`, a.location, a.remote_only && "remote", a.h1b_only && "H-1B", `≥${a.min_match}% match`, a.email && `emails ${a.email}`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="cp-row">
                {a.unseen > 0 && <Link to="/jobs" className="cp-pill cp-pill--accent">{a.unseen} new</Link>}
                <button className="btn-secondary cp-btn-sm cp-btn-danger" onClick={async () => { await career.deleteAlert(a.id); load(); refreshCareer(); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <form className="cp-stack" onSubmit={create}>
        <div className="cp-grid-2">
          <Field label="Keywords"><input maxLength={200} value={form.query} onChange={set("query")} placeholder="python data engineer" /></Field>
          <Field label="Location"><input maxLength={100} value={form.location} onChange={set("location")} /></Field>
          <Field label={`Minimum match: ${form.min_match}%`}><input type="range" min={0} max={100} step={5} value={form.min_match} onChange={set("min_match")} style={{ padding: 0, accentColor: "var(--accent)" }} /></Field>
          <Field label="Email digest to (optional)"><input type="email" maxLength={200} value={form.email} onChange={set("email")} /></Field>
        </div>
        <div className="cp-row">
          <label className="cp-check"><input type="checkbox" checked={form.remote_only} onChange={set("remote_only")} />Remote only</label>
          <label className="cp-check"><input type="checkbox" checked={form.h1b_only} onChange={set("h1b_only")} />H-1B sponsors only</label>
        </div>
        <ErrorNote message={error} />
        <button className="btn-secondary" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>{busy ? <Spinner /> : "+ Create alert"}</button>
      </form>
    </Card>
  );
}

function ConnectionsCard() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", company: "", position: "", relationship: "connection", profile_url: "" });
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const load = useCallback((q = "") => career.connections(q).then(setData).catch((e) => setMsg({ ok: false, text: apiError(e) })), []);
  useEffect(() => { load(); }, [load]);

  const importCsv = async (file) => {
    setBusy("import");
    setMsg(null);
    try {
      const r = await career.importConnections(file);
      setMsg({ ok: true, text: `Imported ${r.added} new connection(s) from ${r.parsed} rows.` });
      load(search);
    } catch (e) {
      setMsg({ ok: false, text: apiError(e) });
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const add = async (e) => {
    e.preventDefault();
    setBusy("add");
    setMsg(null);
    try {
      await career.addConnection(form);
      setForm({ name: "", company: "", position: "", relationship: "connection", profile_url: "" });
      load(search);
    } catch (err) {
      setMsg({ ok: false, text: apiError(err) });
    } finally {
      setBusy("");
    }
  };

  return (
    <Card id="connections" heading="Insider connections" sub="See who you know at a company and ask for referrals. Seeing insider names on jobs needs Turbo.">
      <Note tone="info">
        On LinkedIn: <strong>Settings → Data privacy → Get a copy of your data → Connections</strong>. Upload the Connections.csv file here.
        We never sign in to LinkedIn for you.
      </Note>
      <div className="cp-row">
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
        <button className="btn-primary" disabled={busy !== ""} onClick={() => fileRef.current?.click()}>{busy === "import" ? <Spinner /> : "Import Connections.csv"}</button>
        {data && <span className="cp-muted">{data.total} connections</span>}
      </div>
      {msg && <Note tone={msg.ok ? "info" : "warn"}>{msg.text}</Note>}
      <form className="cp-stack" onSubmit={add}>
        <div className="cp-grid-2">
          <Field label="Name"><input required maxLength={200} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Company"><input maxLength={200} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
          <Field label="Position"><input maxLength={200} value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></Field>
          <Field label="How you know them">
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })}>
              <option value="connection">Connection</option><option value="colleague">Former colleague</option><option value="alumni">Alumni</option>
            </select>
          </Field>
        </div>
        <button className="btn-secondary" type="submit" disabled={busy !== ""} style={{ alignSelf: "flex-start" }}>{busy === "add" ? <Spinner /> : "+ Add manually"}</button>
      </form>
      {data && data.total > 0 && (
        <>
          <input value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value); }} placeholder="Filter by company" />
          <div className="cp-stack" style={{ gap: 6, maxHeight: 280, overflowY: "auto" }}>
            {data.connections.map((c) => (
              <div key={c.id} className="cp-between" style={{ fontSize: 13 }}>
                <span><strong>{c.name}</strong> <span className="cp-muted">{[c.position, c.company].filter(Boolean).join(" · ")}</span></span>
                <button className="cp-link cp-btn-danger" onClick={async () => { await career.deleteConnection(c.id); load(search); }}>Remove</button>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function ExtensionCard() {
  const [status, setStatus] = useState(null);
  const [token, setToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { career.extensionToken().then(setStatus).catch((e) => setError(apiError(e))); }, []);

  const create = async () => {
    if (status?.active && !window.confirm("Create a new pairing code? The current one stops working.")) return;
    setBusy(true);
    setError(null);
    try {
      const r = await career.createExtensionToken();
      setToken(r.token);
      setStatus(r);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const revoke = async () => {
    setBusy(true);
    try {
      await career.revokeExtensionToken();
      setToken(null);
      setStatus({ active: false });
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="extension" heading="Chrome extension" sub="Autofill applications on Greenhouse, Lever, Workday and other job sites with your profile.">
      {!status ? <Loading /> : (
        <>
          <p className="cp-small" style={{ margin: 0 }}>
            {status.active
              ? <>Paired (code ending <strong>…{status.hint}</strong>, created {fmtDate(status.created_at)}{status.last_used_at ? `, last used ${fmtDateTime(status.last_used_at)}` : ", not used yet"}).</>
              : "Not paired yet."}
          </p>
          {token && (
            <Note tone="info">
              <div className="cp-stack" style={{ gap: 8 }}>
                <span>Paste this code into the extension's popup. It's shown only once.</span>
                <div className="cp-row"><code style={{ wordBreak: "break-all", flex: 1 }}>{token}</code><CopyButton text={token} /></div>
              </div>
            </Note>
          )}
          <ErrorNote message={error} />
          <div className="cp-row">
            <button className="btn-primary" onClick={create} disabled={busy}>{busy ? <Spinner /> : status.active ? "New pairing code" : "Get pairing code"}</button>
            {status.active && <button className="btn-secondary cp-btn-danger" onClick={revoke} disabled={busy}>Unpair</button>}
          </div>
        </>
      )}
    </Card>
  );
}

export default function AccountCareer() {
  return (
    <>
      <PlanCard />
      <JobProfileCard />
      <AlertsCard />
      <ConnectionsCard />
      <ExtensionCard />
    </>
  );
}
