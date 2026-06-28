import { useState, useRef, useEffect } from "react";
import { v1, atsLegacy } from "../api";
import { useResume } from "../contexts/ResumeContext";

export default function ProfileAnalyzer() {
  const { latestText } = useResume();
  const [text, setText] = useState(latestText || "");
  const [mode, setMode] = useState("manual");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobLoading, setJobLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState(-1);
  const [autoFired, setAutoFired] = useState(false);
  const inputRef = useRef();
  const jobsRef = useRef(null);

  useEffect(() => {
    if (latestText && !autoFired && !result && !loading) {
      setText(latestText);
      setAutoFired(true);
      const timer = setTimeout(() => analyzeProfile(), 300);
      return () => clearTimeout(timer);
    }
  }, [latestText]);

  const analyzeProfile = async (overrideText) => {
    const t = overrideText ?? text;
    if (!t.trim()) return;
    setLoading(true);
    setError("");
    setStep(0);
    try {
      const data = await v1.analyze(text);
      setResult(data.data);
      setStep(1);
      setLoading(false);

      setJobLoading(true);
      setStep(2);
      try {
        const jobData = await v1.matchJobs(text);
        setMatches(jobData.data || []);
        setStep(3);
      } catch {
        setMatches([]);
      }
      setJobLoading(false);

      setTimeout(() => {
        jobsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed");
      setLoading(false);
      setJobLoading(false);
      setStep(-1);
    }
  };

  const handleFetchLinkedIn = async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      const data = await v1.scrapeLinkedIn(url);
      if (data.success) {
        setText(data.data.text || data.text || "");
        setError("");
      } else {
        setError(data.error || "Could not fetch profile");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Fetch failed");
    }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await atsLegacy.upload(file);
      if (data.success) {
        setText(data.text);
      } else {
        setError(data.detail || "Upload failed");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed");
    }
    setLoading(false);
  };

  const matchColor = (pct) => {
    if (pct >= 60) return "var(--success)";
    if (pct >= 35) return "var(--warning)";
    return "var(--danger)";
  };

  const SAMPLE_TEXT =
    "B.Tech CS graduate with expertise in machine learning, NLP, and data analysis. " +
    "Proficient in Python, SQL, Pandas, Scikit-learn, and PyTorch. Built NLP/OCR pipelines " +
    "processing 100+ documents per batch with 60% throughput improvement through quantization. " +
    "Developed multi-agent AI systems for medical summarization using Groq llama-3.3-70b. " +
    "Built semantic search engines with TF-IDF and FAISS for 10,000+ policy documents. " +
    "Created ML prediction systems with 85%+ cross-validated accuracy deployed on Streamlit. " +
    "Deployed 5+ production applications on GCP, Render, and Streamlit Cloud with CI/CD.";

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Profile Analyzer</h2>
      <p style={styles.subtitle}>
        Paste your LinkedIn profile or upload a resume. Get keyword analysis, optimized copy, and matching jobs.
      </p>

      <div style={styles.tabs}>
        {["manual", "url", "upload"].map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              style={{
                ...styles.tab,
                background: active ? "rgba(34,197,94,0.14)" : "transparent",
                color: active ? "#dcfce7" : "var(--text-muted)",
                boxShadow: active ? "0 1px 3px rgba(2,6,23,0.25)" : "none",
              }}
              onClick={() => setMode(m)}
            >
              {m === "manual" ? "Paste Text" : m === "url" ? "LinkedIn URL" : "Upload"}
            </button>
          );
        })}
      </div>

      <div style={styles.card}>
        {mode === "url" ? (
          <div style={styles.urlRow}>
            <input
              style={{ ...styles.input, flex: 1, marginBottom: 0 }}
              placeholder="https://linkedin.com/in/username"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button className="btn-primary" onClick={handleFetchLinkedIn} disabled={loading}>
              Fetch
            </button>
          </div>
        ) : mode === "upload" ? (
          <div style={styles.dropzone} onClick={() => inputRef.current?.click()}>
            <p style={styles.dropText}>Click to upload a resume (PDF/DOCX)</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={handleUpload}
            />
          </div>
        ) : null}

        {(mode === "manual" || mode === "url") && (
          <div style={styles.textareaWrap}>
            {mode === "manual" && (
              <button onClick={() => setText(SAMPLE_TEXT)} style={styles.sampleBtn}>
                Load sample profile &rarr;
              </button>
            )}
            <textarea
              style={styles.textarea}
              rows={8}
              placeholder="Paste your LinkedIn About / Summary section here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        )}

        {text && <p style={styles.charCount}>{text.length} characters</p>}
        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actionRow}>
          <button
            className="btn-primary"
            onClick={() => analyzeProfile()}
            disabled={loading || !text.trim()}
          >
            {loading ? "Analyzing..." : "Analyze Profile"}
          </button>
          <button className="btn-secondary" onClick={() => { setText(""); setResult(null); setMatches([]); setStep(-1); }}>
            Clear
          </button>
        </div>
      </div>

      {result && (
        <div style={styles.results}>
          {result.strength && (
            <div className="profile-score-row" style={styles.scoreRow}>
              <div style={styles.scoreCard}>
                <div style={styles.scoreNum}>{result.strength.weighted_score}%</div>
                <div style={styles.scoreLabel}>Overall Score</div>
              </div>
              {result.keywords && (
                <div style={styles.scoreCard}>
                  <div style={styles.scoreNum}>{result.keywords.total_matched}</div>
                  <div style={styles.scoreLabel}>Keywords Matched</div>
                </div>
              )}
              {result.sections && (
                <div style={styles.scoreCard}>
                  <div style={styles.scoreNum}>{result.sections.word_count}</div>
                  <div style={styles.scoreLabel}>Words</div>
                </div>
              )}
            </div>
          )}

          {result.keywords?.categories && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Keyword Categories</h3>
              <div style={styles.barWrap}>
                {Object.entries(result.keywords.categories).map(([cat, info]) => {
                  const pct = info.total > 0 ? Math.round((info.matched / info.total) * 100) : 0;
                  const color = pct >= 50 ? "var(--success)" : pct >= 25 ? "var(--warning)" : "var(--danger)";
                  return (
                    <div key={cat} style={styles.catBlock}>
                      <div style={styles.catHeader}>
                        <span style={styles.catName}>{cat}</span>
                        <span style={{ ...styles.catScore, color }}>{info.count}/{info.total}</span>
                      </div>
                      {info.matched?.length > 0 && (
                        <div style={styles.keywordRow}>
                          {info.matched.map((kw) => (
                            <span key={kw} style={styles.keywordTag}>{kw}</span>
                          ))}
                        </div>
                      )}
                      <div style={styles.barBg}>
                        <div style={{ ...styles.barFill, width: `${Math.min(pct, 100)}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="profile-split-grid" style={styles.splitGrid}>
            {result.strength?.strengths?.length > 0 && (
              <div style={{ ...styles.card, borderTop: "3px solid var(--success)" }}>
                <h3 style={{ ...styles.cardTitle, color: "var(--success)" }}>Strengths</h3>
                <div style={styles.statGrid}>
                  {result.strength.strengths.map(([cat, score]) => (
                    <div key={cat} style={styles.statItem}>
                      <span style={styles.statName}>{cat}</span>
                      <span style={{ ...styles.statPct, color: "var(--success)" }}>{score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.strength?.weaknesses?.length > 0 && (
              <div style={{ ...styles.card, borderTop: "3px solid var(--danger)" }}>
                <h3 style={{ ...styles.cardTitle, color: "var(--danger)" }}>Gaps to Fix</h3>
                <div style={styles.statGrid}>
                  {result.strength.weaknesses.map(([cat, score]) => (
                    <div key={cat} style={styles.statItem}>
                      <span style={styles.statName}>{cat}</span>
                      <span style={{ ...styles.statPct, color: "var(--danger)" }}>{score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {result.suggestions?.length > 0 && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Suggestions</h3>
              <div style={styles.suggestWrap}>
                {result.suggestions.map((s, i) => (
                  <div key={i} style={styles.suggestItem}>{s}</div>
                ))}
              </div>
            </div>
          )}

          {result.optimized_headline && (
            <div style={{ ...styles.card, borderLeft: "3px solid var(--accent)" }}>
              <h3 style={styles.cardTitle}>Optimized Headline</h3>
              <p style={styles.copyText}>{result.optimized_headline}</p>
            </div>
          )}

          {result.optimized_about && (
            <div style={{ ...styles.card, borderLeft: "3px solid #a78bfa" }}>
              <h3 style={styles.cardTitle}>Optimized About Section</h3>
              <p style={styles.copyText}>{result.optimized_about}</p>
            </div>
          )}
        </div>
      )}

      <div ref={jobsRef} style={styles.jobsSection}>
        <div style={styles.jobsHeader}>
          <h3 style={styles.jobsTitle}>Recommended Jobs</h3>
          {step >= 2 && (
            <span style={styles.jobsBadge}>{matches.length} matches</span>
          )}
        </div>

        {step < 2 && !result && (
          <div style={styles.emptyState}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <p style={styles.emptyText}>Analyze your profile above to populate custom matching jobs here.</p>
          </div>
        )}

        {step >= 2 && jobLoading && (
          <div style={styles.loadingJobs}>Finding matching jobs...</div>
        )}

        {step >= 3 && matches.length === 0 && !jobLoading && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Add more keywords to your profile to get job matches.</p>
          </div>
        )}

        {step < 2 && result && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Job recommendations will appear here after analysis...</p>
          </div>
        )}

        {matches.length > 0 && (
          <div style={styles.jobsGrid}>
            {matches.map((m, i) => {
              const job = m.job;
              const color = matchColor(m.match_pct);
              return (
                <div key={i} style={styles.jobCard}>
                  <div style={styles.jobTop}>
                    <div>
                      <h4 style={styles.jobTitle}>{job.title}</h4>
                      <p style={styles.jobMeta}>{job.company} &middot; {job.location}</p>
                    </div>
                    <div style={{ ...styles.jobScore, color, borderColor: `${color}40` }}>{m.match_pct}%</div>
                  </div>
                  <div className="profile-skills-row" style={styles.skillsRow}>
                    <div>
                      <p style={{ ...styles.skillsLabel, color: "var(--success)" }}>Matched</p>
                      <div style={styles.tagWrap}>
                        {m.matched_skills?.slice(0, 5).map((s) => (
                          <span key={s} style={styles.tagSuccess}>{s}</span>
                        ))}
                        {m.matched_skills?.length > 5 && (
                          <span style={styles.tagMore}>+{m.matched_skills.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p style={{ ...styles.skillsLabel, color: "var(--danger)" }}>Missing</p>
                      <div style={styles.tagWrap}>
                        {m.missing_skills?.slice(0, 4).map((s) => (
                          <span key={s} style={styles.tagDanger}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <a href={job.url} target="_blank" rel="noreferrer" className="btn-primary" style={styles.applyBtn}>
                    Apply Now &rarr;
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 860, margin: "0 auto", padding: "40px 24px", position: "relative" },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4, color: "var(--text)" },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 },

  /* Segmented Control */
  tabs: {
    display: "flex", gap: 2, marginBottom: 16,
    background: "rgba(148,163,184,0.08)", borderRadius: 8, padding: 3,
    maxWidth: 340, position: "relative",
  },
  tab: {
    padding: "8px 18px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", flex: 1,
  },

  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, marginBottom: 16,
  },
  urlRow: { display: "flex", gap: 8, alignItems: "center" },
  input: {
    width: "100%", padding: "10px 14px", background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)", borderRadius: "var(--radius-sm)", color: "var(--text)",
    fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  },
  dropzone: {
    border: "1px dashed rgba(148,163,184,0.22)", borderRadius: "var(--radius)", padding: 40,
    textAlign: "center", cursor: "pointer", marginBottom: 16, background: "rgba(15,23,42,0.7)",
  },
  dropText: { fontWeight: 600, fontSize: 14, color: "var(--text-secondary)" },

  /* Textarea with sample button */
  textareaWrap: { position: "relative" },
  sampleBtn: {
    position: "absolute", top: 8, right: 8, zIndex: 1,
    background: "none", border: "none", color: "var(--accent)", fontSize: 12,
    cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: "4px 8px",
    borderRadius: 4,
  },
  textarea: {
    width: "100%", padding: "12px 14px", background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)", borderRadius: "var(--radius-sm)", color: "var(--text)",
    fontSize: 14, fontFamily: "inherit", resize: "vertical", lineHeight: 1.7,
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  charCount: { fontSize: 12, color: "var(--text-muted)", marginTop: 8 },
  error: {
    color: "var(--danger)", fontSize: 13, padding: "8px 12px",
    background: "var(--danger-soft)", borderRadius: "var(--radius-sm)", margin: "12px 0 0",
  },

  actionRow: { display: "flex", gap: 10, marginTop: 16 },

  results: { marginTop: 24, display: "flex", flexDirection: "column", gap: 14 },

  scoreRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  scoreCard: { textAlign: "center", padding: 20, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" },
  scoreNum: { fontSize: 36, fontWeight: 800, color: "var(--accent)" },
  scoreLabel: { fontSize: 12, color: "var(--text-secondary)", marginTop: 4 },

  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--text)" },
  barWrap: { display: "flex", flexDirection: "column", gap: 16 },
  catBlock: {},
  catHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  catName: { fontSize: 13, fontWeight: 600, color: "var(--text)" },
  catScore: { fontSize: 13, fontWeight: 700 },
  keywordRow: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 },
  keywordTag: {
    background: "rgba(16,185,129,0.08)", color: "var(--accent)", padding: "2px 8px",
    borderRadius: 4, fontSize: 11, fontWeight: 500, border: "1px solid rgba(16,185,129,0.15)",
  },
  barBg: { height: 8, background: "rgba(148,163,184,0.08)", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.6s" },

  splitGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  statGrid: { display: "flex", flexDirection: "column", gap: 8 },
  statItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(148,163,184,0.08)", borderRadius: 8, border: "1px solid rgba(148,163,184,0.08)" },
  statName: { fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" },
  statPct: { fontSize: 14, fontWeight: 700 },

  suggestWrap: { display: "flex", flexDirection: "column", gap: 8 },
  suggestItem: {
    padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
    background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.14)", borderLeft: "3px solid var(--accent)", borderRadius: 8,
  },
  copyText: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 },

  /* Jobs section */
  jobsSection: { marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--border)" },
  jobsHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  jobsTitle: { fontSize: 20, fontWeight: 700, margin: 0, color: "var(--text)" },
  jobsBadge: {
    background: "var(--success-soft)", color: "var(--success)", padding: "3px 12px",
    borderRadius: 12, fontSize: 12, fontWeight: 600, border: "1px solid rgba(16,185,129,0.2)",
  },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "32px 20px", textAlign: "center" },
  emptyText: { fontSize: 14, color: "var(--text-muted)", fontStyle: "italic", margin: 0 },
  loadingJobs: { fontSize: 14, color: "var(--text-muted)", padding: 20, textAlign: "center" },
  jobsGrid: { display: "flex", flexDirection: "column", gap: 14 },
  jobCard: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, transition: "border-color 0.15s, box-shadow 0.15s",
  },
  jobTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 10 },
  jobTitle: { fontSize: 15, fontWeight: 700, margin: 0, color: "var(--text)" },
  jobMeta: { fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" },
  jobScore: { padding: "8px 14px", borderRadius: 8, border: "1px solid", fontSize: 18, fontWeight: 800, whiteSpace: "nowrap" },
  skillsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  skillsLabel: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 4 },
  tagSuccess: {
    background: "rgba(16,185,129,0.08)", color: "var(--success)", padding: "3px 8px",
    borderRadius: 4, fontSize: 11, fontWeight: 500, border: "1px solid rgba(16,185,129,0.15)",
  },
  tagDanger: {
    background: "var(--danger-soft)", color: "var(--danger)", padding: "3px 8px",
    borderRadius: 4, fontSize: 11, fontWeight: 500, border: "1px solid rgba(239,68,68,0.15)",
  },
  tagMore: { fontSize: 11, color: "var(--text-muted)", padding: "3px 4px" },
  applyBtn: { display: "inline-block", fontSize: 12, padding: "8px 18px", textDecoration: "none" },
};
