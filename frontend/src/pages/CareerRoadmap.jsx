import { useState } from "react";
import { ai } from "../api";

export default function CareerRoadmap() {
  const [role, setRole] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!role.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await ai.roadmap(role);
      setResult(data.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Roadmap generation failed. Make sure GEMINI_API_KEY is set."
      );
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <h2 style={styles.title}>Career Roadmap Generator</h2>
      <p style={styles.subtitle}>
        Get a personalized career roadmap with skills, projects, certifications, and interview prep.
      </p>

      <div className="ui-card" style={styles.card}>
        <input
          style={styles.input}
          placeholder="Enter your target role (e.g., Data Scientist)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          className="btn-primary"
          onClick={handleGenerate}
          disabled={loading || !role.trim()}
          style={{ marginTop: 12 }}
        >
          {loading ? "Generating Roadmap..." : "Generate Roadmap"}
        </button>
      </div>

      {result && (
        <div style={styles.results}>
          {/* Skills */}
          {result.skills?.length > 0 && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Skills</h3>
              {result.skills.map((group, i) => (
                <div key={i} style={styles.skillGroup}>
                  <div style={styles.skillLevel}>{group.level}</div>
                  <p style={styles.skillDesc}>{group.description}</p>
                  <div style={styles.skillTags}>
                    {group.skills_and_hours?.map((s, j) => (
                      <span key={j} style={styles.skillTag}>
                        {s.name}
                        <span style={styles.skillHours}>{s.hours}h</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {result.projects?.length > 0 && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Projects</h3>
              <div style={styles.projectGrid}>
                {result.projects.map((proj, i) => (
                  <div key={i} style={{
                    ...styles.projectCard,
                    borderTop: `3px solid ${
                      proj.tier === "Beginner" ? "var(--success)" :
                      proj.tier === "Intermediate" ? "var(--warning)" : "var(--danger)"
                    }`,
                  }}>
                    <div style={styles.projectTier}>{proj.tier}</div>
                    <h4 style={styles.projectTitle}>{proj.title}</h4>
                    <p style={styles.projectProblem}>{proj.problem_statement}</p>
                    <div style={styles.projectTech}>
                      {proj.tech_stack?.map((t, j) => (
                        <span key={j} style={styles.techTag}>{t}</span>
                      ))}
                    </div>
                    <ul style={styles.deliverableList}>
                      {proj.key_deliverables?.map((d, j) => (
                        <li key={j} style={styles.deliverableItem}>{d}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {result.certifications?.length > 0 && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Certifications</h3>
              <div style={styles.certGrid}>
                {result.certifications.map((cert, i) => (
                  <div key={i} style={styles.certItem}>
                    <div style={styles.certName}>{cert.name}</div>
                    <div style={styles.certProvider}>{cert.provider}</div>
                    <p style={styles.certRelevance}>{cert.relevance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Prep */}
          {result.interview_prep && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Interview Prep</h3>
              <div style={styles.weekGrid}>
                {result.interview_prep.week_plan?.map((week, i) => (
                  <div key={i} style={styles.weekCard}>
                    <div style={styles.weekNum}>Week {week.week}</div>
                    <div style={styles.weekFocus}>{week.focus}</div>
                    <ul style={styles.weekTopics}>
                      {week.topics?.map((t, j) => (
                        <li key={j} style={styles.weekTopicItem}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {result.interview_prep.mock_interview_focus?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={styles.sectionSubtitle}>Mock Interview Focus</h4>
                  <div style={styles.tagRow}>
                    {result.interview_prep.mock_interview_focus.map((f, i) => (
                      <span key={i} style={styles.focusTag}>{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.interview_prep.behavioral_themes?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h4 style={styles.sectionSubtitle}>Behavioral Themes</h4>
                  <div style={styles.tagRow}>
                    {result.interview_prep.behavioral_themes.map((t, i) => (
                      <span key={i} style={styles.themeTag}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
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
    position: "absolute", top: "20%", left: "50%", width: 500, height: 500,
    background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)", pointerEvents: "none",
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4, position: "relative" },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, position: "relative" },
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, marginBottom: 16, position: "relative",
  },
  input: {
    width: "100%", padding: "12px 14px", background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)", borderRadius: "var(--radius-sm)",
    color: "var(--text)", fontSize: 14, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box",
  },
  error: {
    color: "var(--danger)", fontSize: 13, padding: "8px 12px",
    background: "rgba(248,113,113,0.1)", borderRadius: "var(--radius-sm)", marginTop: 12,
  },
  results: { marginTop: 24, display: "flex", flexDirection: "column", gap: 16 },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  sectionSubtitle: { fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" },
  skillGroup: {
    marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--border)",
  },
  skillLevel: {
    display: "inline-block", padding: "2px 10px", borderRadius: 4,
    fontSize: 11, fontWeight: 700, color: "var(--accent)",
    background: "rgba(16,185,129,0.1)", marginBottom: 6,
  },
  skillDesc: { fontSize: 13, color: "var(--text-muted)", marginBottom: 8 },
  skillTags: { display: "flex", flexWrap: "wrap", gap: 6 },
  skillTag: {
    padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: "var(--bg-card)", border: "1px solid var(--border)",
    display: "inline-flex", alignItems: "center", gap: 6,
  },
  skillHours: { fontSize: 10, color: "var(--text-muted)", fontWeight: 400 },
  projectGrid: { display: "grid", gap: 16 },
  projectCard: {
    padding: 16, borderRadius: "var(--radius-sm)",
    background: "rgba(148,163,184,0.08)", border: "1px solid rgba(148,163,184,0.14)",
  },
  projectTier: {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    color: "var(--text-muted)", marginBottom: 4, letterSpacing: "0.5px",
  },
  projectTitle: { fontSize: 16, fontWeight: 600, marginBottom: 6 },
  projectProblem: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 },
  projectTech: { display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 },
  techTag: {
    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
    background: "rgba(16,185,129,0.08)", color: "var(--accent)",
  },
  deliverableList: { margin: 0, paddingLeft: 16 },
  deliverableItem: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 },
  certGrid: { display: "grid", gap: 12 },
  certItem: {
    padding: 12, borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(148,163,184,0.14)", background: "rgba(148,163,184,0.08)",
  },
  certName: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  certProvider: { fontSize: 12, color: "var(--accent)", fontWeight: 600, marginBottom: 4 },
  certRelevance: { fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 },
  weekGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  weekCard: {
    padding: 14, borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(148,163,184,0.14)", background: "rgba(148,163,184,0.08)",
  },
  weekNum: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    color: "var(--accent)", marginBottom: 4,
  },
  weekFocus: { fontSize: 14, fontWeight: 600, marginBottom: 8 },
  weekTopics: { margin: 0, paddingLeft: 14 },
  weekTopicItem: { fontSize: 12, color: "var(--text-secondary)", marginBottom: 3 },
  tagRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  focusTag: {
    padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: "rgba(79,70,229,0.1)", color: "var(--accent-indigo)",
    border: "1px solid rgba(79,70,229,0.15)",
  },
  themeTag: {
    padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: "rgba(16,185,129,0.08)", color: "var(--accent)",
    border: "1px solid rgba(16,185,129,0.15)",
  },
};
