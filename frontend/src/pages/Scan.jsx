import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { v1 } from "../api";
import ProgressStepper from "../components/ProgressStepper";

const templateCards = [
  {
    name: "Monochrome",
    tag: "ATS-safe",
    accent: "#64748b",
    description: "Minimal single-column structure built for easy parsing and clean recruiter scans.",
    features: ["Simple headings", "No layout noise", "Easy PDF export"],
  },
  {
    name: "Midnight",
    tag: "Executive",
    accent: "#1e293b",
    description: "A confident dark header and balanced body spacing for senior and leadership profiles.",
    features: ["Premium visual weight", "High contrast", "Modern polish"],
  },
  {
    name: "Verdant",
    tag: "Modern",
    accent: "#10b981",
    description: "Clean green-accented layout for people who want a little personality without losing structure.",
    features: ["Color accents", "Balanced sections", "Fresh presentation"],
  },
  {
    name: "Celestial",
    tag: "Professional",
    accent: "#4f46e5",
    description: "A refined two-column template that keeps experience and skills easy to skim.",
    features: ["Elegant layout", "Compact sections", "Recruiter-friendly"],
  },
];

export default function Scan() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const inputRef = useRef();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const scanSteps = [
    { label: "Uploading", icon: "📄" },
    { label: "Parsing", icon: "🔍" },
    { label: "ATS Scoring", icon: "📊" },
    { label: "Generating", icon: "✨" },
  ];

  const pollStatus = async (taskId) => {
    try {
      const status = await v1.scanStatus(taskId);
      if (status.status === "completed") {
        setScanStep(3);
        setUploading(false);
        const resumeId = status.result?.resume_id;
        if (resumeId) {
          setTimeout(() => navigate(`/results/${resumeId}`), 600);
        } else {
          setError("Scan completed but result ID is missing");
          setUploading(false);
        }
      } else if (status.status === "failed") {
        setUploading(false);
        setError(status.error || "Scan failed");
      } else {
        setScanStep((s) => Math.min(s + 1, 2));
        setTimeout(() => { if (mountedRef.current) pollStatus(taskId); }, 1500);
      }
    } catch (err) {
      setUploading(false);
      setError("Failed to check scan status");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setScanStep(0);
    setError("");
    try {
      setTimeout(() => setScanStep(1), 800);
      const result = await v1.uploadResume(file);
      setScanStep(2);
      pollStatus(result.task_id);
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.detail || "Upload failed. Try again.");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.inner}>
        <section className="scan-hero" style={styles.hero}>
          <div style={styles.heroCopy}>
            <div style={styles.eyebrow}>ATS Resume Scanner</div>
            <h2 style={styles.title}>Scan your resume and pick a template that looks sharp everywhere.</h2>
            <p style={styles.subtitle}>
              Upload your resume to get an ATS compatibility score, then browse polished template options built for recruiters, hiring managers, and applicant tracking systems.
            </p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Upload Resume</h3>
            <p style={styles.cardSubtitle}>PDF, DOCX, or TXT files are supported. We'll score the file and show issues instantly.</p>

            <ProgressStepper
              active={uploading}
              currentStep={scanStep}
              customSteps={scanSteps}
              estimatedSeconds={25}
            />

            <div
              style={styles.dropzone}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
            >
              {file ? (
                <div>
                  <div style={styles.fileIcon}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />
                    </svg>
                  </div>
                  <p style={styles.fileName}>{file.name}</p>
                  <p style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <div style={styles.dropIcon}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" />
                    </svg>
                  </div>
                  <p style={styles.dropText}>Click to upload or drag & drop</p>
                  <p style={styles.dropHint}>PDF, DOCX, or TXT &bull; max 10MB</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              className="btn-primary"
              style={{ ...styles.btn, opacity: file && !uploading ? 1 : 0.4 }}
              disabled={!file || uploading}
              onClick={handleUpload}
            >
              {uploading ? "Analyzing..." : "Analyze for ATS Score"}
            </button>
          </div>
        </section>

        <section style={styles.templatesSection}>
          <div style={styles.sectionHead}>
            <div>
              <div style={styles.eyebrow}>Resume templates</div>
              <h3 style={styles.sectionTitle}>Professional templates ready for ATS and recruiter review</h3>
            </div>
            <Link to="/templates" className="btn-secondary" style={styles.sectionCta}>
              Browse all templates
            </Link>
          </div>

          <div className="scan-template-grid" style={styles.templateGrid}>
            {templateCards.map((template) => (
              <article key={template.name} style={styles.templateCard}>
                <div style={{ ...styles.templateAccent, background: template.accent }} />
                <div style={styles.templateBody}>
                  <div style={{ ...styles.templateTag, color: template.accent, background: `${template.accent}12` }}>{template.tag}</div>
                  <h4 style={styles.templateName}>{template.name}</h4>
                  <p style={styles.templateDescription}>{template.description}</p>
                  <div style={styles.featureRow}>
                    {template.features.map((feature) => (
                      <span key={feature} style={styles.featurePill}>{feature}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 78px)",
    padding: "clamp(28px, 4vw, 48px) 24px 48px",
    position: "relative",
    background: "var(--bg)",
  },
  inner: {
    maxWidth: 1240,
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: 28,
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 24,
    alignItems: "stretch",
  },
  heroCopy: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "18px 0",
  },
  eyebrow: {
    display: "inline-flex",
    alignSelf: "flex-start",
    padding: "6px 14px",
    borderRadius: 999,
    border: "1px solid rgba(34,197,94,0.18)",
    background: "var(--accent-soft)",
    color: "var(--accent)",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    marginBottom: 14,
  },
  card: {
    width: "100%",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 28,
    textAlign: "center",
    boxShadow: "var(--shadow-md)",
  },
  cardTitle: { fontSize: 20, fontWeight: 800, marginBottom: 8 },
  cardSubtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 },
  title: { fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, marginBottom: 14, lineHeight: 1.15, color: "var(--text)" },
  subtitle: {
    fontSize: 15,
    color: "var(--text-secondary)",
    marginBottom: 0,
    lineHeight: 1.7,
    maxWidth: 600,
  },
  dropzone: {
    border: "1px dashed rgba(148,163,184,0.22)",
    borderRadius: "var(--radius)",
    padding: 34,
    cursor: "pointer",
    marginBottom: 20,
    transition: "background 0.15s, border-color 0.15s",
    background: "var(--bg-soft)",
  },
  dropIcon: { marginBottom: 12 },
  dropText: { fontWeight: 600, fontSize: 15, marginBottom: 4, color: "var(--text)" },
  dropHint: { fontSize: 12, color: "var(--text-muted)" },
  fileIcon: { marginBottom: 8 },
  fileName: { fontWeight: 600, color: "var(--accent)", fontSize: 15 },
  fileSize: { fontSize: 12, color: "var(--text-muted)", marginTop: 4 },
  error: {
    color: "var(--danger)",
    fontSize: 13,
    marginBottom: 16,
    padding: "8px 12px",
    background: "var(--danger-soft)",
    borderRadius: "var(--radius-sm)",
  },
  btn: { width: "100%" },
  templatesSection: {
    padding: "10px 0 0",
  },
  sectionHead: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: "clamp(20px, 2.5vw, 30px)",
    fontWeight: 800,
    lineHeight: 1.15,
    marginTop: 8,
    color: "var(--text)",
  },
  sectionCta: {
    whiteSpace: "nowrap",
  },
  templateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },
  templateCard: {
    overflow: "hidden",
    borderRadius: "var(--radius)",
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  templateAccent: {
    height: 4,
    flexShrink: 0,
  },
  templateBody: {
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
  },
  templateTag: {
    display: "inline-flex",
    alignSelf: "flex-start",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  templateName: {
    fontSize: 17,
    fontWeight: 800,
    color: "var(--text)",
  },
  templateDescription: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.6,
  },
  featureRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: "auto",
  },
  featurePill: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "var(--bg-soft)",
    color: "var(--text-secondary)",
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid var(--border)",
  },
};
