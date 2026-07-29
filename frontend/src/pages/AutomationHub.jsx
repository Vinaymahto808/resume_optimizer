import { useState, useEffect, useCallback } from "react";
import { automation, autoApply } from "../api";

const TABS = [
  { id: "overview", label: "Overview", icon: "⊞" },
  { id: "pipeline", label: "Pipeline", icon: "▶" },
  { id: "llm", label: "LLM", icon: "✦" },
  { id: "prompts", label: "Prompts", icon: "◈" },
  { id: "applications", label: "Applications", icon: "◉" },
  { id: "credentials", label: "Vault", icon: "⬡" },
  { id: "queue", label: "Queue", icon: "⟳" },
  { id: "jobs", label: "Job Search", icon: "◎" },
  { id: "browser", label: "Browser", icon: "⊞" },
  { id: "analytics", label: "Analytics", icon: "◇" },
];

const STATUS_COLORS = {
  draft: "#94a3b8",
  tailored: "#4f46e5",
  queued: "#f59e0b",
  applying: "#3b82f6",
  applied: "#10b981",
  screening: "#8b5cf6",
  interview: "#06b6d4",
  offer: "#10b981",
  rejected: "#ef4444",
  withdrawn: "#94a3b8",
  failed: "#ef4444",
  pending: "#f59e0b",
  processing: "#3b82f6",
  completed: "#10b981",
  retrying: "#f59e0b",
};

export default function AutomationHub() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div style={{ minHeight: "100%" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>
          Automation Hub
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Manage LLM, job applications, browser automation, credentials & analytics
        </p>
      </div>

      <div style={tabsBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              ...tabBtn,
              ...(activeTab === t.id ? tabBtnActive : {}),
            }}
          >
            <span style={{ fontSize: 13 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "pipeline" && <PipelineTab />}
        {activeTab === "llm" && <LLMTab />}
        {activeTab === "prompts" && <PromptsTab />}
        {activeTab === "applications" && <ApplicationsTab />}
        {activeTab === "credentials" && <CredentialsTab />}
        {activeTab === "queue" && <QueueTab />}
        {activeTab === "jobs" && <JobsTab />}
        {activeTab === "browser" && <BrowserTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}

function Card({ title, children, style: extra = {} }) {
  return (
    <div style={{ ...card, ...extra }}>
      {title && <div style={cardTitle}>{title}</div>}
      {children}
    </div>
  );
}

function Badge({ value, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 6,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
      background: (color || "#94a3b8") + "18",
      color: color || "#94a3b8", textTransform: "capitalize",
    }}>{value}</span>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite" }} />
    </div>
  );
}

function StatCard({ label, value, color = "var(--accent)" }) {
  return (
    <div style={statCard}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    </div>
  );
}

