import { useState, useEffect } from "react";
import { profile } from "../api";

export default function JobRecommender() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [minScore, setMinScore] = useState(20);

  useEffect(() => {
    const saved = sessionStorage.getItem("profileText");
    if (saved) setText(saved);
  }, []);

  const handleRecommend = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      sessionStorage.setItem("profileText", text);
      const data = await profile.recommendJobs(text);
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
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <h2 style={styles.title}>Job Recommender</h2>
      <p style={styles.subtitle}>
        Paste a profile or resume to find matching jobs from our database.
      </p>

      <div style={styles.card}>
        <textarea
          style={styles.textarea}
          rows={6}
          placeholder="Paste your LinkedIn profile text or resume content..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          className="btn-primary"
          onClick={handleRecommend}
          disabled={loading || !text.trim()}
          style={{ marginTop: 12 }}
        >
          {loading ? "Finding matches..." : "Find Matching Jobs"}
        </button>
      </div>

      {matches.length > 0 && (
        <>
          <div style={styles.filterBar}>
            <span style={styles.filterLabel}>Min Match: {minScore}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={styles.slider}
            />
            <span style={styles.filterCount}>{filtered.length} results</span>
          </div>

          <div style={styles.grid}>
            {filtered.map((m, i) => {
              const job = m.job;
              const color = matchColor(m.match_pct);
              return (
                <div key={i} style={styles.jobCard}>
                  <div style={styles.jobHeader}>
                    <div>
                      <h3 style={styles.jobTitle}>{job.title}</h3>
                      <p style={styles.jobMeta}>
                        {job.company} &middot; {job.location}
                      </p>
                    </div>
                    <div style={{ ...styles.scoreBadge, borderColor: `${color}40`, color }}>
                      {m.match_pct}%
                    </div>
                  </div>

                  <p style={styles.jobDesc}>{job.description?.slice(0, 200)}...</p>

                  <div style={styles.skillsRow}>
                    <div style={styles.skillsCol}>
                      <p style={styles.skillsLabel}>Matched</p>
                      <div style={styles.tagWrap}>
                        {m.matched_skills?.slice(0, 5).map((s) => (
                          <span key={s} style={styles.tagSuccess}>{s}</span>
                        ))}
                        {m.matched_skills?.length > 5 && (
                          <span style={styles.tagMore}>+{m.matched_skills.length - 5}</span>
                        )}
                      </div>
                    </div>
                    <div style={styles.skillsCol}>
                      <p style={{ ...styles.skillsLabel, color: "var(--danger)" }}>Missing</p>
                      <div style={styles.tagWrap}>
                        {m.missing_skills?.slice(0, 4).map((s) => (
                          <span key={s} style={styles.tagDanger}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                    style={styles.applyBtn}
                  >
                    Apply Now &rarr;
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

const styles = {
  wrapper: { maxWidth: 900, margin: "0 auto", padding: "40px 24px", position: "relative" },
  bgGlow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    width: 500,
    height: 500,
    background: "radial-gradient(circle, rgba(79,125,255,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4, position: "relative" },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, position: "relative" },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
    marginBottom: 16,
    position: "relative",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--text)",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical",
    lineHeight: 1.7,
    outline: "none",
    boxSizing: "border-box",
  },
  error: {
    color: "var(--danger)",
    fontSize: 13,
    padding: "8px 12px",
    background: "rgba(248,113,113,0.1)",
    borderRadius: "var(--radius-sm)",
    marginTop: 12,
  },
  filterBar: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "12px 20px",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    marginBottom: 16,
  },
  filterLabel: { fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" },
  slider: { flex: 1, maxWidth: 200, accentColor: "var(--accent)" },
  filterCount: { fontSize: 12, color: "var(--text-muted)" },
  grid: { display: "flex", flexDirection: "column", gap: 14 },
  jobCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
  },
  jobHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 },
  jobTitle: { fontSize: 16, fontWeight: 700, margin: 0 },
  jobMeta: { fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" },
  scoreBadge: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid",
    fontSize: 18,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  jobDesc: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 },
  skillsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 },
  skillsCol: {},
  skillsLabel: { fontSize: 11, fontWeight: 600, color: "var(--success)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 4 },
  tagSuccess: {
    background: "rgba(74,222,128,0.1)",
    color: "var(--success)",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    border: "1px solid rgba(74,222,128,0.2)",
  },
  tagDanger: {
    background: "rgba(248,113,113,0.1)",
    color: "var(--danger)",
    padding: "3px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    border: "1px solid rgba(248,113,113,0.2)",
  },
  tagMore: { fontSize: 11, color: "var(--text-muted)", padding: "3px 4px" },
  applyBtn: { display: "inline-block", fontSize: 12, padding: "8px 18px", textDecoration: "none" },
};
