import { useState, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { v1, portals } from "../api";

const ALL_PORTALS = [
  { name: "LinkedIn", color: "#0A66C2" },
  { name: "Indeed", color: "#0065B3" },
  { name: "Glassdoor", color: "#0CAA41" },
  { name: "Naukri.com", color: "#E55B2B" },
  { name: "Wellfound", color: "#1A1A1A" },
  { name: "ZipRecruiter", color: "#228BE6" },
  { name: "Dice", color: "#FF6700" },
  { name: "CutShort", color: "#6C2BD9" },
  { name: "Monster", color: "#6A1B9A" },
  { name: "SimplyHired", color: "#4285F4" },
  { name: "CareerBuilder", color: "#0073AA" },
  { name: "Hired", color: "#0A0A0A" },
  { name: "Remotive", color: "#16A34A" },
  { name: "We Work Remotely", color: "#1E3A5F" },
  { name: "Remote.co", color: "#7C3AED" },
  { name: "AngelList Jobs", color: "#1A1A1A" },
  { name: "Otta", color: "#FF5A1F" },
  { name: "Greenhouse", color: "#3AAB6D" },
  { name: "Lever", color: "#2D6CDF" },
  { name: "Shine.com", color: "#FF6B00" },
  { name: "TimesJobs", color: "#E63946" },
  { name: "Freshersworld", color: "#F59E0B" },
  { name: "Instahyre", color: "#6366F1" },
  { name: "Hirist", color: "#0EA5E9" },
  { name: "iimjobs", color: "#BE185D" },
];

const REMOTE_PORTALS = ["Remotive", "We Work Remotely", "Remote.co"];

const INTERNSHIP_PORTALS_FALLBACK = [
  { id: "internshala", name: "Internshala", color: "#0077FF", tag: "India's #1 internship platform", url: "https://internshala.com" },
  { id: "letsintern", name: "LetsIntern", color: "#FF6B35", tag: "Verified internships", url: "https://www.letsintern.com" },
  { id: "hellointern", name: "HelloIntern", color: "#10B981", tag: "Free listings", url: "https://hellointern.in" },
  { id: "internship_in", name: "Internship.in", color: "#6366F1", tag: "10,000+ openings", url: "https://internship.in" },
  { id: "twenty19", name: "Twenty19", color: "#F59E0B", tag: "Student focused", url: "https://www.twenty19.com" },
  { id: "chegg_internships", name: "Chegg Internships", color: "#FF5A00", tag: "100K+ listings", url: "https://www.internships.com" },
  { id: "wayup", name: "WayUp", color: "#5B4FCF", tag: "Entry-level & internships", url: "https://www.wayup.com" },
  { id: "handshake", name: "Handshake", color: "#E63F3F", tag: "College recruiting", url: "https://joinhandshake.com" },
  { id: "aftercollege", name: "AfterCollege", color: "#0369A1", tag: "Campus to career", url: "https://www.aftercollege.com" },
];

function PortalBadge({ name }) {
  const p = ALL_PORTALS.find((x) => x.name === name) || ALL_PORTALS[0];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: `${p.color}12`, color: p.color, border: `1px solid ${p.color}30`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color }} />
      {name}
    </span>
  );
}

function SkillBadge({ label, matched }) {
  return matched ? (
    <span style={s.tagMatched}>{label}</span>
  ) : (
    <span style={s.tagMissing}>{label}</span>
  );
}

function InternshipCard({ portal }) {
  const c = portal.color;
  return (
    <div className="internship-portal-card" style={{ "--portal-color": c }}>
      <div className="internship-portal-card-bg" />
      <div className="internship-portal-card-content">
        <div className="internship-portal-card-top">
          <div className="internship-portal-logo" style={{ background: `${c}12`, borderColor: `${c}25` }}>
            {portal.name[0]}
          </div>
          <div className="internship-portal-name-wrap">
            <div className="internship-portal-name">{portal.name}</div>
            <span className="internship-free-badge">Free</span>
          </div>
        </div>
        <div className="internship-portal-tag">{portal.tag}</div>
        <div className="internship-portal-stats">
          <span>🎯 Verified</span>
          <span>📍 Remote/Onsite</span>
          <span>⚡ Apply Free</span>
        </div>
        <a className="internship-portal-btn" href={portal.url} target="_blank" rel="noreferrer"
          style={{ background: `${c}0c`, color: c, borderColor: `${c}25` }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${c}18`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${c}0c`; }}>
          Browse Internships →
        </a>
      </div>
    </div>
  );
}