function Toast({ msg, type = "success" }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
      background: type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
      color: type === "success" ? "#10b981" : "#ef4444",
      border: `1px solid ${type === "success" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
      backdropFilter: "blur(16px)", boxShadow: "var(--shadow-md)",
    }}>{msg}</div>
  );
}

// ─── PIPELINE TAB ───
function PipelineTab() {
  const [mode, setMode] = useState("text");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState(null);
  const [userName, setUserName] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [maxJobs, setMaxJobs] = useState(5);
  const [minMatch, setMinMatch] = useState(40);
  const [autoEnqueue, setAutoEnqueue] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState("");

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setFileName(f.name); setMode("upload"); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setFileName(f.name); setMode("upload"); }
  };

  const runPipeline = async () => {
    setLoading(true); setResult(null);
    try {
      let r;
      if (mode === "upload" && file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("user_name", userName);
        fd.append("current_role", currentRole);
        fd.append("experience", experience);
        fd.append("skills", skills);
        fd.append("max_jobs", maxJobs);
        fd.append("min_match", minMatch);
        fd.append("auto_enqueue", autoEnqueue);
        r = await autoApply.pipelineUpload(fd);
      } else {
        if (!resumeText || resumeText.trim().length < 50) {
          setToast("Resume text must be at least 50 characters");
          setTimeout(() => setToast(""), 3000);
          setLoading(false);
          return;
        }
        r = await autoApply.pipeline({
          resume_text: resumeText,
          user_name: userName,
          current_role: currentRole,
          experience,
          skills,
          max_jobs: maxJobs,
          min_match: minMatch,
          auto_enqueue: autoEnqueue,
        });
      }
      setResult(r);
      setToast(`Pipeline complete: ${r.jobs_succeeded}/${r.jobs_processed} succeeded`);
      setTimeout(() => setToast(""), 4000);
    } catch (e) {
      setToast(e.response?.data?.detail || "Pipeline failed");
      setTimeout(() => setToast(""), 4000);
    }
    setLoading(false);
  };

  return (
    <div>
      <Toast msg={toast} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Upload Resume">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setMode("text")} style={{ ...filterBtn, ...(mode === "text" ? filterBtnActive : {}) }}>Paste Text</button>
              <button onClick={() => setMode("upload")} style={{ ...filterBtn, ...(mode === "upload" ? filterBtnActive : {}) }}>Upload File</button>
            </div>
            {mode === "text" ? (
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={12}
                placeholder="Paste your resume text here..."
                style={textarea}
              />
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  border: "2px dashed var(--border)", borderRadius: 10, padding: 32,
                  textAlign: "center", cursor: "pointer", transition: "border-color 0.2s",
                }}
                onClick={() => document.getElementById("pipeline-file-input").click()}
              >
                <input id="pipeline-file-input" type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleFile} style={{ display: "none" }} />
                {fileName ? (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{fileName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Click to replace</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Drag & drop your resume or click to browse</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>PDF, DOCX, or TXT (max 10MB)</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card title="Profile & Settings">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input placeholder="Your Name" value={userName} onChange={(e) => setUserName(e.target.value)} style={input} />
            <input placeholder="Current Role (e.g. Software Engineer)" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} style={input} />
            <input placeholder="Years of Experience" value={experience} onChange={(e) => setExperience(e.target.value)} style={input} />
            <textarea placeholder="Key Skills (comma separated)" value={skills} onChange={(e) => setSkills(e.target.value)} rows={2} style={textarea} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Max Jobs</label>
                <input type="number" min={1} max={20} value={maxJobs} onChange={(e) => setMaxJobs(+e.target.value)} style={input} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Min Match %</label>
                <input type="number" min={10} max={100} value={minMatch} onChange={(e) => setMinMatch(+e.target.value)} style={input} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={autoEnqueue} onChange={(e) => setAutoEnqueue(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
              Auto-enqueue successful applications
            </label>
            <button onClick={runPipeline} disabled={loading} style={btnPrimary}>
              {loading ? "Running Pipeline..." : "Run Auto-Apply Pipeline"}
            </button>
          </div>
        </Card>
      </div>

      {result && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...statGrid, marginBottom: 16 }}>
            <StatCard label="Jobs Found" value={result.total_jobs_found} />
            <StatCard label="Processed" value={result.jobs_processed} color="#3b82f6" />
            <StatCard label="Succeeded" value={result.jobs_succeeded} color="#10b981" />
            <StatCard label="Queued" value={result.jobs_queued} color="#f59e0b" />
          </div>
          {result.results && result.results.length > 0 && (
            <Card title="Pipeline Results">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {result.results.map((r, i) => (
                  <div key={i} style={appRow}>
                    <Badge value={r.status} color={r.status === "success" ? "#10b981" : "#ef4444"} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{r.job_title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.company} | {r.portal}</div>
                    </div>
                    <Badge value={`${Math.round(r.match_pct)}% match`} color="#4f46e5" />
                    {r.ats_score > 0 && <Badge value={`ATS ${Math.round(r.ats_score)}%`} color="#06b6d4" />}
                    {r.queued && <Badge value="Queued" color="#f59e0b" />}
                    {r.error && <span style={{ fontSize: 11, color: "#ef4444", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.error}</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {result.error && (
            <Card style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, color: "#ef4444" }}>{result.error}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── OVERVIEW TAB ───
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      automation.applicationStats().catch(() => ({ total: 0 })),
      automation.getMetrics().catch(() => ({})),
    ]).then(([s, m]) => { setStats(s); setMetrics(m); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  const counters = metrics?.counters || {};
  return (
    <div>
      <div style={statGrid}>
        <StatCard label="Total Applications" value={stats?.total || 0} />
        <StatCard label="Applied" value={stats?.applied || 0} color="#10b981" />
        <StatCard label="Interviews" value={stats?.interviews || 0} color="#8b5cf6" />
        <StatCard label="Offers" value={stats?.offers || 0} color="#06b6d4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <Card title="Events by Type">
          {Object.keys(counters).length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No events recorded yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(counters).slice(0, 10).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                  <span style={{ fontWeight: 700, color: "var(--text)" }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Application Pipeline">
          {stats?.by_status ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(stats.by_status).map(([status, count]) => (
                <div key={status} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <Badge value={status} color={STATUS_COLORS[status]} />
                  <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3 }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${Math.min(100, (count / Math.max(stats.total, 1)) * 100)}%`,
                      background: STATUS_COLORS[status] || "#94a3b8",
                    }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12, width: 24, textAlign: "right" }}>{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No applications yet</p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── LLM TAB ───
function LLMTab() {
  const [prompt, setPrompt] = useState("Explain what ATS scoring is in 2 sentences.");
  const [provider, setProvider] = useState("groq");
  const [result, setResult] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    setLoading(true); setResult(null);
    try {
      const r = await automation.llmCall({ prompt, provider, json_mode: false, temperature: 0.7, max_tokens: 500 });
      setResult(r);
    } catch (e) { setResult({ error: e.response?.data?.detail || "Failed" }); }
    setLoading(false);
  };

  const loadUsage = async () => {
    try { setUsage(await automation.llmUsage()); } catch {}
  };

  useEffect(() => { loadUsage(); }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
      <Card title="Test LLM Call">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} style={select}>
              <option value="groq">Groq (Llama 3.3)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} style={textarea} />
          <button onClick={handleCall} disabled={loading || !prompt} style={btnPrimary}>
            {loading ? "Calling..." : "Send to LLM"}
          </button>
          {result && (
            <div style={resultBox}>
              {result.error ? (
                <span style={{ color: "#ef4444" }}>{result.error}</span>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                    Provider: {result.provider} | Model: {result.model} | {result.tokens_used} tokens | {result.latency_ms}ms
                    {result.cached && " | CACHED"}
                  </div>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "var(--text)", margin: 0 }}>
                    {result.content}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </Card>
      <Card title="Usage Stats">
        {usage ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <StatCard label="Total Calls" value={usage.total_calls} />
            <StatCard label="Total Cost" value={`$${usage.total_cost_usd}`} color="#f59e0b" />
            <StatCard label="Avg Latency" value={`${usage.avg_latency_ms}ms`} />
            {usage.by_provider && Object.entries(usage.by_provider).map(([p, d]) => (
              <div key={p} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg-soft)", border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--text)" }}>{p}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.calls} calls | {d.tokens} tokens | ${d.cost_usd.toFixed(4)}</div>
              </div>
            ))}
          </div>
        ) : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No usage data</p>}
      </Card>
    </div>
  );
}

