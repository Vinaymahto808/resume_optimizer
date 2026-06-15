import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { resumes } from "../api";

export default function Scan() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await resumes.upload(file);
      setUploading(false);
      const list = await resumes.list();
      if (list.length > 0) navigate(`/results/${list[0].id}`);
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.detail || "Upload failed. Try again.");
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <div style={styles.card}>
        <h2 style={styles.title}>Scan Your Resume</h2>
        <p style={styles.subtitle}>
          Upload your resume (PDF, DOCX, or TXT) and get an instant ATS
          compatibility score with detailed breakdown.
        </p>

        <div
          style={styles.dropzone}
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <div>
              <div style={styles.fileIcon}>{uploading ? String.fromCodePoint(0x23F3) : String.fromCodePoint(0x2705)}</div>
              <p style={styles.fileName}>{file.name}</p>
              <p style={styles.fileSize}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <div style={styles.dropIcon}>{String.fromCodePoint(0x1F4C4)}</div>
              <p style={styles.dropText}>
                Click to upload or drag & drop
              </p>
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
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 64px)",
    padding: "24px",
    position: "relative",
  },
  bgGlow: {
    position: "absolute",
    top: "30%",
    left: "50%",
    width: 400,
    height: 400,
    background:
      "radial-gradient(circle, rgba(79,125,255,0.08) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 520,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 40,
    textAlign: "center",
  },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginBottom: 28,
    lineHeight: 1.5,
  },
  dropzone: {
    border: "1px dashed var(--border)",
    borderRadius: "var(--radius)",
    padding: 40,
    cursor: "pointer",
    marginBottom: 20,
    transition: "background 0.15s",
  },
  dropIcon: { fontSize: 40, marginBottom: 12 },
  dropText: { fontWeight: 600, fontSize: 15, marginBottom: 4 },
  dropHint: { fontSize: 12, color: "var(--text-muted)" },
  fileIcon: { fontSize: 32, marginBottom: 8 },
  fileName: { fontWeight: 600, color: "var(--accent)", fontSize: 15 },
  fileSize: { fontSize: 12, color: "var(--text-muted)", marginTop: 4 },
  error: {
    color: "var(--danger)",
    fontSize: 13,
    marginBottom: 16,
    padding: "8px 12px",
    background: "rgba(248,113,113,0.1)",
    borderRadius: "var(--radius-sm)",
  },
  btn: { width: "100%" },
};
