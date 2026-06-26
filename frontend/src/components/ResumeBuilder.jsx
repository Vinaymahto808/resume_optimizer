import { useState } from "react";
import { templates } from "../api";

const TEMPLATE_LAYOUT = {
  "simple-clean": "simple", "simple-minimal": "simple", "simple-basic": "simple", "simple-light": "simple",
  "modern-pro": "modern", "modern-sleek": "modern", "modern-vibrant": "modern", "modern-edge": "modern",
  "onecol-executive": "onecol", "onecol-professional": "onecol", "onecol-corporate": "onecol",
  "photo-profile": "photo", "photo-visual": "photo",
  "pro-classic": "professional", "pro-elegant": "professional", "pro-premium": "professional",
  "ats-optimized": "ats", "ats-max": "ats", "ats-ultra": "ats",
};

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
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/templates/download-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          template_id: templateId,
          layout_family: TEMPLATE_LAYOUT[templateId] || "",
          ...form,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
          experience: [],
          education: [],
          projects: [],
          certifications: [],
          achievements: [],
        }),
      });
      if (!res.ok) { alert("PDF download failed."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.full_name || "resume"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed. Try again.");
    }
    setDownloading(false);
  };

  const fields = [
    { name: "full_name", placeholder: "Full Name" },
    { name: "email", placeholder: "Email" },
    { name: "phone", placeholder: "Phone" },
    { name: "location", placeholder: "Location" },
    { name: "linkedin", placeholder: "LinkedIn username" },
    { name: "github", placeholder: "GitHub username" },
  ];

  return (
    <div style={styles.wrapper}>
      <button onClick={onBack} style={styles.backBtn}>
        {"<"} Back to Templates
      </button>
      <div className="ui-card" style={styles.card}>
        <h3 style={styles.title}>Customize Your Resume</h3>
        <div style={styles.grid}>
          {fields.map((f) => (
            <input
              key={f.name}
              style={styles.input}
              name={f.name}
              placeholder={f.placeholder}
              value={form[f.name]}
              onChange={handleChange}
            />
          ))}
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
        <div style={styles.btnRow}>
          <button style={styles.btn} onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating PDF..." : "Download PDF"}
          </button>
        </div>
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
    background: "rgba(15,23,42,0.72)",
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
    background: "rgba(15,23,42,0.72)",
    color: "var(--text)",
    outline: "none",
  },
  btnRow: { marginTop: 16, display: "flex", gap: 12 },
  btn: {
    flex: 1,
    padding: 13,
    background: "var(--accent-gradient)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius-sm)",
    fontSize: 16,
    fontWeight: 700,
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
};
