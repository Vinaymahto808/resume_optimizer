import { useState, useEffect, useRef } from "react";
import { v1, atsLegacy } from "../api";
import { useResume } from "../contexts/ResumeContext";

const portalLogos = {
  LinkedIn: "🔗",
  "Naukri.com": "📋",
  Indeed: "💼",
  Glassdoor: "🏢",
  Wellfound: "⚡",
  ZipRecruiter: "📌",
  "Google Jobs": "🔍",
  Monster: "👾",
  TimesJobs: "⏰",
  Dice: "🎲",
  CutShort: "✂️",
  Shine: "✨",
  Hirect: "🎯",
};

export default function JobRecommender() {
  const { latestText } = useResume();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState(latestText || "");
  const [minScore, setMinScore] = useState(20);
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [autoFired, setAutoFired] = useState(false);
  const [inputMode, setInputMode] = useState("paste");
  const inputRef = useRef();

  useEffect(() => {
    const saved = sessionStorage.getItem("profileText");
    if (saved && !latestText) setText(saved);
  }, []);

  useEffect(() => {
    if (latestText && !autoFired && !loading && matches.length === 0) {
      setText(latestText);
      setAutoFired(true);
      const timer = setTimeout(() => handleRecommend(latestText), 300);
      return () => clearTimeout(timer);
    }
  }, [latestText]);

  const handleFileUpload = async () => {
    if (!file) return;
    setExtracting(true);
    setError("");
    try {
      const result = await atsLegacy.upload(file);
      if (result.success && result.text) {
        setText(result.text);
        sessionStorage.setItem("profileText", result.text);
      } else {
        setError("Could not extract text from file");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to extract text from file");
    }
    setExtracting(false);
  };

  const handleRecommend = async (overrideText) => {
    const t = overrideText ?? text;
    if (!t.trim()) return;
    setLoading(true);
    setError("");
    try {
      sessionStorage.setItem("profileText", t);
      const data = await v1.matchJobs(t);
      setMatches(data.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to get recommendations");
    }
    setLoading(false);
  };

  const filtered = matches.filter((m) => m.match_pct >= minScore);

  const matchColor = (pct) => {
    if (pct >= 60) return "var(--success)";
    if (pct >= 35) return "var(--warning)";
    return "var(--danger)";
  };

  return (
    <div style={s.wrapper}>
      <div style={s.headerRow}>
        <div>
          <div style={s.breadcrumb}>Jobs</div>
          <h2 style={s.title}>Job Recommendations</h2>
        </div>
        {matches.length > 0 && (
          <span style={s.resultBadge}>{filtered.length} matches</span>
        )}
      </div>
      <p style={s.subtitle}>
        Upload your resume or paste your profile to find matching jobs from 10+ job portals.
      </p>

      <div className="jobrec-split" style={s.splitLayout}>
        <div style={s.inputCol}>
          <div style={s.card}>
            <div style={s.tabs}>
              <button
                style={{ ...s.tab, background: inputMode === "paste" ? "rgba(34,197,94,0.14)" : "transparent", color: inputMode === "paste" ? "#dcfce7" : "var(--text-muted)", boxShadow: inputMode === "paste" ? "0 1px 3px rgba(2,6,23,0.25)" : "none" }}
                onClick={() => setInputMode("paste")}
              >
                ✍️ Paste Profile Text
              </button>
              <button
                style={{ ...s.tab, background: inputMode === "upload" ? "rgba(34,197,94,0.14)" : "transparent", color: inputMode === "upload" ? "#dcfce7" : "var(--text-muted)", boxShadow: inputMode === "upload" ? "0 1px 3px rgba(2,6,23,0.25)" : "none" }}
                onClick={() => setInputMode("upload")}
              >
                📄 Upload Resume
              </button>
            </div>

            {inputMode === "upload" ? (
              <div style={s.dropzone} onClick={() => inputRef.current?.click()}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 8 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
                </svg>
                {file ? (
                  <div>
                    <p style={s.fileName}>{file.name}</p>
                    <p style={s.fileSize}>{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p style={s.dropText}>Click to upload or drag & drop</p>
                    <p style={s.dropHint}>PDF, DOCX, or TXT &bull; max 10MB</p>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file && (
                  <button
                    className="btn-primary"
                    onClick={handleFileUpload}
                    disabled={extracting}
                    style={s.extractBtn}
                  >
                    {extracting ? "Extracting..." : "Extract Text"}
                  </button>
                )}
              </div>
            ) : (
              <textarea
                style={s.textarea}
                rows={7}
                placeholder="Paste your LinkedIn profile text or resume content..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            )}

            {error && <p style={s.error}>{error}</p>}

            <button
              className="btn-primary"
              onClick={() => handleRecommend()}
              disabled={loading || !text.trim()}
              style={s.ctaBtn}
            >
              {loading ? "Finding matches..." : "Find Matching Jobs"}
            </button>
          </div>
        </div>

        <div style={s.previewCol}>
          {matches.length === 0 && !loading && (
            <div style={s.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" style={{ marginBottom: 12, opacity: 0.4 }}>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                <path d="M7 8l3 3 4-4" />
              </svg>
              <p style={s.emptyTitle}>No results yet</p>
              <p style={s.emptyDesc}>Your matching roles will surface here instantly once analyzed.</p>
              <div style={s.emptySkeleton}>
                <div style={s.skelBar} />
                <div style={{ ...s.skelBar, width: "60%" }} />
                <div style={{ ...s.skelBar, width: "40%" }} />
                <div style={{ ...s.skelBar, width: "75%" }} />
              </div>
            </div>
          )}

          {loading && (
            <div style={s.emptyState}>
              <p style={s.emptyDesc}>Scanning 50,000+ job descriptions for your profile...</p>
              <div style={s.emptySkeleton}>
                <div style={s.skelBar} />
                <div style={{ ...s.skelBar, width: "60%" }} />
                <div style={{ ...s.skelBar, width: "40%" }} />
                <div style={{ ...s.skelBar, width: "75%" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {matches.length > 0 && (
        <>
          <div className="jobrec-filter-bar" style={s.filterBar}>
            <span style={s.filterLabel}>Min Match: {minScore}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={s.slider}
            />
            <span style={s.filterCount}>{filtered.length} of {matches.length} jobs</span>
          </div>

          <div style={s.grid}>
            {filtered.map((m, i) => {
              const job = m.job;
              const color = matchColor(m.match_pct);
              const portal = job.source || "LinkedIn";
              return (
                <div key={i} style={s.jobCard}>
                  <div style={s.jobHeader}>
                    <div>
                      <div style={s.portalBadge}>
                        <span>{portalLogos[portal] || "🔗"}</span>
                        <span style={s.portalName}>{portal}</span>
                      </div>
                      <h3 style={s.jobTitle}>{job.title}</h3>
                      <p style={s.jobMeta}>{job.company} &middot; {job.location}</p>
                    </div>
                    <div style={{ ...s.scoreBadge, borderColor: `${color}40`, color }}>{m.match_pct}%</div>
                  </div>
                  <p style={s.jobDesc}>{job.description?.slice(0, 200)}...</p>
                  <div className="jobrec-skills-row" style={s.skillsRow}>
                    <div style={s.skillsCol}>
                      <p style={s.skillsLabel}>Matched</p>
                      <div style={s.tagWrap}>
                        {m.matched_skills?.slice(0, 5).map((s) => (
                          <span key={s} style={s.tagSuccess}>{s}</span>
                        ))}
                        {m.matched_skills?.length > 5 && (
                          <span style={s.tagMore}>+{m.matched_skills.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div style={s.skillsCol}>
                      <p style={{ ...s.skillsLabel, color: "var(--danger)" }}>Missing</p>
                      <div style={s.tagWrap}>
                        {m.missing_skills?.slice(0, 4).map((s) => (
                          <span key={s} style={s.tagDanger}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <a href={job.url} target="_blank" rel="noreferrer" className="btn-primary" style={s.applyBtn}>
                    Apply on {portal} &rarr;
                  </a>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  wrapper: { maxWidth: 1100, margin: "0 auto", padding: "40px 24px", position: "relative" },
  headerRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  breadcrumb: {
    fontSize: 12, color: "var(--text-muted)", fontWeight: 600,
    letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2,
  },
  title: { fontSize: 28, fontWeight: 700, color: "var(--text)", margin: 0 },
  resultBadge: {
    padding: "4px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700,
    background: "var(--success-soft)", color: "var(--success)",
    border: "1px solid rgba(16,185,129,0.2)", whiteSpace: "nowrap", marginTop: 4,
  },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6, marginTop: 4 },

  splitLayout: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" },
  inputCol: {},
  previewCol: {},

  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, marginBottom: 16,
  },
  tabs: {
    display: "flex", gap: 2, marginBottom: 16,
    background: "rgba(148,163,184,0.08)", borderRadius: 8, padding: 3,
  },
  tab: {
    padding: "9px 16px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", flex: 1,
    whiteSpace: "nowrap",
  },

  dropzone: {
    border: "1px dashed rgba(148,163,184,0.22)", borderRadius: "var(--radius)",
    padding: 32, cursor: "pointer", marginBottom: 0,
    background: "rgba(15,23,42,0.7)", textAlign: "center",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  },
  dropText: { fontWeight: 600, fontSize: 14, color: "var(--text)" },
  dropHint: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  fileName: { fontSize: 14, fontWeight: 600, color: "var(--accent)" },
  fileSize: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  extractBtn: { marginTop: 12, fontSize: 12, padding: "8px 18px" },

  textarea: {
    width: "100%", padding: "12px 14px", background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)", borderRadius: "var(--radius-sm)", color: "var(--text)",
    fontSize: 14, fontFamily: "inherit", resize: "vertical", lineHeight: 1.7,
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  error: {
    color: "var(--danger)", fontSize: 13,
    padding: "8px 12px", background: "var(--danger-soft)",
    borderRadius: "var(--radius-sm)", marginTop: 12,
  },
  ctaBtn: { marginTop: 12, width: "100%" },

  /* Empty State */
  emptyState: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "40px 24px",
    textAlign: "center", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: "var(--text)", margin: 0 },
  emptyDesc: { fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0, maxWidth: 260 },
  emptySkeleton: { display: "flex", flexDirection: "column", gap: 8, marginTop: 16, width: "100%", maxWidth: 220 },
  skelBar: {
    height: 10, borderRadius: 999, background: "var(--bg-soft)",
    width: "100%", opacity: 0.6,
  },

  filterBar: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "12px 20px", background: "var(--bg-card)",
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    marginBottom: 16,
  },
  filterLabel: { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" },
  slider: { flex: 1, maxWidth: 200, accentColor: "var(--accent)" },
  filterCount: { fontSize: 12, color: "var(--text-muted)" },
  grid: { display: "flex", flexDirection: "column", gap: 14 },
  jobCard: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20,
  },
  jobHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 },
  portalBadge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "rgba(16,185,129,0.08)", color: "var(--accent)",
    padding: "2px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
    marginBottom: 8, border: "1px solid rgba(16,185,129,0.15)",
  },
  portalName: {},
  jobTitle: { fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" },
  jobMeta: { fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" },
  scoreBadge: {
    padding: "8px 14px", borderRadius: 8, border: "1px solid",
    fontSize: 18, fontWeight: 800, whiteSpace: "nowrap",
  },
  jobDesc: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 },
  skillsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  skillsCol: {},
  skillsLabel: { fontSize: 11, fontWeight: 600, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 4 },
  tagSuccess: {
    background: "rgba(16,185,129,0.08)", color: "var(--success)",
    padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
    border: "1px solid rgba(16,185,129,0.15)",
  },
  tagDanger: {
    background: "var(--danger-soft)", color: "var(--danger)",
    padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
    border: "1px solid rgba(239,68,68,0.15)",
  },
  tagMore: { fontSize: 11, color: "var(--text-muted)", padding: "3px 4px" },
  applyBtn: { display: "inline-block", fontSize: 12, padding: "8px 18px", textDecoration: "none" },
};
