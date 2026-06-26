import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { latex } from "../api";

const FONTS = ["modern", "sans", "serif", "elegant"];
const SPACING_OPTS = ["compact", "normal", "spacious"];
const COLORS_ARRAY = ["navy", "emerald", "crimson", "slate", "purple", "teal", "amber", "rose", "indigo", "zinc"];
const COLOR_HEX = { navy:"#1e3a5f", emerald:"#047857", crimson:"#b91c1c", slate:"#475569", purple:"#7e22ce", teal:"#0d9488", amber:"#b45309", rose:"#9f1239", indigo:"#3730a3", zinc:"#3f3f46" };
const PAPER_SIZES = ["a4paper", "letterpaper"];

const EMPTY_RESUME = {
  personal: { name: "", email: "", phone: "", linkedin: "", website: "", title: "", address: "" },
  summary: "", skills: [], education: [], experience: [], projects: [], certifications: [], languages: [], publications: [], awards: [],
};

export default function LatexBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("personal");
  const [resumeData, setResumeData] = useState(JSON.parse(JSON.stringify(EMPTY_RESUME)));
  const [config, setConfig] = useState({ color: "navy", font: "modern", spacing: "normal" });
  const [pdfUrl, setPdfUrl] = useState(null);
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [version, setVersion] = useState(1);
  const [savedVersions, setSavedVersions] = useState([]);
  const [toast, setToast] = useState(null);
  const previewRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    latex.list().then(r => {
      const data = r.data || [];
      const t = data.find(tm => tm.id === id) || data[0];
      setTemplate(t);
      if (t) setConfig(prev => ({ ...prev, ...t.config }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !resumeData.skills.includes(s)) {
      setResumeData(prev => ({ ...prev, skills: [...prev.skills, s] }));
      setSkillInput("");
    }
  };

  const addEntry = (section) => {
    const tpls = {
      education: { institution: "", degree: "", field: "", start_date: "", end_date: "", gpa: "" },
      experience: { company: "", role: "", location: "", start_date: "", end_date: "", current: false, bullets: [""] },
      projects: { name: "", description: "", technologies: [], url: "" },
      certifications: { name: "", issuer: "", date: "" },
      languages: { language: "", proficiency: "" },
    };
    setResumeData(prev => ({ ...prev, [section]: [...(prev[section] || []), tpls[section] || {}] }));
  };

  const updateEntry = (section, index, field, value) => {
    setResumeData(prev => {
      const items = [...(prev[section] || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [section]: items };
    });
  };

  const removeEntry = (section, index) => {
    setResumeData(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
  };

  const handleCompile = async () => {
    if (!template) return;
    setCompiling(true);
    setError("");
    try {
      const blob = await latex.customCompile({
        template_id: template.id,
        resume_data: resumeData,
        config,
      });
      const url = URL.createObjectURL(blob);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(url);
      showToast("PDF compiled successfully");
    } catch (e) {
      setError("Compilation failed. Ensure pdflatex is installed on the server.");
      showToast("Compilation failed", "error");
    } finally {
      setCompiling(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${template?.id || "resume"}-resume.pdf`;
    a.click();
  };

  const handleDownloadTex = () => {
    alert("Download .tex source coming soon");
  };

  const handleAutoSave = () => {
    try {
      localStorage.setItem(`latex_resume_${id}`, JSON.stringify({ data: resumeData, config, version }));
      showToast("Draft auto-saved");
    } catch {}
  };

  const handleSaveVersion = () => {
    const v = { version: version + 1, data: JSON.parse(JSON.stringify(resumeData)), config: { ...config }, date: new Date().toISOString() };
    setSavedVersions(prev => [v, ...prev]);
    setVersion(prev => prev + 1);
    showToast(`Version ${v.version} saved`);
  };

  const restoreVersion = (v) => {
    setResumeData(JSON.parse(JSON.stringify(v.data)));
    setConfig({ ...v.config });
    setVersion(v.version);
    showToast(`Version ${v.version} restored`);
  };

  const sections = [
    { id: "personal", label: "Personal", icon: "👤" },
    { id: "summary", label: "Summary", icon: "📝" },
    { id: "skills", label: "Skills", icon: "💼" },
    { id: "experience", label: "Experience", icon: "💻" },
    { id: "education", label: "Education", icon: "🎓" },
    { id: "projects", label: "Projects", icon: "🚀" },
    { id: "certifications", label: "Certifications", icon: "🏅" },
    { id: "languages", label: "Languages", icon: "🌐" },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(148,163,184,0.15)", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, margin: -28, height: "calc(100vh - 60px)" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 72, right: 24, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", borderRadius: 8,
          background: toast.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)",
          border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(248,113,113,0.3)"}`,
          color: toast.type === "success" ? "var(--success)" : "var(--danger)",
          fontSize: 12, fontWeight: 600,
          backdropFilter: "blur(12px)",
          animation: "slideDown 0.2s ease",
        }}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 20px", borderBottom: "1px solid var(--border)", background: "rgba(8,12,22,0.9)", backdropFilter: "blur(12px)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate("/templates")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, padding: "4px 8px", display: "flex", alignItems: "center" }}>←</button>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{template?.name || "Resume Builder"}</span>
          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.15)" }}>
            v{version}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="btn-secondary" style={{ fontSize: 11, padding: "6px 12px" }} onClick={handleAutoSave}>💾 Save</button>
          <button className="btn-secondary" style={{ fontSize: 11, padding: "6px 12px" }} onClick={handleSaveVersion}>📌 Version</button>
          <button className="btn-secondary" style={{ fontSize: 11, padding: "6px 12px" }} onClick={handleDownloadTex}>📄 .tex</button>
          <button className="btn-secondary" style={{ fontSize: 11, padding: "6px 12px" }} onClick={handleDownload} disabled={!pdfUrl}>⬇ PDF</button>
          <button
            className="btn-primary"
            style={{ fontSize: 11, padding: "6px 16px" }}
            onClick={handleCompile}
            disabled={compiling}
          >
            {compiling ? "⏳ Compiling…" : "▶ Compile"}
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            style={{
              padding: "6px 10px", borderRadius: 6, fontSize: 14,
              background: showConfig ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.06)",
              border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer",
            }}
            title="Theme settings"
          >🎨</button>
        </div>
      </div>

      {/* Main Split */}
      <div className="lb-split" style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT: Editor */}
        <div className="lb-editor" style={{ width: "42%", minWidth: 320, display: "flex", flexDirection: "column", borderRight: "1px solid var(--border)" }}>
          {/* Section tabs */}
          <div style={{ display: "flex", gap: 2, padding: "4px 8px", borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0, background: "rgba(148,163,184,0.02)" }}>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  color: activeSection === s.id ? "var(--accent)" : "var(--text-muted)",
                  background: activeSection === s.id ? "rgba(34,197,94,0.08)" : "transparent",
                  border: "none", cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.12s",
                }}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Editor Content */}
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {/* Personal */}
            {activeSection === "personal" && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>👤 Personal Information</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {["name", "email", "phone", "linkedin", "website", "title", "address"].map((f) => (
                    <div key={f} style={f === "address" ? { gridColumn: "1/-1" } : {}}>
                      <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 2, textTransform: "capitalize" }}>{f.replace("_", " ")}</label>
                      <input
                        value={resumeData.personal[f]}
                        onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, [f]: e.target.value } }))}
                        placeholder={f === "linkedin" ? "username (without linkedin.com/in/)" : f}
                        style={{ width: "100%", fontSize: 12, padding: "7px 9px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {activeSection === "summary" && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>📝 Professional Summary</h3>
                <textarea
                  value={resumeData.summary}
                  onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Write a compelling professional summary (2-4 sentences highlighting your expertise, achievements, and career goals)..."
                  rows={8}
                  style={{ width: "100%", fontSize: 12, padding: "8px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", resize: "vertical", lineHeight: 1.6 }}
                />
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>Tip: Include key achievements, years of experience, and your top 3 skills for best ATS performance.</p>
              </div>
            )}

            {/* Skills */}
            {activeSection === "skills" && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>💼 Skills</h3>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSkill()}
                    placeholder="Type a skill and press Enter"
                    style={{ flex: 1, fontSize: 12, padding: "7px 9px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
                  />
                  <button className="btn-secondary" style={{ fontSize: 11, padding: "7px 14px" }} onClick={addSkill}>Add</button>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {resumeData.skills.map((s, i) => (
                    <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "var(--success)", border: "1px solid rgba(34,197,94,0.15)" }}>
                      {s}
                      <button onClick={() => setResumeData(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1, opacity: 0.7 }}>×</button>
                    </span>
                  ))}
                </div>
                {resumeData.skills.length === 0 && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>No skills added yet. Type skills above and press Enter.</p>
                )}
              </div>
            )}

            {/* Experience */}
            {activeSection === "experience" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>💻 Experience</h3>
                  <button className="btn-secondary" style={{ fontSize: 10, padding: "5px 10px" }} onClick={() => addEntry("experience")}>+ Add Experience</button>
                </div>
                {resumeData.experience.length === 0 && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>No experience entries. Click "Add Experience" to start.</p>
                )}
                {resumeData.experience.map((exp, i) => (
                  <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: "rgba(148,163,184,0.03)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>#{i + 1}</span>
                      <button onClick={() => removeEntry("experience", i)} style={{ fontSize: 10, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>✕ Remove</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {["company", "role", "location", "start_date", "end_date"].map((f) => (
                        <div key={f}>
                          <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize" }}>{f.replace("_", " ")}</label>
                          <input value={exp[f] || ""} onChange={(e) => updateEntry("experience", i, f, e.target.value)} placeholder={f} style={{ width: "100%", fontSize: 11, padding: "5px 7px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Bullet Points (one per line)</label>
                      <textarea
                        value={(exp.bullets || []).join("\n")}
                        onChange={(e) => updateEntry("experience", i, "bullets", e.target.value.split("\n").filter(b => b.trim()))}
                        placeholder="• Led team of 5 engineers to deliver 30% faster deployments&#10;• Built REST API serving 1M+ requests/day"
                        rows={3}
                        style={{ width: "100%", fontSize: 11, padding: "5px 7px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", resize: "vertical" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {activeSection === "education" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>🎓 Education</h3>
                  <button className="btn-secondary" style={{ fontSize: 10, padding: "5px 10px" }} onClick={() => addEntry("education")}>+ Add Education</button>
                </div>
                {resumeData.education.map((edu, i) => (
                  <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: "rgba(148,163,184,0.03)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>#{i + 1}</span>
                      <button onClick={() => removeEntry("education", i)} style={{ fontSize: 10, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>✕ Remove</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {["institution", "degree", "field", "start_date", "end_date", "gpa"].map((f) => (
                        <div key={f}>
                          <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize" }}>{f.replace("_", " ")}</label>
                          <input value={edu[f] || ""} onChange={(e) => updateEntry("education", i, f, e.target.value)} placeholder={f} style={{ width: "100%", fontSize: 11, padding: "5px 7px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {activeSection === "projects" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>🚀 Projects</h3>
                  <button className="btn-secondary" style={{ fontSize: 10, padding: "5px 10px" }} onClick={() => addEntry("projects")}>+ Add Project</button>
                </div>
                {resumeData.projects.map((proj, i) => (
                  <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: "rgba(148,163,184,0.03)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>#{i + 1}</span>
                      <button onClick={() => removeEntry("projects", i)} style={{ fontSize: 10, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>✕ Remove</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {["name", "url", "description"].map((f) => (
                        <div key={f} style={(f === "description" || f === "url") ? { gridColumn: "1/-1" } : {}}>
                          <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize" }}>{f}</label>
                          {f === "description" ? (
                            <textarea value={proj[f] || ""} onChange={(e) => updateEntry("projects", i, f, e.target.value)} rows={2} style={{ width: "100%", fontSize: 11, padding: "5px 7px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", resize: "vertical" }} />
                          ) : (
                            <input value={proj[f] || ""} onChange={(e) => updateEntry("projects", i, f, e.target.value)} placeholder={f} style={{ width: "100%", fontSize: 11, padding: "5px 7px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Certifications */}
            {activeSection === "certifications" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>🏅 Certifications</h3>
                  <button className="btn-secondary" style={{ fontSize: 10, padding: "5px 10px" }} onClick={() => addEntry("certifications")}>+ Add Certification</button>
                </div>
                {resumeData.certifications.map((cert, i) => (
                  <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: "rgba(148,163,184,0.03)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>#{i + 1}</span>
                      <button onClick={() => removeEntry("certifications", i)} style={{ fontSize: 10, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>✕ Remove</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {["name", "issuer", "date"].map((f) => (
                        <div key={f}>
                          <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize" }}>{f}</label>
                          <input value={cert[f] || ""} onChange={(e) => updateEntry("certifications", i, f, e.target.value)} placeholder={f} style={{ width: "100%", fontSize: 11, padding: "5px 7px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Languages */}
            {activeSection === "languages" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>🌐 Languages</h3>
                  <button className="btn-secondary" style={{ fontSize: 10, padding: "5px 10px" }} onClick={() => addEntry("languages")}>+ Add Language</button>
                </div>
                {resumeData.languages.map((lang, i) => (
                  <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: "rgba(148,163,184,0.03)", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>#{i + 1}</span>
                      <button onClick={() => removeEntry("languages", i)} style={{ fontSize: 10, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4 }}>✕ Remove</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                      {["language", "proficiency"].map((f) => (
                        <div key={f}>
                          <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize" }}>{f}</label>
                          {f === "proficiency" ? (
                            <select value={lang[f] || ""} onChange={(e) => updateEntry("languages", i, f, e.target.value)} style={{ width: "100%", fontSize: 11, padding: "5px 7px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}>
                              <option value="">Select</option>
                              <option value="Native">Native</option>
                              <option value="Fluent">Fluent</option>
                              <option value="Advanced">Advanced</option>
                              <option value="Intermediate">Intermediate</option>
                              <option value="Basic">Basic</option>
                            </select>
                          ) : (
                            <input value={lang[f] || ""} onChange={(e) => updateEntry("languages", i, f, e.target.value)} placeholder={f} style={{ width: "100%", fontSize: 11, padding: "5px 7px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Preview + Config */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "rgba(148,163,184,0.015)" }}>
          {/* Config Panel (collapsible) */}
          {showConfig && (
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "rgba(148,163,184,0.03)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>Theme:</span>
              <div style={{ display: "flex", gap: 4 }}>
                {COLORS_ARRAY.map((c) => (
                  <button
                    key={c} onClick={() => setConfig(prev => ({ ...prev, color: c }))}
                    style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: COLOR_HEX[c], border: config.color === c ? "2px solid var(--accent)" : "2px solid transparent",
                      boxShadow: config.color === c ? "0 0 0 2px rgba(34,197,94,0.3)" : "none",
                      cursor: "pointer", outline: "none",
                    }}
                  />
                ))}
              </div>
              <div style={{ width: 1, height: 20, background: "var(--border)" }} />
              <select value={config.font} onChange={(e) => setConfig(prev => ({ ...prev, font: e.target.value }))} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}>
                {FONTS.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
              </select>
              <select value={config.spacing} onChange={(e) => setConfig(prev => ({ ...prev, spacing: e.target.value }))} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}>
                {SPACING_OPTS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          )}

          {/* PDF Preview */}
          <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20 }}>
            {pdfUrl ? (
              <object
                ref={previewRef}
                data={pdfUrl}
                type="application/pdf"
                style={{
                  width: "100%", maxWidth: 600, height: "calc(100vh - 200px)",
                  borderRadius: 8, border: "1px solid var(--border)",
                  boxShadow: "0 8px 32px rgba(2,6,23,0.3)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "var(--text-muted)" }}>PDF Preview not available. <a href={pdfUrl} download style={{ color: "var(--accent)", marginLeft: 4 }}>Download instead</a></div>
              </object>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)", maxWidth: 400 }}>
                <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.3 }}>📄</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text-secondary)" }}>Live PDF Preview</div>
                <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                  Fill in your resume details on the left panel, then click <strong style={{ color: "var(--accent)" }}>▶ Compile</strong> in the top bar to generate your LaTeX-powered resume PDF.
                </p>
                <div style={{ marginTop: 20, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                  {["personal", "skills", "experience", "education"].map((s) => (
                    <button key={s} className="btn-secondary" style={{ fontSize: 10, padding: "5px 12px" }} onClick={() => setActiveSection(s)}>
                      {sections.find(se => se.id === s)?.icon} {sections.find(se => se.id === s)?.label}
                    </button>
                  ))}
                </div>
                {template?.has_preview && (
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Template Preview:</div>
                    <object data={latex.previewUrl(template.id)} type="application/pdf" style={{ width: "100%", aspectRatio: "1/1.414", borderRadius: 8, border: "1px solid var(--border)", pointerEvents: "none" }}>
                      <div>Preview not available</div>
                    </object>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status bar */}
          <div style={{ padding: "6px 16px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: "rgba(148,163,184,0.02)", fontSize: 11, color: "var(--text-muted)" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span>Template: {template?.name || "N/A"}</span>
              <span>ATS Score: {template?.ats_score || "N/A"}%</span>
              <span>Style: {template?.style || "N/A"}</span>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {compiling && <span style={{ color: "var(--accent)" }}>⏳ Compiling with XeLaTeX…</span>}
              {error && <span style={{ color: "var(--danger)" }}>⚠ {error}</span>}
              <span>v{version}</span>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .lb-split { flex-direction: column !important; }
          .lb-editor { width: 100% !important; min-width: unset !important; border-right: none !important; max-height: 50vh !important; }
        }
      `}</style>
    </div>
  );
}
