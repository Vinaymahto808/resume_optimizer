import { useState } from "react";
import { templates } from "../api";

export default function ResumeBuilder({ templateId, onBack }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    github: "",
    summary: "",
    skills: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await templates.generate({
        template_id: templateId,
        ...form,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        achievements: [],
      });
      setResult(data);
    } catch {
      alert("Failed to generate resume. Try again.");
    }
    setLoading(false);
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.latex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (result) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.resultCard}>
          <h3 style={styles.resultTitle}>Resume Generated!</h3>
          <p style={styles.resultText}>
            Your LaTeX resume is ready. Download the .tex file and compile it
            with pdflatex.
          </p>
          <div style={styles.resultActions}>
            <button style={styles.btn} onClick={handleDownload}>
              Download .tex File
            </button>
            <button style={styles.btnOutline} onClick={() => setResult(null)}>
              Edit Again
            </button>
          </div>
          <details style={styles.preview}>
            <summary style={styles.previewSummary}>Preview LaTeX</summary>
            <pre style={styles.pre}>{result.latex.slice(0, 2000)}...</pre>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <button onClick={onBack} style={styles.backBtn}>
        {"<"} Back to Templates
      </button>
      <div style={styles.card}>
        <h3 style={styles.title}>Customize Your Resume</h3>

        <div style={styles.grid}>
          <input
            style={styles.input}
            name="full_name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={handleChange}
          />
          <input
            style={styles.input}
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
          />
          <input
            style={styles.input}
            name="phone"
            placeholder="Phone"
            value={form.phone}
            onChange={handleChange}
          />
          <input
            style={styles.input}
            name="location"
            placeholder="Location"
            value={form.location}
            onChange={handleChange}
          />
          <input
            style={styles.input}
            name="linkedin"
            placeholder="LinkedIn username"
            value={form.linkedin}
            onChange={handleChange}
          />
          <input
            style={styles.input}
            name="github"
            placeholder="GitHub username"
            value={form.github}
            onChange={handleChange}
          />
        </div>

        <textarea
          style={styles.textarea}
          name="summary"
          placeholder="Professional Summary"
          rows={3}
          value={form.summary}
          onChange={handleChange}
        />

        <input
          style={styles.input}
          name="skills"
          placeholder="Skills (comma-separated)"
          value={form.skills}
          onChange={handleChange}
        />

        <button
          style={styles.btn}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Resume"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 700, margin: "0 auto" },
  card: {
    background: "var(--bg-card)",
    padding: 32,
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
  },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 24, color: "var(--text)" },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 12,
  },
  input: {
    padding: "11px 14px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text)",
    outline: "none",
    fontFamily: "inherit",
  },
  textarea: {
    padding: "11px 14px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 12,
    fontFamily: "inherit",
    resize: "vertical",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text)",
    outline: "none",
  },
  btn: {
    width: "100%",
    padding: 13,
    background: "linear-gradient(135deg, #4f7dff, #6c5ce7)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 16,
    fontFamily: "inherit",
  },
  btnOutline: {
    padding: "10px 20px",
    background: "transparent",
    color: "var(--accent)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "var(--accent)",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    marginBottom: 16,
    fontFamily: "inherit",
  },
  resultCard: {
    background: "var(--bg-card)",
    padding: 32,
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    textAlign: "center",
  },
  resultTitle: { fontSize: 22, fontWeight: 700, color: "var(--success)", marginBottom: 8 },
  resultText: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 },
  resultActions: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 },
  preview: { marginTop: 16, textAlign: "left" },
  previewSummary: { cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--accent)" },
  pre: {
    background: "rgba(255,255,255,0.04)",
    padding: 16,
    borderRadius: "var(--radius-sm)",
    fontSize: 11,
    overflowX: "auto",
    marginTop: 8,
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
  },
};
