import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { resumes, v1 } from "../api";
import { useResume } from "../contexts/ResumeContext";
import { usePlan } from "../contexts/PlanContext";
import { AdHorizontal, AdSidebar, UpgradePrompt } from "../components/AdBanner";

const categoryIcons = {
  Content: "📄", Format: "📐", Skills: "💼", Sections: "📋", Style: "🎨",
};

const categoryStatus = (score) => {
  if (score >= 80) return { label: "Good", color: "var(--success)" };
  if (score >= 50) return { label: "Fair", color: "var(--warning)" };
  return { label: "Poor", color: "var(--danger)" };
};

function NineteenPointCheck({ data }) {
  const [expanded, setExpanded] = useState({});
  if (!data) return null;

  const allItems = Object.values(data).reduce((sum, cat) => sum + cat.total, 0);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: "var(--text)", letterSpacing: "-0.02em" }}>
        19-point resume check
      </div>
      <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
        We check for {allItems} crucial things across 5 categories
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {Object.entries(data).map(([cat, info]) => {
          const st = categoryStatus(info.score);
          const isOpen = expanded[cat];
          const icon = categoryIcons[cat] || "📊";
          const barColor = info.score >= 80 ? "var(--success)" : info.score >= 50 ? "var(--warning)" : "var(--danger)";

          return (
            <div
              key={cat}
              className="results-category"
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                overflow: "hidden",
                background: "var(--bg-card)",
              }}
            >
              <div
                onClick={() => setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 14,
                  alignItems: "center",
                  padding: "16px 20px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{cat}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: 1, maxWidth: 160, height: 6, background: "var(--bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${info.score}%`, background: barColor, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{info.passed}/{info.total} checks</span>
                  </div>
                </div>
                <span style={{
                  fontSize: 24, fontWeight: 800, color: barColor,
                  fontVariantNumeric: "tabular-nums",
                }}>{info.score}%</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 12px",
                  borderRadius: 100, background: `${st.color}12`, color: st.color,
                  border: `1px solid ${st.color}25`,
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>{st.label}</span>
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "12px 20px 16px 20px", background: "var(--bg-soft)" }}>
                  {info.items.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "5px 0", fontSize: 13, color: item.passed ? "var(--text-secondary)" : "var(--text)",
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700,
                        color: "#FFFFFF",
                        background: item.passed ? "var(--success)" : "var(--danger)",
                        flexShrink: 0,
                      }}>{item.passed ? "✓" : "✗"}</span>
                      <span style={item.passed ? {} : { fontWeight: 600 }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RadialScore({ score, size = 140, strokeWidth = 10 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.28} fontWeight={800} fill="var(--text)" fontVariantNumeric="tabular-nums">
          {Math.round(score)}
        </text>
        <text x={size / 2} y={size / 2 + size * 0.12} textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.07} fill="var(--text-muted)">/ 100</text>
      </svg>
    </div>
  );
}

function CategoryBar({ name, score, count, total }) {
  const pct = Math.min(score || 0, 100);
  const barColor = pct >= 60 ? "var(--success)" : pct >= 30 ? "var(--warning)" : "var(--danger)";
  const icon = categoryIcons[name] || "📊";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          {icon} {name}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{count}/{total}</span>
      </div>
      <div style={{ height: 6, background: "var(--bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function SkillTag({ label, matched }) {
  return matched ? (
    <span style={s.tagMatched}>{label}</span>
  ) : (
    <span style={s.tagMissing}>{label}</span>
  );
}

export default function Results() {
  const { id } = useParams();
  const { updateResumeText } = useResume();
  const { isPaid, planLoading } = usePlan();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [profileResult, setProfileResult] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    resumes
      .get(id)
      .then((res) => {
        setData(res);
        if (res.raw_text) {
          updateResumeText(res.raw_text);
          setJobsLoading(true);
          v1.matchJobs(res.raw_text)
            .then((jr) => setJobs(jr.data))
            .catch(() => {})
            .finally(() => setJobsLoading(false));

          setProfileLoading(true);
          v1.analyze(res.raw_text.slice(0, 10000))
            .then((pr) => { if (pr.success) setProfileResult(pr.data); })
            .catch(() => {})
            .finally(() => setProfileLoading(false));
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <h2 style={{ marginBottom: 16, color: "var(--text)" }}>Resume not found</h2>
        <Link to="/scan" className="btn-primary">Upload Again</Link>
      </div>
    );
  }

  const score = data.ats_score || 0;
  const scoreColor = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="results-page">
      <div className="results-inner">
        <div className="results-header">
          <div className="results-title-section">
            <div className="results-eyebrow">Results</div>
            <h1 className="results-title">Resume Analysis</h1>
          </div>
          <Link to="/scan" className="btn-secondary" style={{ fontSize: 13, padding: "8px 18px" }}>
            Scan Another
          </Link>
        </div>

        {/* 19-Point Resume Check */}
        <NineteenPointCheck data={data.nineteen_point} />

        {/* Split Layout: Left Score | Right Content */}
        <div className="results-split" style={s.splitRow}>
          {/* Left: Score Breakdown */}
          <div style={s.leftPanel}>
            <RadialScore score={score} />
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{data.filename}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{data.word_count || 0} words</div>
            </div>

            {data.breakdown && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Breakdown</div>
                {Object.entries(data.breakdown).map(([key, val]) => {
                  const pct = Math.min((val / 40) * 100, 100);
                  const c = val >= 30 ? "var(--success)" : val >= 15 ? "var(--warning)" : "var(--danger)";
                  return (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                        <span style={{ fontWeight: 700, color: c }}>{val}/40</span>
                      </div>
                      <div style={{ height: 5, background: "var(--bg-secondary)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {data.category_breakdown && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Categories</div>
                {Object.entries(data.category_breakdown)
                  .sort((a, b) => a[1].score - b[1].score)
                  .map(([cat, info]) => (
                  <CategoryBar key={cat} name={cat} score={info.score} count={info.count} total={info.total} />
                ))}
              </div>
            )}
          </div>

          {/* Right: Content */}
          <div style={s.rightPanel}>
            {/* Suggestions */}
            <div className="ui-card" style={{ ...s.sectionCard }}>
              <div style={s.sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Suggestions to Improve
              </div>
              {data.suggestions?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.suggestions.slice(0, 6).map((sg, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)",
                      background: "var(--bg-soft)", borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)", lineHeight: 1.5,
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: "var(--accent-soft)", color: "var(--accent)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
                      }}>{i + 1}</span>
                      {sg}
                    </div>
                  ))}
                </div>
              ) : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No suggestions</p>}
            </div>

            {/* Ad placement for free users */}
            {!planLoading && !isPaid && (
              <div style={{ marginBottom: 16 }}>
                <AdSidebar style={{ minHeight: 200 }} />
              </div>
            )}

            {/* Keywords by Category */}
            {data.category_breakdown && (
              <div className="ui-card" style={s.sectionCard}>
                <div style={s.sectionTitle}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  Skills & Keywords
                </div>
                {Object.entries(data.category_breakdown).map(([cat, info]) => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {categoryIcons[cat] || "📊"} {cat}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {info.matched?.length > 0
                        ? info.matched.map((kw) => <SkillTag key={kw} label={kw} matched />)
                        : null}
                      {info.missing?.length > 0
                        ? info.missing.map((kw) => <SkillTag key={kw} label={kw} />)
                        : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Jobs */}
            <div className="ui-card" style={s.sectionCard}>
              <div style={s.sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                Recommended Jobs
                {jobsLoading && <span style={s.loadingHint}> loading...</span>}
              </div>
              {jobs && jobs.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {jobs.slice(0, 5).map((j, i) => (
                    <div key={i} style={s.jobCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{j.job.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{j.job.company} &middot; {j.job.location}</div>
                        </div>
                        <div style={{ ...s.jobMatchPct, color: scoreColor, borderColor: `${scoreColor}40` }}>{Math.round(j.match_pct)}%</div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {j.matched_skills?.slice(0, 3).map((sk) => <SkillTag key={sk} label={sk} matched />)}
                        {j.missing_skills?.length > 0 && <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>+{j.missing_skills.length} missing</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !jobsLoading ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No job recommendations available</p> : null}
              {jobs && jobs.length > 5 && (
                <Link to="/job-recommender" style={{ display: "block", textAlign: "center", marginTop: 14, fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                  View all {jobs.length} matches &rarr;
                </Link>
              )}
            </div>

            {/* Profile Analysis */}
            <div className="ui-card" style={s.sectionCard}>
              <div style={s.sectionTitle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                LinkedIn Optimization
                {profileLoading && <span style={s.loadingHint}> analyzing...</span>}
              </div>
              {profileResult ? (
                <div>
                  {profileResult.optimized_headline && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={s.profileLabel}>Optimized Headline</div>
                      <div style={s.profileBox}>{profileResult.optimized_headline}</div>
                    </div>
                  )}
                  {profileResult.suggestions?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={s.profileLabel}>Suggestions</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {profileResult.suggestions.slice(0, 4).map((sg, i) => (
                          <div key={i} style={{
                            padding: "8px 12px", fontSize: 13, color: "var(--text-secondary)",
                            background: "var(--bg-soft)", borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border)", lineHeight: 1.5,
                          }}>{sg}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {profileResult.optimized_about && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={s.profileLabel}>Optimized About</div>
                      <div style={s.profileBox}>{profileResult.optimized_about}</div>
                    </div>
                  )}
                </div>
              ) : !profileLoading ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Analysis will appear here automatically</p> : null}
            </div>

            {/* Upgrade prompt for free users */}
            {!planLoading && !isPaid && (
              <div style={{ marginTop: 16 }}>
                <UpgradePrompt compact />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
              <Link to="/dashboard" className="btn-secondary" style={{ fontSize: 13, padding: "9px 22px" }}>Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  splitRow: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: 24,
    alignItems: "start",
  },

  leftPanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 28,
    position: "sticky",
    top: 84,
    boxShadow: "var(--shadow-sm)",
  },

  rightPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  sectionCard: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 16,
    color: "var(--text)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  loadingHint: {
    fontSize: 12,
    color: "var(--text-muted)",
    fontWeight: 400,
    marginLeft: 4,
  },

  tagMatched: {
    display: "inline-flex",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    background: "var(--success-soft)",
    color: "var(--success)",
    border: "1px solid rgba(16,185,129,0.2)",
  },
  tagMissing: {
    display: "inline-flex",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    background: "var(--bg-soft)",
    color: "var(--text-muted)",
    border: "1px dashed var(--border)",
  },

  jobCard: {
    background: "var(--bg-soft)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 14,
  },
  jobMatchPct: {
    padding: "2px 10px",
    borderRadius: 6,
    border: "1px solid",
    fontSize: 14,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },

  profileLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--text-muted)",
    marginBottom: 6,
  },
  profileBox: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    background: "var(--bg-soft)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 12,
  },
};
