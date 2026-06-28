import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { resumes, v1 } from "../api";
import { useResume } from "../contexts/ResumeContext";

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
    <div className="ui-card" style={{ marginBottom: 20, padding: 24 }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: "var(--text)" }}>19-point resume check</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>We check for {allItems} crucial things across 5 categories</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(data).map(([cat, info]) => {
          const st = categoryStatus(info.score);
          const isOpen = expanded[cat];
          const icon = categoryIcons[cat] || "📊";
          const barColor = info.score >= 80 ? "var(--success)" : info.score >= 50 ? "var(--warning)" : "var(--danger)";

          return (
            <div key={cat} style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              background: "rgba(148,163,184,0.02)",
            }}>
              <div
                onClick={() => setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{cat}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 2 }}>
                    <div style={{ flex: 1, maxWidth: 120, height: 4, background: "rgba(148,163,184,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${info.score}%`, background: barColor, borderRadius: 2, transition: "width 0.5s" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{info.passed}/{info.total} checks</span>
                  </div>
                </div>
                <span style={{
                  fontSize: 22, fontWeight: 800, color: barColor,
                  fontVariantNumeric: "tabular-nums",
                }}>{info.score}%</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 10px",
                  borderRadius: 6, background: `${st.color}12`, color: st.color,
                  border: `1px solid ${st.color}30`,
                  textTransform: "uppercase", letterSpacing: "0.03em",
                }}>{st.label}</span>
              </div>

              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "10px 16px 14px" }}>
                  {info.items.map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "4px 0", fontSize: 13, color: item.passed ? "var(--text-secondary)" : "var(--text)",
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 700,
                        color: item.passed ? "var(--success)" : "var(--danger)",
                      }}>{item.passed ? "✓" : "▼"}</span>
                      <span>{item.label}</span>
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

function RadialScore({ score, size = 130, strokeWidth = 10 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.25} fontWeight={800} fill="#ffffff" fontVariantNumeric="tabular-nums">
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
          {icon} {name}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{count}/{total}</span>
      </div>
      <div style={{ height: 6, background: "rgba(148,163,184,0.08)", borderRadius: 3, overflow: "hidden" }}>
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
        <h2 style={{ marginBottom: 16 }}>Resume not found</h2>
        <Link to="/scan" className="btn-primary">Upload Again</Link>
      </div>
    );
  }

  const score = data.ats_score || 0;
  const scoreColor = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <div>
      {/* 19-Point Resume Check */}
      <NineteenPointCheck data={data.nineteen_point} />

      {/* Split Layout: Left Score | Right Keywords */}
      <div className="results-split" style={s.splitRow}>
        {/* Left: Score Breakdown */}
        <div className="ui-card results-left" style={s.leftPanel}>
          <RadialScore score={score} />
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{data.filename}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{data.word_count || 0} words</div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>Breakdown</div>
            {data.breakdown && Object.entries(data.breakdown).map(([key, val]) => {
              const pct = Math.min((val / 40) * 100, 100);
              const c = val >= 30 ? "var(--success)" : val >= 15 ? "var(--warning)" : "var(--danger)";
              return (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "var(--text-secondary)" }}>{key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                    <span style={{ fontWeight: 700, color: c }}>{val}/40</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(148,163,184,0.08)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: c, borderRadius: 2, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {data.category_breakdown && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>Categories</div>
              {Object.entries(data.category_breakdown).map(([cat, info]) => (
                <CategoryBar key={cat} name={cat} score={info.score} count={info.count} total={info.total} />
              ))}
            </div>
          )}
        </div>

        {/* Right: Keywords & Skills */}
        <div style={s.rightPanel}>
          {/* Suggestions */}
          <div className="ui-card" style={{ ...s.sectionCard, marginBottom: 16 }}>
            <div style={s.sectionTitle}>Suggestions to Improve</div>
            {data.suggestions?.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {data.suggestions.slice(0, 6).map((sg, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.5 }}>{sg}</li>
                ))}
              </ul>
            ) : <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No suggestions</p>}
          </div>

          {/* Keywords by Category */}
          {data.category_breakdown && (
            <div className="ui-card" style={s.sectionCard}>
              <div style={s.sectionTitle}>Skills & Keywords</div>
              {Object.entries(data.category_breakdown).map(([cat, info]) => (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>
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
              Recommended Jobs
              {jobsLoading && <span style={s.loadingHint}> loading...</span>}
            </div>
            {jobs && jobs.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {jobs.slice(0, 5).map((j, i) => (
                  <div key={i} style={s.jobCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{j.job.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{j.job.company} &middot; {j.job.location}</div>
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
              <Link to="/job-recommender" style={{ display: "block", textAlign: "center", marginTop: 12, fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>View all {jobs.length} matches &rarr;</Link>
            )}
          </div>

          {/* Profile Analysis */}
          <div className="ui-card" style={s.sectionCard}>
            <div style={s.sectionTitle}>
              LinkedIn Optimization
              {profileLoading && <span style={s.loadingHint}> analyzing...</span>}
            </div>
            {profileResult ? (
              <div>
                {profileResult.optimized_headline && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={s.profileLabel}>Optimized Headline</div>
                    <div style={s.profileBox}>{profileResult.optimized_headline}</div>
                  </div>
                )}
                {profileResult.suggestions?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={s.profileLabel}>Suggestions</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {profileResult.suggestions.slice(0, 4).map((sg, i) => (
                        <li key={i} style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{sg}</li>
                      ))}
                    </ul>
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

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <Link to="/scan" className="btn-primary" style={{ fontSize: 13, padding: "8px 20px" }}>Scan Another</Link>
            <Link to="/dashboard" className="btn-secondary" style={{ fontSize: 13, padding: "8px 20px" }}>Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  splitRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1.5fr",
    gap: 20,
    alignItems: "start",
  },

  leftPanel: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 24,
    position: "sticky",
    top: 24,
  },

  rightPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  sectionCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 12,
    color: "var(--text)",
  },
  loadingHint: {
    fontSize: 12,
    color: "var(--text-muted)",
    fontWeight: 400,
    marginLeft: 6,
  },

  tagMatched: {
    display: "inline-flex",
    padding: "3px 9px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    background: "rgba(16,185,129,0.12)",
    color: "#10B981",
    border: "1px solid rgba(16,185,129,0.25)",
  },
  tagMissing: {
    display: "inline-flex",
    padding: "3px 9px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    background: "rgba(148,163,184,0.06)",
    color: "var(--text-muted)",
    border: "1px dashed rgba(148,163,184,0.25)",
  },

  jobCard: {
    background: "rgba(148,163,184,0.03)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 12,
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
    background: "rgba(148,163,184,0.04)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 12,
  },
};