export default function JobRecommender() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl === "internships" ? "internships" : "jobs");
  const [text, setText] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPortal, setSelectedPortal] = useState("All");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [internshipPortals, setInternshipPortals] = useState(INTERNSHIP_PORTALS_FALLBACK);
  const fileRef = useRef(null);

  useEffect(() => {
    portals.getInternshipPortals()
      .then((data) => { if (data && data.length) setInternshipPortals(data); })
      .catch(() => {});
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === "internships" ? { tab: "internships" } : {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await v1.matchJobs(text.trim());
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch recommendations.");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      setLoading(true);
      setError(null);
      const res = await v1.uploadAndMatchJobs(formData);
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const bestMatch = results && results.length > 0
    ? results.reduce((a, b) => (a.match_pct > b.match_pct ? a : b))
    : null;

  const filteredPortals = remoteOnly
    ? ALL_PORTALS.filter((p) => REMOTE_PORTALS.includes(p.name))
    : selectedPortal === "All"
    ? ALL_PORTALS
    : ALL_PORTALS.filter((p) => p.name === selectedPortal);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-card)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Job Matching
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.03em" }}>
            {activeTab === "jobs" ? "Find Your Next Role" : "Find Your Next Internship"}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 520, marginTop: 6, lineHeight: 1.6 }}>
            {activeTab === "jobs"
              ? "Paste your resume text or upload a file to see matched roles from 25+ job portals."
              : "Browse free internship platforms and kickstart your career journey."}
          </p>

          <div className="page-tab-switcher">
            <button className={`page-tab ${activeTab === "jobs" ? "page-tab--active" : ""}`}
              onClick={() => handleTabChange("jobs")}>
              💼 Jobs
            </button>
            <button className={`page-tab ${activeTab === "internships" ? "page-tab--active" : ""}`}
              onClick={() => handleTabChange("internships")}>
              🎓 Internships
            </button>
          </div>
        </div>

        {activeTab === "jobs" && (
          <>
            <div className="portal-filter-bar">
              <button className={`portal-filter-chip ${selectedPortal === "All" && !remoteOnly ? "portal-filter-chip--active" : ""}`}
                onClick={() => { setSelectedPortal("All"); setRemoteOnly(false); }}>
                All
              </button>
              {ALL_PORTALS.map((p) => (
                <button key={p.name}
                  className={`portal-filter-chip ${selectedPortal === p.name && !remoteOnly ? "portal-filter-chip--active" : ""}`}
                  style={selectedPortal === p.name && !remoteOnly ? { borderColor: `${p.color}40`, background: `${p.color}15` } : {}}
                  onClick={() => { setSelectedPortal(p.name); setRemoteOnly(false); }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  {p.name}
                </button>
              ))}
              <button className={`portal-filter-chip portal-filter-chip--remote ${remoteOnly ? "portal-filter-chip--active" : ""}`}
                onClick={() => { setRemoteOnly(!remoteOnly); setSelectedPortal("All"); }}>
                🌍 Remote Only
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
              <div className="ui-card" style={{ padding: 24 }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>
                    Paste Resume Text
                  </div>
                  <textarea
                    className="sr-input"
                    rows={8}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your resume content here..."
                    style={{ width: "100%", resize: "vertical", fontSize: 14, lineHeight: 1.6 }}
                  />
                  <button className="btn-primary" type="submit" disabled={loading || !text.trim()}
                    style={{ width: "100%", marginTop: 12, fontSize: 13, padding: "10px 0" }}>
                    {loading ? "Analyzing..." : "Match Jobs"}
                  </button>
                </form>
              </div>

              <div className="ui-card" style={{ padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text)" }}>
                  Upload Resume File
                </div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
                  Accepts PDF, DOCX, TXT, and image files.
                </p>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: "2px dashed var(--border)", borderRadius: "var(--radius-sm)",
                    padding: 40, textAlign: "center", cursor: "pointer",
                    transition: "all 0.2s", background: "var(--bg-soft)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-soft)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-soft)"; }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" style={{ margin: "0 auto 10px", display: "block" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Choose file</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>or drag and drop</div>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={handleFile} style={{ display: "none" }} />
              </div>
            </div>

            {error && (
              <div style={{
                background: "var(--danger-soft)", color: "var(--danger)",
                padding: "12px 18px", borderRadius: "var(--radius-sm)",
                fontSize: 13, marginBottom: 24, border: "1px solid rgba(239,68,68,0.2)",
              }}>{error}</div>
            )}

            {results && results.length > 0 && (
              <>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                    Top Match
                  </div>
                  {bestMatch && (
                    <div className="ui-card" style={{
                      padding: 24, border: "1px solid var(--accent)",
                      position: "relative", overflow: "hidden",
                    }}>
                      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: "var(--accent-soft)", borderRadius: "0 0 0 100%" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                            {bestMatch.job.title}
                          </div>
                          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                            {bestMatch.job.company} &middot; {bestMatch.job.location}
                          </div>
                        </div>
                        <div style={{
                          padding: "4px 16px", borderRadius: 8,
                          background: "var(--success-soft)", color: "var(--success)",
                          fontSize: 22, fontWeight: 800,
                        }}>{Math.round(bestMatch.match_pct)}%</div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.6 }}>
                        {bestMatch.job.description?.slice(0, 280)}...
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {bestMatch.matched_skills?.map((sk) => <SkillBadge key={sk} label={sk} matched />)}
                        {bestMatch.missing_skills?.map((sk) => <SkillBadge key={sk} label={sk} />)}
                      </div>
                      <PortalBadge name={bestMatch.job.portal || bestMatch.job.source} />
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                    All Matches ({results.length})
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {results.map((j, i) => (
                    <div key={i} className="hover-card" style={s.jobRow}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{j.job.title}</span>
                          <PortalBadge name={j.job.portal || j.job.source} />
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
                          {j.job.company} &middot; {j.job.location}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {j.matched_skills?.slice(0, 5).map((sk) => <SkillBadge key={sk} label={sk} matched />)}
                          {j.missing_skills?.map((sk) => <SkillBadge key={sk} label={sk} />)}
                        </div>
                      </div>
                      <div style={{
                        padding: "4px 12px", borderRadius: 6, fontSize: 18, fontWeight: 800,
                        color: j.match_pct >= 70 ? "var(--success)" : j.match_pct >= 40 ? "var(--warning)" : "var(--danger)",
                        background: j.match_pct >= 70 ? "var(--success-soft)" : j.match_pct >= 40 ? "var(--warning-soft)" : "var(--danger-soft)",
                        whiteSpace: "nowrap",
                      }}>
                        {Math.round(j.match_pct)}%
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {results && results.length === 0 && !loading && (
              <div className="ui-card" style={{ textAlign: "center", padding: 40 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>No matches found</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Try a different resume or add more keywords.</p>
              </div>
            )}
          </>
        )}

        {activeTab === "internships" && (
          <>
            <div className="internship-grid">
              {internshipPortals.map((portal) => (
                <InternshipCard key={portal.id} portal={portal} />
              ))}
            </div>

            <div className="internship-callout">
              <div className="internship-callout-inner">
                <div>
                  <div className="internship-callout-title">Optimize your resume for internships too</div>
                  <div className="internship-callout-sub">Students with ATS-optimized resumes get 3x more internship callbacks.</div>
                </div>
                <Link to="/scan" className="btn-primary" style={{ whiteSpace: "nowrap", fontSize: 14, padding: "11px 24px", borderRadius: 10 }}>
                  Scan My Resume Free →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  tagMatched: {
    display: "inline-flex",
    padding: "3px 8px",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 500,
    background: "var(--success-soft)",
    color: "var(--success)",
    border: "1px solid rgba(16,185,129,0.2)",
  },
  tagMissing: {
    display: "inline-flex",
    padding: "3px 8px",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 500,
    background: "var(--bg-soft)",
    color: "var(--text-muted)",
    border: "1px dashed var(--border)",
  },
  jobRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: 18,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    transition: "all 0.15s",
    cursor: "default",
  },
};
