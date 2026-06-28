import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { resumes, payments } from "../api";

function StatusPill({ atsScore }) {
  if (atsScore === null || atsScore === undefined) {
    return <span style={s.pillParsing}>Parsing Failed</span>;
  }
  const score = typeof atsScore === "number" ? atsScore : (parseInt(atsScore) || 0);
  if (score >= 80) return <span style={s.pillSuccess}>Successful</span>;
  return <span style={s.pillFail}>Needs Work</span>;
}

export default function Dashboard() {
  const [list, setList] = useState([]);
  const [sub, setSub] = useState(null);

  useEffect(() => {
    resumes.list().then(setList).catch(() => {});
    payments.getSubscription().then(setSub).catch(() => {});
  }, []);

  const totalScans = list.length;
  const topProfiles = list.filter((r) => (r.ats_score || 0) >= 80).length;
  const scored = list.filter((r) => r.ats_score !== null && r.ats_score !== undefined);
  const avg = scored.length > 0
    ? Math.round(scored.reduce((s, r) => s + (r.ats_score || 0), 0) / scored.length)
    : null;

  return (
    <div>
      {/* KPI Row */}
      <div className="dash-kpi-grid" style={s.kpiRow}>
        <div className="ui-card" style={s.kpiCard}>
          <div style={s.kpiValue}>{totalScans}</div>
          <div style={s.kpiLabel}>Total Scans</div>
          <div style={s.kpiSub}>All time uploads</div>
        </div>
        <div className="ui-card" style={s.kpiCard}>
          <div style={s.kpiValue}>{topProfiles}</div>
          <div style={s.kpiLabel}>Top Profiles</div>
          <div style={s.kpiSub}>Scored above 80%</div>
        </div>
        <div className="ui-card" style={s.kpiCard}>
          <div style={{ ...s.kpiValue, color: "var(--accent)" }}>{avg ?? "--"}/100</div>
          <div style={s.kpiLabel}>Avg. Score</div>
          <div style={s.kpiSub}>Excluding failed parsing</div>
        </div>
      </div>

      {/* Recent Resumes Table */}
      <div className="ui-card" style={s.tableCard}>
        <div style={s.tableTitle}>Recent Resumes</div>
        <div style={s.table}>
          <div style={s.tableHead}>
            <span style={s.th}>Filename</span>
            <span style={s.th}>Score</span>
            <span style={s.th}>Date</span>
            <span style={s.th}>Status</span>
          </div>
          {list.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}>{String.fromCodePoint(0x1F4C4)}</div>
              <p style={s.emptyText}>No resumes uploaded yet</p>
              <Link to="/scan" className="btn-primary" style={{ fontSize: 13 }}>Upload Resume</Link>
            </div>
          ) : (
            list.map((r) => {
              const s = r.ats_score || 0;
              const scoreColor = s >= 80 ? "var(--success)" : s >= 50 ? "var(--warning)" : "var(--danger)";
              return (
                <Link key={r.id} to={`/results/${r.id}`} style={s.row}>
                  <span style={s.filename}>{r.filename}</span>
                  <span style={{ ...s.score, color: scoreColor }}>{s}/100</span>
                  <span style={s.date}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "--"}
                  </span>
                  <span><StatusPill atsScore={r.ats_score} /></span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 28,
  },
  kpiCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 24,
    backdropFilter: "blur(12px)",
  },
  kpiValue: {
    fontSize: 36,
    fontWeight: 800,
    color: "var(--text)",
    lineHeight: 1,
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 12,
    color: "var(--text-muted)",
  },

  tableCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
  },
  tableTitle: {
    fontSize: 16,
    fontWeight: 700,
    padding: "18px 20px",
    borderBottom: "1px solid var(--border)",
  },
  table: {
    display: "flex",
    flexDirection: "column",
  },
  tableHead: {
    display: "flex",
    padding: "12px 20px",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid var(--border)",
    background: "rgba(148,163,184,0.03)",
  },
  th: { flex: 1, textAlign: "left" },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "14px 20px",
    textDecoration: "none",
    color: "inherit",
    borderBottom: "1px solid var(--border)",
    transition: "background 0.12s",
  },
  filename: { flex: 1, fontWeight: 500, fontSize: 14, color: "var(--text)" },
  score: { flex: 1, fontWeight: 700, fontSize: 14 },
  date: { flex: 1, fontSize: 13, color: "var(--text-muted)" },

  pillSuccess: {
    display: "inline-flex",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: "rgba(16,185,129,0.12)",
    color: "var(--success)",
    border: "1px solid rgba(16,185,129,0.2)",
  },
  pillFail: {
    display: "inline-flex",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: "rgba(239,68,68,0.12)",
    color: "var(--danger)",
    border: "1px solid rgba(239,68,68,0.2)",
  },
  pillParsing: {
    display: "inline-flex",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    background: "rgba(148,163,184,0.1)",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
  },

  empty: {
    textAlign: "center",
    padding: "48px 24px",
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: "var(--text-muted)", marginBottom: 16 },
};
