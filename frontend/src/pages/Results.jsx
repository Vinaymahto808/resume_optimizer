import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { resumes, profile } from "../api";

export default function Results() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  useEffect(() => {
    resumes
      .get(id)
      .then((res) => {
        setData(res);
        if (res.raw_text) {
          setJobsLoading(true);
          profile
            .recommendJobs(res.raw_text)
            .then((jr) => setJobs(jr.data))
            .catch(() => {})
            .finally(() => setJobsLoading(false));
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: 80 }}>
          Loading...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <h2>Resume not found</h2>
        <Link to="/scan" className="btn-primary" style={{ marginTop: 16 }}>
          Upload Again
        </Link>
      </div>
    );
  }

  const score = data.ats_score || 0;
  const scoreColor =
    score >= 80
      ? "var(--success)"
      : score >= 50
      ? "var(--warning)"
      : "var(--danger)";
  const scoreLabel =
    score >= 80 ? "Excellent" : score >= 50 ? "Needs Work" : "Poor";

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />

      <div style={styles.scoreSection}>
        <div style={styles.scoreCircle}>
          <div style={{ ...styles.scoreNum, color: scoreColor }}>{score}</div>
          <div style={styles.scoreOutOf}>/ 100</div>
          <span
            style={{
              ...styles.scoreBadge,
              background: `${scoreColor}1a`,
              color: scoreColor,
              border: `1px solid ${scoreColor}33`,
            }}
          >
            {scoreLabel}
          </span>
        </div>
        <div style={styles.scoreInfo}>
          <h2 style={styles.filename}>{data.filename}</h2>
          <p style={styles.wordCount}>{data.word_count} words</p>
          <div style={styles.breakdown}>
            {data.breakdown &&
              Object.entries(data.breakdown).map(([key, val]) => (
                <div key={key} style={styles.breakRow}>
                  <span style={styles.breakLabel}>
                    {key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <div style={styles.breakBar}>
                    <div
                      style={{
                        ...styles.breakFill,
                        width: `${Math.min((val / 40) * 100, 100)}%`,
                        background:
                          val >= 30
                            ? "var(--success)"
                            : val >= 15
                            ? "var(--warning)"
                            : "var(--danger)",
                      }}
                    />
                  </div>
                  <span style={styles.breakVal}>{val}/40</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {data.category_breakdown && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          {Object.entries(data.category_breakdown).map(([cat, info]) => {
            const pct = info.score || 0;
            const barColor =
              pct >= 60 ? "var(--success)" : pct >= 30 ? "var(--warning)" : "var(--danger)";
            return (
              <div key={cat} style={styles.catCard}>
                <div style={styles.catHeader}>
                  <span style={styles.catName}>{cat}</span>
                  <span style={{ ...styles.catScore, color: barColor }}>
                    {info.count}/{info.total}
                  </span>
                </div>
                <div style={styles.catBarBg}>
                  <div style={{ ...styles.catBarFill, width: `${Math.min(pct, 100)}%`, background: barColor }} />
                </div>
                <div style={styles.tagWrap}>
                  {info.matched?.length > 0 ? (
                    info.matched.map((kw) => (
                      <span key={kw} style={styles.tagSuccess}>{kw}</span>
                    ))
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No skills matched</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Suggestions to Improve</h3>
        {data.suggestions?.length > 0 ? (
          <ul style={styles.suggestList}>
            {data.suggestions.map((s, i) => (
              <li key={i} style={styles.suggestItem}>
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <p style={styles.emptyText}>No suggestions</p>
        )}
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>
          Recommended Jobs
          {jobsLoading && (
            <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
              — loading...
            </span>
          )}
        </h3>
        {jobs && jobs.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map((j, i) => (
              <div key={i} style={styles.jobCard}>
                <div style={styles.jobHeader}>
                  <div>
                    <div style={styles.jobTitle}>{j.job.title}</div>
                    <div style={styles.jobMeta}>
                      {j.job.company} &bull; {j.job.location}
                    </div>
                  </div>
                  <div style={styles.matchBadge}>{Math.round(j.match_pct)}%</div>
                </div>
                <div style={styles.jobTags}>
                  {j.matched_skills.slice(0, 4).map((s) => (
                    <span key={s} style={styles.tagSuccess}>
                      {s}
                    </span>
                  ))}
                  {j.missing_skills.slice(0, 2).length > 0 && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      +{j.missing_skills.length} missing
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !jobsLoading ? (
          <p style={styles.emptyText}>No job recommendations available</p>
        ) : null}
      </div>

      <div style={styles.actions}>
        <Link to="/scan" className="btn-primary">
          Scan Another
        </Link>
        <Link to="/dashboard" className="btn-secondary">
          Dashboard
        </Link>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 800, margin: "0 auto", padding: "40px 24px", position: "relative" },
  bgGlow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    width: 500,
    height: 500,
    background:
      "radial-gradient(circle, rgba(79,125,255,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  scoreSection: {
    display: "flex",
    gap: 32,
    marginBottom: 24,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 28,
    position: "relative",
  },
  scoreCircle: { textAlign: "center", minWidth: 120 },
  scoreNum: { fontSize: 52, fontWeight: 800, lineHeight: 1 },
  scoreOutOf: { fontSize: 14, color: "var(--text-muted)" },
  scoreBadge: {
    display: "inline-block",
    padding: "3px 12px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    marginTop: 8,
  },
  scoreInfo: { flex: 1 },
  filename: { fontSize: 20, fontWeight: 600, marginBottom: 2 },
  wordCount: { fontSize: 13, color: "var(--text-muted)", marginBottom: 16 },
  breakdown: { display: "flex", flexDirection: "column", gap: 8 },
  breakRow: { display: "flex", alignItems: "center", gap: 10 },
  breakLabel: { fontSize: 12, fontWeight: 600, width: 140 },
  breakBar: {
    flex: 1,
    height: 8,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 4,
    overflow: "hidden",
  },
  breakFill: { height: "100%", borderRadius: 4, transition: "width 0.5s" },
  breakVal: { fontSize: 12, fontWeight: 600, width: 35, textAlign: "right" },
  catCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 18,
  },
  catHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  catName: { fontSize: 14, fontWeight: 700 },
  catScore: { fontSize: 13, fontWeight: 700 },
  catBarBg: {
    height: 6,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  catBarFill: { height: "100%", borderRadius: 3, transition: "width 0.6s" },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
  },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 12 },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  tagSuccess: {
    background: "rgba(74,222,128,0.1)",
    color: "var(--success)",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    border: "1px solid rgba(74,222,128,0.2)",
  },
  tagDanger: {
    background: "rgba(248,113,113,0.1)",
    color: "var(--danger)",
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    border: "1px solid rgba(248,113,113,0.2)",
  },
  suggestList: { margin: 0, paddingLeft: 20 },
  suggestItem: {
    fontSize: 14,
    color: "var(--text-secondary)",
    marginBottom: 8,
    lineHeight: 1.5,
  },
  jobCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: 14,
  },
  jobHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  jobTitle: { fontSize: 14, fontWeight: 600 },
  jobMeta: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  matchBadge: {
    background: "rgba(99,102,241,0.15)",
    color: "var(--accent)",
    padding: "2px 10px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  jobTags: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  emptyText: { fontSize: 14, color: "var(--text-muted)" },
  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    marginTop: 24,
  },
};
