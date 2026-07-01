import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { latex } from "../api";

const STYLES = ["single-column", "modern", "minimal", "sidebar", "two-column", "infographic"];
const STYLE_LABELS = { "single-column": "Classic", "modern": "Modern", "minimal": "Minimal", "sidebar": "Sidebar", "two-column": "Two-Column", "infographic": "Infographic" };
const SORT_OPTIONS = ["popular", "ats_score", "newest", "name"];
const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "executive"];

const COLORS_ARRAY = ["navy","emerald","crimson","slate","purple","teal","amber","rose","indigo","zinc"];
const COLOR_HEX = { navy:"#1e3a5f", emerald:"#047857", crimson:"#b91c1c", slate:"#475569", purple:"#7e22ce", teal:"#0d9488", amber:"#b45309", rose:"#9f1239", indigo:"#3730a3", zinc:"#3f3f46" };

const COMPANIES = [
  "Google","Microsoft","Amazon","Meta","Apple","Netflix","Adobe","Tesla","OpenAI","NVIDIA",
  "Oracle","Goldman Sachs","Deloitte","Accenture","Infosys","TCS","Wipro","Capgemini","IBM","Salesforce"
];

const FONTS = ["modern","sans","serif","elegant"];
const SPACING_OPTS = ["compact","normal","spacious"];

function ColorDot({ color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={color}
      style={{
        width: 22, height: 22, borderRadius: "50%",
        background: COLOR_HEX[color] || "#666",
        border: active ? "2px solid var(--accent)" : "2px solid transparent",
        boxShadow: active ? "0 0 0 2px rgba(34,197,94,0.3)" : "none",
        cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
        outline: "none",
      }}
    />
  );
}

