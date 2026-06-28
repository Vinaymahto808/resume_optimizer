import { useState, useEffect } from "react";
import { ai, profile } from "../api";
import { useResume } from "../contexts/ResumeContext";

export default function AIAnalysis() {
  const { latestText } = useResume();
  const [text, setText] = useState(latestText || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoFired, setAutoFired] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("profileText");
    if (saved && !latestText) setText(saved);
  }, []);

  useEffect(() => {
    if (latestText && !autoFired && !loading && !result) {
      setText(latestText);
      setAutoFired(true);
      const timer = setTimeout(() => handleAnalyze(latestText), 300);
      return () => clearTimeout(timer);
    }
  }, [latestText]);

  const handleAnalyze = async (overrideText) => {
    const t = overrideText ?? text;
    if (!t.trim()) return;
    setLoading(true);
    setError("");
    try {
      sessionStorage.setItem("profileText", t);
      const data = await ai.analyze(t);
      setResult(data.data);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        "AI analysis failed. Make sure GROQ_API_KEY is set in the backend .env file.";
      setError(msg);
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <h2 style={styles.title}>AI Deep Analysis</h2>
      <p style={styles.subtitle}>
        Get an expert-level AI critique of your profile using Google Gemini.
      </p>

      <div className="ui-card" style={styles.card}>
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
          onClick={() => handleAnalyze()}
          disabled={loading || !text.trim()}
          style={{ marginTop: 12 }}
        >
          {loading ? "Running Deep Analysis..." : "Analyze with AI"}
        </button>
      </div>

      {result && (
        <div style={styles.results}>
          {result.overall_rating && (
            <div style={styles.scoreRow}>
              <div className="ui-card" style={styles.scoreCard}>
                <div
                  style={{
                    ...styles.scoreNum,
                    color:
                      result.overall_rating >= 7
                        ? "var(--success)"
                        : result.overall_rating >= 4
                        ? "var(--warning)"
                        : "var(--danger)",
                  }}
                >
                  {result.overall_rating}
                  <span style={styles.scoreMax}>/10</span>
                </div>
                <div style={styles.scoreLabel}>AI Rating</div>
              </div>
              {result.career_level && (
                <div className="ui-card" style={styles.scoreCard}>
                  <div style={styles.scoreNum}>{result.career_level}</div>
                  <div style={styles.scoreLabel}>Career Level</div>
                </div>
              )}
            </div>
          )}

          <div style={styles.grid}>
            {result.strengths?.length > 0 && (
              <div className="ui-card" style={{ ...styles.card, borderLeft: "3px solid var(--success)" }}>
                <h3 style={{ ...styles.cardTitle, color: "var(--success)" }}>Strengths</h3>
                <ul style={styles.list}>
                  {result.strengths.map((s, i) => (
                    <li key={i} style={styles.listItem}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.gaps?.length > 0 && (
              <div className="ui-card" style={{ ...styles.card, borderLeft: "3px solid var(--danger)" }}>
                <h3 style={{ ...styles.cardTitle, color: "var(--danger)" }}>Gaps</h3>
                <ul style={styles.list}>
                  {result.gaps.map((g, i) => (
                    <li key={i} style={styles.listItem}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {result.custom_suggestions?.length > 0 && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Suggestions</h3>
              <ul style={styles.list}>
                {result.custom_suggestions.map((s, i) => (
                  <li key={i} style={styles.listItem}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {result.headline_suggestion && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Suggested Headline</h3>
              <p style={styles.copyText}>{result.headline_suggestion}</p>
            </div>
          )}

          {result.impactful_rewrite && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Rewritten About Section</h3>
              <p style={styles.copyText}>{result.impactful_rewrite}</p>
            </div>
          )}

          {result.recommended_roles?.length > 0 && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Recommended Roles</h3>
              <ul style={styles.list}>
                {result.recommended_roles.map((r, i) => (
                  <li key={i} style={styles.listItem}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 800, margin: "0 auto", padding: "40px 24px", position: "relative" },
  bgGlow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    width: 500,
    height: 500,
    background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)",
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
    background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)",
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
  results: { marginTop: 24, display: "flex", flexDirection: "column", gap: 16 },
  scoreRow: { display: "flex", gap: 16 },
  scoreCard: {
    flex: 1,
    textAlign: "center",
    padding: 20,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
  },
  scoreNum: { fontSize: 36, fontWeight: 800 },
  scoreMax: { fontSize: 16, fontWeight: 400, color: "var(--text-muted)" },
  scoreLabel: { fontSize: 12, color: "var(--text-secondary)", marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12 },
  list: { margin: 0, paddingLeft: 20 },
  listItem: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.5 },
  copyText: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7, whiteSpace: "pre-wrap" },
};
