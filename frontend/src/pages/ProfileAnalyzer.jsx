import { useState, useRef, useEffect } from "react";
import { profile, atsLegacy } from "../api";

export default function ProfileAnalyzer() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("manual");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobLoading, setJobLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const [step, setStep] = useState(-1);
  const inputRef = useRef();
  const jobsRef = useRef(null);

  const analyzeProfile = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setStep(0);
    try {
      const data = await profile.analyze(text);
      setResult(data.data);
      setStep(1);
      setLoading(false);

      setJobLoading(true);
      setStep(2);
      try {
        const jobData = await profile.recommendJobs(text);
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
      const data = await profile.fetchLinkedIn(url);
      if (data.success) {
        setText(data.text);
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
      <div style={styles.bgGlow} />
      <h2 style={styles.title}>Profile Analyzer</h2>
      <p style={styles.subtitle}>
        Paste your LinkedIn profile or upload a resume. Get keyword analysis, optimized copy, and matching jobs.
      </p>

      <div style={styles.tabs}>
        {["manual", "url", "upload"].map((m) => (
          <button
            key={m}
            style={{
              ...styles.tab,
              background: mode === m ? "var(--accent)" : "transparent",
              color: mode === m ? "#fff" : "var(--text-secondary)",
            }}
            onClick={() => setMode(m)}
          >
            {m === "manual" ? "Paste Text" : m === "url" ? "LinkedIn URL" : "Upload"}
          </button>
        ))}
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

        {mode === "manual" && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button
              onClick={() => setText(SAMPLE_TEXT)}
              style={{
                background: "none", border: "none", color: "var(--accent)", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit", fontWeight: 500, padding: 0,
              }}
            >
              Load sample profile &rarr;
            </button>
          </div>
        )}

        {(mode === "manual" || mode === "url") && (
          <textarea
            style={styles.textarea}
            rows={8}
            placeholder="Paste your LinkedIn About / Summary section here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        )}

        {text && <p style={styles.charCount}>{text.length} characters</p>}
        {error && <p style={styles.error}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            className="btn-primary"
            onClick={analyzeProfile}
            disabled={loading || !text.trim()}
          >
            {loading ? "Analyzing..." : "Analyze Profile"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => { setText(""); setResult(null); setMatches([]); setStep(-1); }}
          >
            Clear
          </button>
        </div>
      </div>

      {result && (
        <div style={styles.results}>
          {/* Overall Score */}
          {result.strength && (
            <div style={styles.scoreRow}>
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

          {/* Keyword Categories */}
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
                        <span style={{ ...styles.catScore, color }}>
                          {info.matched}/{info.total}
                        </span>
                      </div>
                      {info.matched_keywords?.length > 0 && (
                        <div style={styles.keywordRow}>
                          {info.matched_keywords.map((kw) => (
                            <span key={kw} style={styles.keywordTag}>{kw}</span>
                          ))}
                        </div>
                      )}
                      <div style={styles.barBg}>
                        <div
                          style={{
                            ...styles.barFill,
                            width: `${Math.min(pct, 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Strengths & Gaps */}
          <div style={styles.splitGrid}>
            {result.strength?.strengths?.length > 0 && (
              <div style={{ ...styles.card, borderTop: "3px solid var(--success)" }}>
                <h3 style={{ ...styles.cardTitle, color: "var(--success)" }}>
                  Strengths
                </h3>
                <div style={styles.statGrid}>
                  {result.strength.strengths.map(([cat, score]) => (
                    <div key={cat} style={styles.statItem}>
                      <span style={styles.statName}>{cat}</span>
                      <span style={{ ...styles.statPct, color: "var(--success)" }}>
                        {score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.strength?.weaknesses?.length > 0 && (
              <div style={{ ...styles.card, borderTop: "3px solid var(--danger)" }}>
                <h3 style={{ ...styles.cardTitle, color: "var(--danger)" }}>
                  Gaps to Fix
                </h3>
                <div style={styles.statGrid}>
                  {result.strength.weaknesses.map(([cat, score]) => (
                    <div key={cat} style={styles.statItem}>
                      <span style={styles.statName}>{cat}</span>
                      <span style={{ ...styles.statPct, color: "var(--danger)" }}>
                        {score}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
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

          {/* Optimized Headline */}
          {result.optimized_headline && (
            <div style={{ ...styles.card, borderLeft: "3px solid var(--accent)" }}>
              <h3 style={styles.cardTitle}>Optimized Headline</h3>
              <p style={styles.copyText}>{result.optimized_headline}</p>
            </div>
          )}

          {/* Optimized About */}
          {result.optimized_about && (
            <div style={{ ...styles.card, borderLeft: "3px solid #a78bfa" }}>
              <h3 style={styles.cardTitle}>Optimized About Section</h3>
              <p style={styles.copyText}>{result.optimized_about}</p>
            </div>
          )}
        </div>
      )}

      {/* Job Recommendations */}
      <div ref={jobsRef} style={styles.jobsSection}>
        <div style={styles.jobsHeader}>
          <h3 style={styles.jobsTitle}>Recommended Jobs</h3>
          {step >= 2 && (
            <span style={styles.jobsBadge}>
              {matches.length} matches
            </span>
          )}
        </div>

        {step >= 2 && jobLoading && (
          <div style={styles.loadingJobs}>Finding matching jobs...</div>
        )}

        {step >= 3 && matches.length === 0 && !jobLoading && (
          <div style={styles.noJobs}>Add more keywords to your profile to get job matches.</div>
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
                      <p style={styles.jobMeta}>
                        {job.company} &middot; {job.location}
                      </p>
                    </div>
                    <div style={{ ...styles.jobScore, color, borderColor: `${color}40` }}>
                      {m.match_pct}%
                    </div>
                  </div>

                  <div style={styles.skillsRow}>
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

        {result && step < 2 && (
          <div style={styles.loadingJobs}>Job recommendations will appear here after analysis...</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 860, margin: "0 auto", padding: "40px 24px", position: "relative" },
  bgGlow: {
    position: "absolute", top: "15%", left: "50%", width: 500, height: 500,
    background: "radial-gradient(circle, rgba(79,125,255,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)", pointerEvents: "none",
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4, position: "relative" },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, position: "relative" },
  tabs: {
    display: "flex", gap: 4, marginBottom: 16, background: "var(--bg-card)",
    border: "1px solid var(--border)", borderRadius: 8, padding: 4, maxWidth: 340, position: "relative",
  },
  tab: {
    padding: "7px 18px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", flex: 1,
  },
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, marginBottom: 16, position: "relative",
  },
  urlRow: { display: "flex", gap: 8, alignItems: "center" },
  input: {
    width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)",
    fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  },
  dropzone: {
    border: "2px dashed var(--border)", borderRadius: "var(--radius)", padding: 40,
    textAlign: "center", cursor: "pointer", marginBottom: 16,
  },
  dropText: { fontWeight: 600, fontSize: 14, color: "var(--text-secondary)" },
  textarea: {
    width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text)",
    fontSize: 14, fontFamily: "inherit", resize: "vertical", lineHeight: 1.7,
    outline: "none", boxSizing: "border-box",
  },
  charCount: { fontSize: 12, color: "var(--text-muted)", marginTop: 8 },
  error: {
    color: "var(--danger)", fontSize: 13, padding: "8px 12px",
    background: "rgba(248,113,113,0.1)", borderRadius: "var(--radius-sm)", marginTop: 12,
  },
  results: { marginTop: 24, display: "flex", flexDirection: "column", gap: 14 },

  scoreRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  scoreCard: { textAlign: "center", padding: 20, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" },
  scoreNum: { fontSize: 36, fontWeight: 800, color: "var(--accent)" },
  scoreLabel: { fontSize: 12, color: "var(--text-secondary)", marginTop: 4 },

  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12 },
  barWrap: { display: "flex", flexDirection: "column", gap: 16 },
  catBlock: {},
  catHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  catName: { fontSize: 13, fontWeight: 600 },
  catScore: { fontSize: 13, fontWeight: 700 },
  keywordRow: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 },
  keywordTag: {
    background: "rgba(79,125,255,0.08)", color: "var(--accent)", padding: "2px 8px",
    borderRadius: 4, fontSize: 11, fontWeight: 500, border: "1px solid rgba(79,125,255,0.15)",
  },
  barBg: { height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.6s" },

  splitGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  statGrid: { display: "flex", flexDirection: "column", gap: 8 },
  statItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 },
  statName: { fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" },
  statPct: { fontSize: 14, fontWeight: 700 },

  suggestWrap: { display: "flex", flexDirection: "column", gap: 8 },
  suggestItem: {
    padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
    background: "rgba(79,125,255,0.04)", border: "1px solid rgba(79,125,255,0.08)",
    borderLeft: "3px solid var(--accent)", borderRadius: 8,
  },
  copyText: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 },

  /* Jobs section */
  jobsSection: { marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--border)" },
  jobsHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  jobsTitle: { fontSize: 20, fontWeight: 700, margin: 0 },
  jobsBadge: {
    background: "rgba(79,125,255,0.12)", color: "var(--accent)", padding: "3px 12px",
    borderRadius: 12, fontSize: 12, fontWeight: 600, border: "1px solid rgba(79,125,255,0.2)",
  },
  loadingJobs: { fontSize: 14, color: "var(--text-muted)", padding: 20, textAlign: "center" },
  noJobs: { fontSize: 14, color: "var(--text-muted)", padding: 20, textAlign: "center" },
  jobsGrid: { display: "flex", flexDirection: "column", gap: 14 },
  jobCard: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20,
  },
  jobTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 10 },
  jobTitle: { fontSize: 15, fontWeight: 700, margin: 0 },
  jobMeta: { fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" },
  jobScore: { padding: "8px 14px", borderRadius: 8, border: "1px solid", fontSize: 18, fontWeight: 800, whiteSpace: "nowrap" },
  skillsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  skillsLabel: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 4 },
  tagSuccess: {
    background: "rgba(74,222,128,0.1)", color: "var(--success)", padding: "3px 8px",
    borderRadius: 4, fontSize: 11, fontWeight: 500, border: "1px solid rgba(74,222,128,0.2)",
  },
  tagDanger: {
    background: "rgba(248,113,113,0.1)", color: "var(--danger)", padding: "3px 8px",
    borderRadius: 4, fontSize: 11, fontWeight: 500, border: "1px solid rgba(248,113,113,0.2)",
  },
  tagMore: { fontSize: 11, color: "var(--text-muted)", padding: "3px 4px" },
  applyBtn: { display: "inline-block", fontSize: 12, padding: "8px 18px", textDecoration: "none" },
};