function QuickViewModal({ template, onClose }) {
  if (!template) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(2,6,23,0.8)", backdropFilter: "blur(8px)",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        className="ui-card"
        style={{ maxWidth: 800, width: "100%", maxHeight: "90vh", overflow: "auto", padding: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>{template.name}</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, margin: "4px 0 0" }}>{template.description}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 24, cursor: "pointer", padding: "4px 8px" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 24, padding: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {template.has_preview ? (
              <object data={latex.previewUrl(template.id)} type="application/pdf" style={{ width: "100%", aspectRatio: "1/1.414", borderRadius: 8, border: "1px solid var(--border)", background: "#fafafa" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 13 }}>Preview not available</div>
              </object>
            ) : (
              <div style={{ width: "100%", aspectRatio: "1/1.414", borderRadius: 8, border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13, background: "rgba(148,163,184,0.03)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                  <div>No preview available</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Click "Use Template" to customize</div>
                </div>
              </div>
            )}
          </div>
          <div style={{ width: 240, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>ATS Score</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: template.ats_score >= 90 ? "var(--success)" : template.ats_score >= 80 ? "var(--warning)" : "var(--danger)" }}>{template.ats_score}%</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Style</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "rgba(148,163,184,0.08)", color: "var(--text-secondary)" }}>{STYLE_LABELS[template.style] || template.style}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Industries</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(template.industry || []).slice(0, 4).map((ind) => (
                  <span key={ind} style={{ padding: "2px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>{ind}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Experience Level</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(template.experience_level || []).map((lvl) => (
                  <span key={lvl} style={{ padding: "2px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "var(--success)" }}>{lvl}</span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              <a
                href={latex.downloadUrl(template.id)}
                className="btn-secondary"
                style={{ width: "100%", textAlign: "center", fontSize: 12, padding: "9px 16px", textDecoration: "none" }}
              >Download .tex Source</a>
              <button
                className="btn-primary"
                style={{ width: "100%", fontSize: 12, padding: "9px 16px" }}
                onClick={() => { window.location.href = `/latex-builder/${template.id}`; }}
              >Use Template</button>
            </div>
          </div>
        </div>
        <div style={{ padding: "0 24px 20px", display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          {(template.tags || []).map((tag) => (
            <span key={tag} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "rgba(148,163,184,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>#{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStyle, setFilterStyle] = useState("");
  const [filterExp, setFilterExp] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [minATS, setMinATS] = useState(0);
  const [sortBy, setSortBy] = useState("popular");
  const [industries, setIndustries] = useState([]);
  const [roles, setRoles] = useState([]);
  const [quickView, setQuickView] = useState(null);
  const [compilingId, setCompilingId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [activeTab, setActiveTab] = useState("browse");

  const [resumeData, setResumeData] = useState({
    personal: { name: "", email: "", phone: "", linkedin: "", website: "", title: "", address: "" },
    summary: "", skills: [], education: [], experience: [], projects: [], certifications: [], languages: [], publications: [], awards: [],
  });
  const [customTemplateId, setCustomTemplateId] = useState("");
  const [customConfig, setCustomConfig] = useState({ color: "navy", font: "modern", spacing: "normal" });
  const [customResult, setCustomResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState("");

  const [jdText, setJdText] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [jdTitle, setJdTitle] = useState("");
  const [jdAnalysis, setJdAnalysis] = useState(null);
  const [jdLoading, setJdLoading] = useState(false);
  const [jdTemplateId, setJdTemplateId] = useState("");
  const [jdResult, setJdResult] = useState(null);
  const [jdResultLoading, setJdResultLoading] = useState(false);
  const [jdError, setJdError] = useState("");

  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiError, setAiError] = useState("");

  const [skillInput, setSkillInput] = useState("");
  const [expandedFilter, setExpandedFilter] = useState(false);

  const pdRef = useRef(null);

  useEffect(() => {
    Promise.all([
      latex.list().then(r => r.data || []).catch(() => []),
      latex.industries().then(r => r.data || []).catch(() => []),
      latex.roles().then(r => r.data || []).catch(() => []),
    ]).then(([tmpl, inds, rls]) => {
      setTemplates(tmpl);
      setFiltered(tmpl);
      setIndustries(inds);
      setRoles(rls);
      if (tmpl.length > 0) {
        setCustomTemplateId(tmpl[0].id);
        setJdTemplateId(tmpl[0].id);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...templates];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || (t.tags || []).some(tag => tag.includes(q)));
    }
    if (filterIndustry) result = result.filter(t => (t.industry || []).includes(filterIndustry));
    if (filterRole) result = result.filter(t => (t.role || []).includes(filterRole));
    if (filterStyle) result = result.filter(t => t.style === filterStyle);
    if (filterExp) result = result.filter(t => (t.experience_level || []).includes(filterExp));
    if (filterColor) result = result.filter(t => t.config?.color === filterColor);
    if (minATS > 0) result = result.filter(t => (t.ats_score || 0) >= minATS);
    if (sortBy === "ats_score") result.sort((a, b) => (b.ats_score || 0) - (a.ats_score || 0));
    else if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    else result.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
    setFiltered(result);
  }, [templates, searchQ, filterIndustry, filterRole, filterStyle, filterExp, filterColor, minATS, sortBy]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !resumeData.skills.includes(s)) {
      setResumeData(prev => ({ ...prev, skills: [...prev.skills, s] }));
      setSkillInput("");
    }
  };

  const addEntry = (section) => {
    const templates = {
      education: { institution: "", degree: "", field: "", start_date: "", end_date: "", gpa: "" },
      experience: { company: "", role: "", location: "", start_date: "", end_date: "", current: false, bullets: [] },
      projects: { name: "", description: "", technologies: [], url: "" },
      certifications: { name: "", issuer: "", date: "" },
      languages: { language: "", proficiency: "" },
    };
    setResumeData(prev => ({ ...prev, [section]: [...(prev[section] || []), templates[section] || {}] }));
  };

  const updateEntry = (section, index, field, value) => {
    setResumeData(prev => {
      const items = [...(prev[section] || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [section]: items };
    });
  };

  const handleCustomCompile = async () => {
    if (!customTemplateId) return;
    setCustomLoading(true);
    setCustomError("");
    setCustomResult(null);
    try {
      const blob = await latex.customCompile({
        template_id: customTemplateId,
        resume_data: resumeData,
        config: customConfig,
      });
      const url = URL.createObjectURL(blob);
      setCustomResult(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${customTemplateId}-resume.pdf`;
      a.click();
    } catch (e) {
      setCustomError("Compilation failed. Check server logs or ensure pdflatex is installed.");
    } finally {
      setCustomLoading(false);
    }
  };

  const handleAnalyzeJD = async () => {
    if (!jdText.trim()) return;
    setJdLoading(true);
    setJdAnalysis(null);
    setJdError("");
    try {
      const res = await latex.analyzeJD({ job_description: jdText, company_name: jdCompany, job_title: jdTitle });
      setJdAnalysis(res.data);
    } catch (e) {
      setJdError("Analysis failed. Check API key or try again.");
    } finally {
      setJdLoading(false);
    }
  };

  const handleGenerateFromJD = async () => {
    if (!jdTemplateId || !jdText.trim()) return;
    setJdResultLoading(true);
    setJdError("");
    setJdResult(null);
    try {
      const blob = await latex.generateFromJD({
        template_id: jdTemplateId,
        job_description: jdText,
        company_name: jdCompany,
        job_title: jdTitle,
        resume_data: resumeData,
        config: {},
      });
      const url = URL.createObjectURL(blob);
      setJdResult(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jdTemplateId}-tailored-resume.pdf`;
      a.click();
    } catch (e) {
      setJdError("Generation failed. Check server logs.");
    } finally {
      setJdResultLoading(false);
    }
  };

  const handleAIOptimize = async () => {
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    setAiSuggestions([]);
    try {
      const res = await latex.aiOptimize({
        resume_data: resumeData,
        focus_areas: ["ats", "keywords", "formatting"],
      });
      setAiResult(res.data?.optimized_resume || null);
      setAiSuggestions(res.data?.suggestions || []);
    } catch (e) {
      setAiError("AI optimization failed. Check GROQ_API_KEY in .env.");
    } finally {
      setAiLoading(false);
    }
  };

  const activeFiltersCount = [searchQ, filterIndustry, filterRole, filterStyle, filterExp, filterColor, minATS > 0].filter(Boolean).length;

  return (
    <div>
      <div className="templates-hero">
        <div className="templates-hero-bg" />
        <div className="templates-hero-inner">
          <div className="templates-hero-content">
            <div className="hero-badge" style={{ marginBottom: 16 }}>
              <span className="hero-badge-dot" />
              LaTeX-Powered · ATS Optimized
            </div>
            <h1 className="hero-title" style={{ maxWidth: 500, marginBottom: 16 }}>
              Professional Resume{" "}
              <span className="hero-title-gradient">Templates</span>
            </h1>
            <p className="hero-sub" style={{ maxWidth: 480, margin: "0 0 28px" }}>
              15 premium LaTeX templates. Customize with AI, preview instantly, download perfect PDFs.
            </p>
            <div className="hero-actions">
              <button
                className="btn-primary hero-btn-primary"
                onClick={() => pdRef.current?.scrollIntoView({ behavior: "smooth" })}
              >
                Browse Templates
              </button>
              <button
                className="btn-secondary hero-btn-secondary"
                onClick={() => { pdRef.current?.scrollIntoView({ behavior: "smooth" }); setActiveTab("customize"); }}
              >
                Customize with AI
              </button>
              <button
                className="btn-secondary hero-btn-secondary"
                onClick={() => { pdRef.current?.scrollIntoView({ behavior: "smooth" }); setActiveTab("company"); }}
              >
                Tailor for Company
              </button>
            </div>
          </div>
          <div className="templates-hero-visual">
            <div className="templates-hero-cards">
              {[
                { name: "Classic", ats: 92, color: "var(--success)", bg: "rgba(16,185,129,0.12)", delay: "0s" },
                { name: "Modern", ats: 95, color: "var(--accent)", bg: "rgba(79,70,229,0.12)", delay: "0.3s" },
                { name: "Minimal", ats: 88, color: "var(--warning)", bg: "rgba(245,158,11,0.12)", delay: "0.6s" },
              ].map((card, i) => (
                <div key={card.name} className="templates-hero-card" style={{ animationDelay: card.delay }}>
                  <div className="templates-hero-card-svg">
                    <svg viewBox="0 0 60 78" width="100%" height="auto">
                      <defs>
                        <linearGradient id={`cardHdr${i}`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#4F46E5" />
                          <stop offset="100%" stopColor="#6366F1" />
                        </linearGradient>
                      </defs>
                      <rect x="1" y="1" width="58" height="76" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                      <rect x="8" y="8" width="44" height="5" rx="2" fill={`url(#cardHdr${i})`} />
                      <rect x="8" y="18" width="34" height="2" rx="1" fill="#E2E8F0" />
                      <rect x="8" y="24" width="40" height="2" rx="1" fill="#E2E8F0" />
                      <rect x="8" y="30" width="28" height="2" rx="1" fill="#E2E8F0" />
                      <rect x="8" y="40" width="44" height="4" rx="2" fill="rgba(79,70,229,0.12)" />
                      <rect x="8" y="50" width="36" height="2" rx="1" fill="#E2E8F0" />
                      <rect x="8" y="56" width="30" height="2" rx="1" fill="#E2E8F0" />
                      <rect x="8" y="62" width="38" height="2" rx="1" fill="#E2E8F0" />
                    </svg>
                  </div>
                  <div className="templates-hero-card-label">
                    <span className="templates-hero-card-name">{card.name}</span>
                    <span className="templates-hero-card-badge" style={{ background: card.bg, color: card.color }}>{card.ats}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="templates-hero-stats">
          <div className="templates-hero-stat">
            <div className="templates-hero-stat-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            15 Templates
          </div>
          <div className="templates-hero-stat">
            <div className="templates-hero-stat-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            LaTeX Quality
          </div>
          <div className="templates-hero-stat">
            <div className="templates-hero-stat-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            ATS Optimized
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div ref={pdRef} className="tmpl-tab-nav" style={{ display: "flex", gap: 4, marginTop: 28, marginBottom: 28, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {[
          { id: "browse", label: "Browse Templates", icon: "◈" },
          { id: "customize", label: "Customize & Compile", icon: "⚙" },
          { id: "company", label: "Company Tailor", icon: "🏢" },
          { id: "ai", label: "AI Optimize", icon: "✦" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 18px", fontSize: 13, fontWeight: 600,
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
              background: "none", border: "none",
              borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
              marginBottom: -1,
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
          {filtered.length} / {templates.length} templates
        </div>
      </div>

      {/* ============ TAB: BROWSE ============ */}
      {activeTab === "browse" && (
        <div>
          {/* Filters Bar */}
          <div className="ui-card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "rgba(148,163,184,0.04)", borderBottom: expandedFilter ? "1px solid var(--border)" : "none" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              <input
                placeholder="Search templates by name, tag, or keyword..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                style={{
                  flex: 1, background: "transparent", border: "none", color: "var(--text)", fontSize: 13, outline: "none", padding: "4px 0",
                }}
              />
              {activeFiltersCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "var(--success)" }}>{activeFiltersCount} filters</span>
              )}
              <button
                onClick={() => setExpandedFilter(!expandedFilter)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: expandedFilter ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.06)",
                  border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer",
                }}
              >
                {expandedFilter ? "▲ Filters" : "▼ Filters"}
              </button>
              {(searchQ || filterIndustry || filterRole || filterStyle || filterExp || filterColor || minATS > 0) && (
                <button
                  onClick={() => { setSearchQ(""); setFilterIndustry(""); setFilterRole(""); setFilterStyle(""); setFilterExp(""); setFilterColor(""); setMinATS(0); setSortBy("popular"); }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                >Clear</button>
              )}
            </div>
            {expandedFilter && (
              <div className="tmpl-filters-expanded" style={{ padding: "12px 16px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", minWidth: 110 }}>
                  <option value="">All Industries</option>
                  {industries.map((i) => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
                </select>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", minWidth: 110 }}>
                  <option value="">All Roles</option>
                  {roles.map((r) => <option key={r} value={r}>{r.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</option>)}
                </select>
                <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", minWidth: 110 }}>
                  <option value="">All Styles</option>
                  {STYLES.map((s) => <option key={s} value={s}>{STYLE_LABELS[s]}</option>)}
                </select>
                <select value={filterExp} onChange={(e) => setFilterExp(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", minWidth: 110 }}>
                  <option value="">All Levels</option>
                  {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", minWidth: 110 }}>
                  <option value="popular">Popular</option>
                  <option value="ats_score">Highest ATS</option>
                  <option value="name">Name A-Z</option>
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Min ATS:</span>
                  <input type="range" min="0" max="100" step="5" value={minATS} onChange={(e) => setMinATS(Number(e.target.value))} style={{ width: 80 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: minATS > 0 ? "var(--accent)" : "var(--text-muted)" }}>{minATS}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Color Filter Chips */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>Color:</span>
            <ColorDot color="" active={!filterColor} onClick={() => setFilterColor("")} />
            {COLORS_ARRAY.map((c) => (
              <ColorDot key={c} color={c} active={filterColor === c} onClick={() => setFilterColor(filterColor === c ? "" : c)} />
            ))}
          </div>

          {/* Template Grid */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {[1,2,3,4,5,6].map(n => (
                <div key={n} className="ui-card" style={{ padding: 0, overflow: "hidden", animation: "pulse 2s infinite" }}>
                  <div style={{ aspectRatio: "1/1.414", background: "rgba(148,163,184,0.05)" }} />
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 12, width: "60%", background: "rgba(148,163,184,0.08)", borderRadius: 4 }} />
                    <div style={{ height: 8, width: "80%", background: "rgba(148,163,184,0.05)", borderRadius: 4 }} />
                    <div style={{ height: 8, width: "40%", background: "rgba(148,163,184,0.05)", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="ui-card" style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>No templates match your filters</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Try adjusting your search or filters to find more templates.</p>
              <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => { setSearchQ(""); setFilterIndustry(""); setFilterRole(""); setFilterStyle(""); setFilterExp(""); setFilterColor(""); setMinATS(0); }}>Clear All Filters</button>
            </div>
          ) : (
            <div className="tmpl-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {filtered.map((t) => {
                const color = t.config?.color || "navy";
                return (
                  <div
                    key={t.id}
                    className="hover-card"
                    style={{ padding: 0, overflow: "hidden", cursor: "pointer", animation: "slideUp 0.35s ease both" }}
                    onClick={() => setQuickView(t)}
                  >
                    {/* Preview */}
                    <div style={{ position: "relative", padding: 12, background: "rgba(148,163,184,0.02)" }}>
                      {t.has_preview ? (
                        <object data={latex.previewUrl(t.id)} type="application/pdf" style={{ width: "100%", aspectRatio: "1/1.414", borderRadius: 8, pointerEvents: "none", background: "#fafafa" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 12 }}>No preview</div>
                        </object>
                      ) : (
                        <div style={{
                          width: "100%", aspectRatio: "1/1.414", borderRadius: 8,
                          background: `linear-gradient(135deg, rgba(${COLOR_RGB(color)?.[0] || "100,100,100"},0.08), rgba(${COLOR_RGB(color)?.[1] || "150,150,150"},0.04))`,
                          border: "1px solid var(--border)",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                          color: "var(--text-muted)", fontSize: 12,
                        }}>
                          <div style={{ fontSize: 28, opacity: 0.4 }}>📄</div>
                          <div>{t.name}</div>
                        </div>
                      )}
                      {/* Hover Overlay */}
                      <div style={{
                        position: "absolute", inset: 12, borderRadius: 8,
                        background: "linear-gradient(to top, rgba(2,6,23,0.85) 0%, transparent 50%)",
                        opacity: 0, transition: "opacity 0.2s", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 16, gap: 6,
                        pointerEvents: "none",
                      }}
                        className="template-overlay"
                      >
                        <button
                          className="btn-primary"
                          style={{ fontSize: 11, padding: "7px 14px", pointerEvents: "auto" }}
                          onClick={(e) => { e.stopPropagation(); navigate(`/latex-builder/${t.id}`); }}
                        >Use Template</button>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: "7px 14px", pointerEvents: "auto" }}
                          onClick={(e) => { e.stopPropagation(); setQuickView(t); }}
                        >Quick View</button>
                      </div>
                      {/* ATS Badge */}
                      <div style={{
                        position: "absolute", top: 18, right: 18,
                        padding: "2px 8px", borderRadius: 6,
                        background: t.ats_score >= 90 ? "rgba(34,197,94,0.15)" : t.ats_score >= 80 ? "rgba(245,158,11,0.15)" : "rgba(248,113,113,0.15)",
                        color: t.ats_score >= 90 ? "var(--success)" : t.ats_score >= 80 ? "var(--warning)" : "var(--danger)",
                        fontSize: 12, fontWeight: 800, border: "1px solid",
                        borderColor: t.ats_score >= 90 ? "rgba(34,197,94,0.2)" : t.ats_score >= 80 ? "rgba(245,158,11,0.2)" : "rgba(248,113,113,0.2)",
                      }}>
                        {t.ats_score}%
                      </div>
                    </div>
                    {/* Info */}
                    <div style={{ padding: "12px 14px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: COLOR_HEX[color] || "#666", flexShrink: 0,
                        }} />
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>{t.name}</h3>
                        {t.premium && (
                          <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: "rgba(245,158,11,0.12)", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Pro</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {t.description}
                      </p>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700, background: "rgba(99,102,241,0.08)", color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                          {STYLE_LABELS[t.style] || t.style}
                        </span>
                        {(t.tags || []).slice(0, 2).map((tag) => (
                          <span key={tag} style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, fontWeight: 600, background: "rgba(148,163,184,0.06)", color: "var(--text-muted)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <style>{`
            .hover-card:hover .template-overlay { opacity: 1 !important; }
            @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
            @media (max-width: 768px) {
              .tmpl-grid { grid-template-columns: 1fr !important; }
              .tmpl-split { grid-template-columns: 1fr !important; }
              .tmpl-filters-expanded { flex-direction: column !important; }
              .tmpl-filters-expanded select { width: 100% !important; min-width: unset !important; }
              .tmpl-tab-nav { overflow-x: auto !important; flex-wrap: nowrap !important; }
              .tmpl-tab-nav button { white-space: nowrap !important; flex-shrink: 0 !important; }
            }
          `}</style>
        </div>
      )}

      {/* ============ TAB: CUSTOMIZE ============ */}
      {activeTab === "customize" && (
        <div className="tmpl-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left: Resume Data Form */}
          <div className="ui-card" style={{ padding: 20, maxHeight: "70vh", overflow: "auto" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Resume Data</h3>

            {/* Template Select */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Template</label>
              <select value={customTemplateId} onChange={(e) => setCustomTemplateId(e.target.value)} style={{ width: "100%", fontSize: 12, padding: "8px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)" }}>
                {filtered.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Personal */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {["name","email","phone","linkedin","website","title","address"].map((field) => (
                <div key={field} style={field === "address" ? { gridColumn: "1/-1" } : {}}>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 2, textTransform: "capitalize" }}>{field === "linkedin" ? "LinkedIn (username)" : field}</label>
                  <input
                    value={resumeData.personal[field]}
                    onChange={(e) => setResumeData(prev => ({ ...prev, personal: { ...prev.personal, [field]: e.target.value } }))}
                    placeholder={field}
                    style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
                  />
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Professional Summary</label>
              <textarea
                value={resumeData.summary}
                onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Write a brief professional summary..."
                rows={3}
                style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", resize: "vertical" }}
              />
            </div>

            {/* Skills */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Skills</label>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSkill()}
                  placeholder="Type a skill and press Enter"
                  style={{ flex: 1, fontSize: 12, padding: "6px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}
                />
                <button className="btn-secondary" style={{ fontSize: 11, padding: "6px 12px" }} onClick={addSkill}>Add</button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {resumeData.skills.map((s, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "var(--success)" }}>
                    {s}
                    <button onClick={() => setResumeData(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Experience</label>
                <button className="btn-secondary" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => addEntry("experience")}>+ Add</button>
              </div>
              {resumeData.experience.map((exp, i) => (
                <div key={i} style={{ padding: 8, marginBottom: 6, borderRadius: 6, background: "rgba(148,163,184,0.04)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {["company","role","location","start_date","end_date"].map((f) => (
                      <div key={f}>
                        <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize" }}>{f.replace("_", " ")}</label>
                        <input value={exp[f] || ""} onChange={(e) => updateEntry("experience", i, f, e.target.value)} style={{ width: "100%", fontSize: 11, padding: "4px 6px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setResumeData(prev => ({ ...prev, experience: prev.experience.filter((_, idx) => idx !== i) }))} style={{ fontSize: 10, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", marginTop: 4, padding: 0 }}>Remove</button>
                </div>
              ))}
            </div>

            {/* Education */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>Education</label>
                <button className="btn-secondary" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => addEntry("education")}>+ Add</button>
              </div>
              {resumeData.education.map((edu, i) => (
                <div key={i} style={{ padding: 8, marginBottom: 6, borderRadius: 6, background: "rgba(148,163,184,0.04)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {["institution","degree","field","start_date","end_date","gpa"].map((f) => (
                      <div key={f}>
                        <label style={{ fontSize: 9, fontWeight: 600, color: "var(--text-muted)", textTransform: "capitalize" }}>{f.replace("_", " ")}</label>
                        <input value={edu[f] || ""} onChange={(e) => updateEntry("education", i, f, e.target.value)} style={{ width: "100%", fontSize: 11, padding: "4px 6px", borderRadius: 4, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setResumeData(prev => ({ ...prev, education: prev.education.filter((_, idx) => idx !== i) }))} style={{ fontSize: 10, color: "var(--danger)", background: "none", border: "none", cursor: "pointer", marginTop: 4, padding: 0 }}>Remove</button>
                </div>
              ))}
            </div>

            {/* Customization Config */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>Template Customization</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Color</label>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {COLORS_ARRAY.map((c) => (
                      <ColorDot key={c} color={c} active={customConfig.color === c} onClick={() => setCustomConfig(prev => ({ ...prev, color: c }))} />
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Font</label>
                  <select value={customConfig.font} onChange={(e) => setCustomConfig(prev => ({ ...prev, font: e.target.value }))} style={{ width: "100%", fontSize: 11, padding: "6px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}>
                    {FONTS.map((f) => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Spacing</label>
                  <select value={customConfig.spacing} onChange={(e) => setCustomConfig(prev => ({ ...prev, spacing: e.target.value }))} style={{ width: "100%", fontSize: 11, padding: "6px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}>
                    {SPACING_OPTS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {customError && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 12, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>{customError}</p>}

            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: 16, fontSize: 13, padding: "11px 20px" }}
              onClick={handleCustomCompile}
              disabled={customLoading}
            >
              {customLoading ? "Compiling with LaTeX…" : "⚡ Compile & Download PDF"}
            </button>
          </div>

          {/* Right: Preview / Result */}
          <div className="ui-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(148,163,184,0.03)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>PDF Preview</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: customResult ? "var(--success)" : "var(--text-muted)" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{customResult ? "Compiled" : "Not yet compiled"}</span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(148,163,184,0.02)" }}>
              {customResult ? (
                <object data={customResult} type="application/pdf" style={{ width: "100%", height: "100%", minHeight: 400, borderRadius: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "var(--text-muted)" }}>PDF Preview</div>
                </object>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No PDF yet</div>
                  <div style={{ fontSize: 12 }}>Fill in your resume data on the left, then click "Compile & Download PDF" to generate your LaTeX-powered resume.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: COMPANY TAILOR ============ */}
      {activeTab === "company" && (
        <div className="tmpl-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left: JD Input */}
          <div className="ui-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Company-Specific Resume</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>Paste a job description and we'll analyze it to tailor your resume.</p>

            {/* Quick company buttons */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Quick Select Company</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {COMPANIES.slice(0, 10).map((c) => (
                  <button
                    key={c}
                    onClick={() => setJdCompany(c)}
                    style={{
                      padding: "3px 10px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: jdCompany === c ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.06)",
                      border: `1px solid ${jdCompany === c ? "rgba(34,197,94,0.3)" : "var(--border)"}`,
                      color: jdCompany === c ? "var(--success)" : "var(--text-muted)",
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >{c}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Job Description *</label>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the full job description here..."
                rows={10}
                style={{ width: "100%", fontSize: 12, padding: "8px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "monospace" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Company Name</label>
                <input value={jdCompany} onChange={(e) => setJdCompany(e.target.value)} placeholder="e.g. Google" style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>Job Title</label>
                <input value={jdTitle} onChange={(e) => setJdTitle(e.target.value)} placeholder="e.g. Senior Engineer" style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Target Template</label>
              <select value={jdTemplateId} onChange={(e) => setJdTemplateId(e.target.value)} style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 5, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none" }}>
                {filtered.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.ats_score}% ATS)</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" style={{ fontSize: 12, padding: "9px 16px", flex: 1 }} onClick={handleAnalyzeJD} disabled={jdLoading || !jdText.trim()}>
                {jdLoading ? "Analyzing…" : "🔍 Analyze JD"}
              </button>
              <button className="btn-primary" style={{ fontSize: 12, padding: "9px 16px", flex: 1 }} onClick={handleGenerateFromJD} disabled={jdResultLoading || !jdText.trim()}>
                {jdResultLoading ? "Generating…" : "🎯 Generate Tailored PDF"}
              </button>
            </div>

            {jdError && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 12, padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6 }}>{jdError}</p>}

            {/* JD Analysis Results */}
            {jdAnalysis && (
              <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "rgba(148,163,184,0.04)", border: "1px solid var(--border)" }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>JD Analysis</h4>
                {jdAnalysis.required_skills?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Required Skills</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {jdAnalysis.required_skills.slice(0, 15).map((s) => (
                        <span key={s} style={{ padding: "2px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: "rgba(34,197,94,0.1)", color: "var(--success)" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {jdAnalysis.keywords?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Keywords</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {jdAnalysis.keywords.slice(0, 10).map((k) => (
                        <span key={k} style={{ padding: "2px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: "rgba(99,102,241,0.08)", color: "#818cf8" }}>{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {jdAnalysis.industry && (
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    Detected Industry: <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{jdAnalysis.industry}</span>
                    {jdAnalysis.role_level && <> · Level: <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{jdAnalysis.role_level}</span></>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Generated PDF */}
          <div className="ui-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(148,163,184,0.03)" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Tailored Resume PDF</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: jdResult ? "var(--success)" : "var(--text-muted)" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{jdResult ? "Generated" : "Not yet"}</span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(148,163,184,0.02)" }}>
              {jdResult ? (
                <object data={jdResult} type="application/pdf" style={{ width: "100%", height: "100%", minHeight: 400, borderRadius: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "var(--text-muted)" }}>PDF Preview</div>
                </object>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Company-Tailored Resume</div>
                  <div style={{ fontSize: 12 }}>Paste a job description, click "Generate Tailored PDF", and get a resume optimized for that specific company and role.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB: AI OPTIMIZE ============ */}
      {activeTab === "ai" && (
        <div className="ui-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✦</div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: 0 }}>AI Resume Optimization</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>Improve ATS score, rewrite achievements, and generate professional content</p>
            </div>
          </div>

          <div className="tmpl-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Resume Data (JSON)</label>
              <textarea
                value={aiData ? JSON.stringify(aiData, null, 2) : JSON.stringify(resumeData, null, 2)}
                onChange={(e) => { try { setAiData(JSON.parse(e.target.value)); } catch {} }}
                rows={12}
                style={{ width: "100%", fontSize: 11, padding: "8px 10px", borderRadius: 6, background: "rgba(15,23,42,0.72)", border: "1px solid var(--border)", color: "var(--text)", outline: "none", resize: "vertical", fontFamily: "monospace" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 8, background: "rgba(148,163,184,0.04)", border: "1px solid var(--border)", flex: 1 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>What AI will do</h4>
                <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  <li>Generate ATS-friendly bullet points</li>
                  <li>Rewrite achievements with metrics</li>
                  <li>Improve grammar and readability</li>
                  <li>Generate professional summaries</li>
                  <li>Optimize keywords for ATS scoring</li>
                  <li>Suggest missing skills</li>
                  <li>Highlight leadership qualities</li>
                </ul>
              </div>
              <button
                className="btn-primary"
                style={{ fontSize: 13, padding: "11px 20px" }}
                onClick={handleAIOptimize}
                disabled={aiLoading}
              >
                {aiLoading ? "✨ AI Optimizing…" : "✨ Run AI Optimization"}
              </button>
              {aiError && <p style={{ fontSize: 12, color: "var(--danger)", padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 6, margin: 0 }}>{aiError}</p>}
            </div>
          </div>

          {/* AI Results */}
          <div className="tmpl-split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {aiSuggestions.length > 0 && (
              <div style={{ padding: 14, borderRadius: 8, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)", marginBottom: 8 }}>💡 Suggestions</h4>
                <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  {aiSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
            {aiResult && (
              <div style={{ padding: 14, borderRadius: 8, background: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--success)", marginBottom: 8 }}>✅ Optimized Data</h4>
                <pre style={{ fontSize: 10, color: "var(--text-secondary)", maxHeight: 200, overflow: "auto", margin: 0, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                  {JSON.stringify(aiResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      <QuickViewModal template={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}

const COLOR_RGB = {
  navy: ["10,45,85", "30,64,110"],
  emerald: ["4,120,87", "16,185,129"],
  crimson: ["185,28,28", "220,38,38"],
  slate: ["71,85,105", "100,116,139"],
  purple: ["126,34,206", "139,92,246"],
  teal: ["13,148,136", "20,184,166"],
  amber: ["180,83,9", "217,119,6"],
  rose: ["159,18,57", "225,29,72"],
  indigo: ["55,48,163", "99,102,241"],
  zinc: ["63,63,70", "113,113,122"],
};