// ─── PROMPTS TAB ───
function PromptsTab() {
  const [prompts, setPrompts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [renderVars, setRenderVars] = useState("");
  const [rendered, setRendered] = useState("");

  useEffect(() => {
    automation.listPrompts().then((d) => { setPrompts(d); setLoading(false); });
  }, []);

  const handleRender = async (category) => {
    try {
      const vars = renderVars ? JSON.parse(renderVars) : {};
      const r = await automation.renderPrompt({ category, variables: vars });
      setRendered(r.prompt || r.error);
    } catch (e) { setRendered(e.message); }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card title="Prompt Templates">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 500, overflowY: "auto" }}>
          {Object.entries(prompts).map(([cat, versions]) => (
            <div key={cat} onClick={() => setSelected(selected === cat ? null : cat)} style={promptRow}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{cat}</span>
                <Badge value={`${versions.length} v${versions.length > 1 ? "s" : ""}`} color="#4f46e5" />
              </div>
              {selected === cat && (
                <div style={{ marginTop: 8 }}>
                  {versions.map((v) => (
                    <div key={v.version} style={{ padding: "6px 0", fontSize: 12, borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Badge value={`v${v.version}`} color={v.is_active ? "#10b981" : "#94a3b8"} />
                        <span style={{ color: "var(--text-muted)" }}>{v.variables?.length || 0} vars | {v.max_tokens} tokens</span>
                      </div>
                      {v.description && <div style={{ color: "var(--text-secondary)", marginTop: 4 }}>{v.description}</div>}
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      placeholder='{"key": "value"}'
                      value={renderVars}
                      onChange={(e) => setRenderVars(e.target.value)}
                      rows={2}
                      style={{ ...textarea, fontSize: 11 }}
                    />
                    <button onClick={() => handleRender(selected)} style={{ ...btnPrimary, marginTop: 6, fontSize: 12, padding: "6px 12px" }}>
                      Render Prompt
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
      <Card title="Rendered Output">
        <div style={resultBox}>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--text)", margin: 0, maxHeight: 600, overflowY: "auto" }}>
            {rendered || "Select a prompt template and click Render"}
          </pre>
        </div>
      </Card>
    </div>
  );
}

// ─── APPLICATIONS TAB ───
function ApplicationsTab() {
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ job_title: "", company_name: "", job_url: "", job_description: "", portal: "generic" });
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const [a, s] = await Promise.all([
        automation.listApplications(params),
        automation.applicationStats().catch(() => ({})),
      ]);
      setApps(a.applications || []);
      setStats(s);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.job_title || !form.company_name) return;
    try {
      await automation.createApplication(form);
      setShowCreate(false);
      setForm({ job_title: "", company_name: "", job_url: "", job_description: "", portal: "generic" });
      setToast("Application created");
      setTimeout(() => setToast(""), 3000);
      load();
    } catch (e) { setToast(e.response?.data?.detail || "Failed"); setTimeout(() => setToast(""), 3000); }
  };

  return (
    <div>
      <Toast msg={toast} />
      {stats && (
        <div style={{ ...statGrid, marginBottom: 16 }}>
          <StatCard label="Total" value={stats.total || 0} />
          <StatCard label="Applied" value={stats.applied || 0} color="#10b981" />
          <StatCard label="Interviews" value={stats.interviews || 0} color="#8b5cf6" />
          <StatCard label="Rejected" value={stats.rejected || 0} color="#ef4444" />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["", "draft", "queued", "applied", "interview", "offer", "rejected"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              ...filterBtn, ...(filter === f ? filterBtnActive : {}),
            }}>{f || "All"}</button>
          ))}
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={btnPrimary}>+ New Application</button>
      </div>

      {showCreate && (
        <Card title="Create Application" style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input placeholder="Job Title" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} style={input} />
            <input placeholder="Company Name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} style={input} />
            <input placeholder="Job URL (optional)" value={form.job_url} onChange={(e) => setForm({ ...form, job_url: e.target.value })} style={input} />
            <select value={form.portal} onChange={(e) => setForm({ ...form, portal: e.target.value })} style={select}>
              <option value="generic">Generic</option>
              <option value="linkedin">LinkedIn</option>
              <option value="indeed">Indeed</option>
              <option value="naukri">Naukri</option>
              <option value="glassdoor">Glassdoor</option>
            </select>
            <textarea placeholder="Job Description (optional)" value={form.job_description} onChange={(e) => setForm({ ...form, job_description: e.target.value })} rows={3} style={{ ...textarea, gridColumn: "1 / -1" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleCreate} style={btnPrimary}>Create</button>
            <button onClick={() => setShowCreate(false)} style={btnGhost}>Cancel</button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? <Spinner /> : apps.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>No applications yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {apps.map((a) => (
              <div key={a.id} style={appRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{a.job_title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{a.company_name}</div>
                </div>
                <Badge value={a.portal} color="#4f46e5" />
                <Badge value={a.status} color={STATUS_COLORS[a.status]} />
                {a.ats_match_score != null && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: a.ats_match_score > 70 ? "#10b981" : "#f59e0b" }}>
                    {Math.round(a.ats_match_score)}%
                  </span>
                )}
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── CREDENTIALS TAB ───
function CredentialsTab() {
  const [creds, setCreds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ portal: "linkedin", label: "", credentials: { email: "", password: "" } });
  const [toast, setToast] = useState("");

  const load = async () => {
    setLoading(true);
    try { const r = await automation.listCredentials(); setCreds(r.credentials || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStore = async () => {
    if (!form.credentials.email) return;
    try {
      await automation.storeCredential(form);
      setShowAdd(false);
      setForm({ portal: "linkedin", label: "", credentials: { email: "", password: "" } });
      setToast("Credential stored securely");
      setTimeout(() => setToast(""), 3000);
      load();
    } catch (e) { setToast(e.response?.data?.detail || "Failed"); setTimeout(() => setToast(""), 3000); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this credential?")) return;
    try { await automation.deleteCredential(id); load(); } catch {}
  };

  return (
    <div>
      <Toast msg={toast} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>
          Encrypted Credential Vault
        </h3>
        <button onClick={() => setShowAdd(!showAdd)} style={btnPrimary}>+ Add Credential</button>
      </div>

      {showAdd && (
        <Card title="Store Credential" style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <select value={form.portal} onChange={(e) => setForm({ ...form, portal: e.target.value })} style={select}>
              <option value="linkedin">LinkedIn</option>
              <option value="indeed">Indeed</option>
              <option value="naukri">Naukri</option>
              <option value="glassdoor">Glassdoor</option>
              <option value="generic">Generic</option>
            </select>
            <input placeholder="Label (optional)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} style={input} />
            <input placeholder="Email / Username" value={form.credentials.email} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, email: e.target.value } })} style={input} />
            <input type="password" placeholder="Password" value={form.credentials.password} onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, password: e.target.value } })} style={input} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={handleStore} style={btnPrimary}>Store Encrypted</button>
            <button onClick={() => setShowAdd(false)} style={btnGhost}>Cancel</button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? <Spinner /> : creds.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>No credentials stored. Add one to enable browser automation.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {creds.map((c) => (
              <div key={c.id} style={appRow}>
                <Badge value={c.portal} color="#4f46e5" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Type: {c.credential_type} | Last used: {c.last_used_at ? new Date(c.last_used_at).toLocaleString() : "Never"}
                  </div>
                </div>
                <button onClick={() => handleDelete(c.id)} style={btnDangerSmall}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── QUEUE TAB ───
function QueueTab() {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [j, s] = await Promise.all([
        automation.listQueueJobs(filter ? { status: filter } : {}),
        automation.queueStats().catch(() => ({})),
      ]);
      setJobs(j.jobs || []);
      setStats(s);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {stats && (
        <div style={{ ...statGrid, marginBottom: 16 }}>
          <StatCard label="Total Jobs" value={stats.total || 0} />
          <StatCard label="Pending" value={stats.by_status?.pending || 0} color="#f59e0b" />
          <StatCard label="Processing" value={stats.by_status?.processing || 0} color="#3b82f6" />
          <StatCard label="Completed" value={stats.by_status?.completed || 0} color="#10b981" />
        </div>
      )}
      <Card title="Job Queue">
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["", "pending", "processing", "completed", "failed"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...filterBtn, ...(filter === f ? filterBtnActive : {}) }}>
              {f || "All"}
            </button>
          ))}
        </div>
        {loading ? <Spinner /> : jobs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 24 }}>No jobs in queue</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {jobs.map((j) => (
              <div key={j.id} style={appRow}>
                <Badge value={j.status} color={STATUS_COLORS[j.status]} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{j.type}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Portal: {j.portal || "N/A"} | Attempts: {j.attempts} | Priority: {j.priority}
                  </div>
                </div>
                {j.error && <span style={{ fontSize: 11, color: "#ef4444", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.error}</span>}
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {j.created_at ? new Date(j.created_at).toLocaleTimeString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── JOBS TAB ───
function JobsTab() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [portal, setPortal] = useState("all");
  const [results, setResults] = useState(null);
  const [statuses, setStatuses] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true); setResults(null);
    try {
      const r = await automation.searchJobs({ query, location, portal, limit: 10 });
      setResults(r);
    } catch (e) { setResults({ error: e.response?.data?.detail || "Search failed" }); }
    setLoading(false);
  };

  const loadStatuses = async () => {
    try { setStatuses(await automation.portalStatus()); } catch {}
  };

  useEffect(() => { loadStatuses(); }, []);

  return (
    <div>
      <Card title="Search Job Boards" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input placeholder="Search keywords (e.g. Python developer)" value={query} onChange={(e) => setQuery(e.target.value)} style={{ ...input, flex: 2 }} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          <input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} style={{ ...input, flex: 1 }} />
          <select value={portal} onChange={(e) => setPortal(e.target.value)} style={{ ...select, width: 140 }}>
            <option value="all">All Portals</option>
            <option value="linkedin">LinkedIn</option>
            <option value="indeed">Indeed</option>
            <option value="naukri">Naukri</option>
            <option value="glassdoor">Glassdoor</option>
          </select>
          <button onClick={handleSearch} disabled={loading || !query} style={btnPrimary}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </Card>

      {statuses && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {Object.entries(statuses).map(([name, s]) => (
            <div key={name} style={{ ...statCard, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{name}</div>
              <Badge value={s.status} color={s.status === "ok" ? "#10b981" : s.status === "degraded" ? "#f59e0b" : "#ef4444"} />
            </div>
          ))}
        </div>
      )}

      {results && (
        <Card title={`Results (${results.total || 0})`}>
          {results.error ? (
            <p style={{ color: "#ef4444", fontSize: 13 }}>{results.error}</p>
          ) : results.results ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.entries(results.results).map(([p, jobs]) => (
                jobs.length > 0 && (
                  <div key={p}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>{p} ({jobs.length})</div>
                    {jobs.map((j, i) => (
                      <div key={i} style={appRow}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{j.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{j.company} | {j.location}</div>
                        </div>
                        {j.url && (
                          <a href={j.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
                            View &rarr;
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ))}
              {results.total === 0 && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No jobs found</p>}
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}

// ─── BROWSER TAB ───
function BrowserTab() {
  const [session, setSession] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [hasCaptcha, setHasCaptcha] = useState(false);
  const [toast, setToast] = useState("");

  const startSession = async () => {
    setLoading(true); setStatus("Starting browser...");
    try {
      const r = await automation.startBrowser({ headless: true });
      setSession(r);
      setStatus("Browser session active");
      setToast("Browser started");
      setTimeout(() => setToast(""), 3000);
    } catch (e) { setStatus("Failed to start: " + (e.response?.data?.detail || e.message)); }
    setLoading(false);
  };

  const stopSession = async () => {
    if (!session) return;
    try { await automation.stopBrowser(session.session_id); } catch {}
    setSession(null); setStatus("Browser stopped");
  };

  const navigate = async () => {
    if (!session || !url) return;
    setLoading(true);
    try {
      const r = await automation.browserNavigate(session.session_id, { url });
      setStatus(r.success ? `Loaded: ${r.title || r.url}` : `Error: ${r.error}`);
      const cap = await automation.browserDetectCaptcha(session.session_id);
      setHasCaptcha(cap.has_captcha);
    } catch (e) { setStatus("Navigation failed"); }
    setLoading(false);
  };

  const takeScreenshot = async () => {
    if (!session) return;
    try {
      const r = await automation.browserScreenshot(session.session_id);
      setToast(`Screenshot saved: ${r.path}`);
      setTimeout(() => setToast(""), 3000);
    } catch {}
  };

  return (
    <div>
      <Toast msg={toast} />
      <Card title="Browser Automation" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!session ? (
            <button onClick={startSession} disabled={loading} style={btnPrimary}>
              {loading ? "Starting..." : "Start Browser Session"}
            </button>
          ) : (
            <>
              <button onClick={stopSession} style={btnDanger}>Stop Session</button>
              <button onClick={takeScreenshot} style={btnGhost}>Screenshot</button>
            </>
          )}
          {session && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Session: {session.session_id}
            </span>
          )}
        </div>
        {status && <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)" }}>{status}</div>}
        {hasCaptcha && (
          <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>CAPTCHA detected! Manual solve may be required.</span>
          </div>
        )}
      </Card>

      {session && (
        <Card title="Navigate">
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="https://linkedin.com/jobs" value={url} onChange={(e) => setUrl(e.target.value)} style={{ ...input, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && navigate()} />
            <button onClick={navigate} disabled={loading || !url} style={btnPrimary}>Go</button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── ANALYTICS TAB ───
function AnalyticsTab() {
  const [metrics, setMetrics] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      automation.getMetrics().catch(() => ({})),
      automation.getEvents({ limit: 50 }).catch(() => []),
    ]).then(([m, e]) => { setMetrics(m); setEvents(e.events || e || []); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  const counters = metrics?.counters || {};
  const histograms = metrics?.histograms || {};

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card title="Counters">
        {Object.keys(counters).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No counters recorded</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.entries(counters).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Latency Histograms">
        {Object.keys(histograms).length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No histogram data</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(histograms).map(([k, h]) => (
              <div key={k} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "var(--text)" }}>{k}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 12 }}>
                  <span>n={h.count}</span>
                  <span>avg={h.avg}ms</span>
                  <span>p50={h.p50}ms</span>
                  <span>p95={h.p95}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Recent Events" style={{ gridColumn: "1 / -1" }}>
        {events.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No events</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 400, overflowY: "auto" }}>
            {events.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
                <Badge value={e.event_type} color={e.success !== false ? "#10b981" : "#ef4444"} />
                <span style={{ flex: 1, color: "var(--text-secondary)" }}>{e.action || ""}</span>
                {e.latency_ms > 0 && <span style={{ color: "var(--text-muted)" }}>{e.latency_ms}ms</span>}
                <span style={{ color: "var(--text-muted)" }}>{e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : ""}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── STYLES ───
const tabsBar = {
  display: "flex", gap: 4, padding: "4px", borderRadius: 12,
  background: "var(--bg-card)", border: "1px solid var(--border)",
  overflowX: "auto", flexWrap: "nowrap",
};
const tabBtn = {
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 8, border: "none",
  background: "transparent", color: "var(--text-muted)",
  fontSize: 13, fontWeight: 600, cursor: "pointer",
  whiteSpace: "nowrap", transition: "all 0.15s ease",
};
const tabBtnActive = {
  background: "var(--accent-soft)", color: "var(--accent)",
};
const card = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: 12, padding: 20,
};
const cardTitle = {
  fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12,
};
const statGrid = {
  display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
};
const statCard = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "14px 16px", textAlign: "center",
};
const input = {
  padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)",
  background: "var(--bg-soft)", color: "var(--text)", fontSize: 13,
  outline: "none", width: "100%", boxSizing: "border-box",
};
const select = {
  ...input, cursor: "pointer",
};
const textarea = {
  ...input, resize: "vertical", fontFamily: "inherit",
};
const btnPrimary = {
  padding: "9px 16px", borderRadius: 8, border: "none",
  background: "var(--accent-gradient)", color: "#fff",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost = {
  padding: "9px 16px", borderRadius: 8,
  border: "1px solid var(--border)", background: "var(--bg-soft)",
  color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
  cursor: "pointer",
};
const btnDanger = {
  ...btnGhost, borderColor: "rgba(239,68,68,0.3)", color: "#ef4444",
};
const btnDangerSmall = {
  padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)",
  background: "transparent", color: "#ef4444", fontSize: 11, fontWeight: 600,
  cursor: "pointer",
};
const filterBtn = {
  padding: "5px 12px", borderRadius: 6, border: "1px solid var(--border)",
  background: "transparent", color: "var(--text-muted)", fontSize: 12,
  fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
};
const filterBtnActive = {
  background: "var(--accent-soft)", color: "var(--accent)",
  borderColor: "var(--accent)",
};
const resultBox = {
  padding: 14, borderRadius: 10, background: "var(--bg-soft)",
  border: "1px solid var(--border)", maxHeight: 500, overflowY: "auto",
};
const appRow = {
  display: "flex", alignItems: "center", gap: 10,
  padding: "10px 12px", borderRadius: 8,
  transition: "background 0.1s",
};
const promptRow = {
  padding: "8px 10px", borderRadius: 8, cursor: "pointer",
  border: "1px solid var(--border)", transition: "all 0.15s",
};
