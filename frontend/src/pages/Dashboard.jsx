import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { resumes, payments } from "../api";
import { usePlan } from "../contexts/PlanContext";
import { AdHorizontal, UpgradePrompt } from "../components/AdBanner";

function StatusPill({ atsScore }) {
  if (atsScore === null || atsScore === undefined) {
    return <span style={s.pillParsing}>Parsing Failed</span>;
  }
  const score = typeof atsScore === "number" ? atsScore : (parseInt(atsScore) || 0);
  if (score >= 80) return <span style={s.pillSuccess}>Successful</span>;
  return <span style={s.pillFail}>Needs Work</span>;
}

export default function Dashboard() {
  const { isPaid, planLoading } = usePlan();
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
    <div style={s.page}>
      <style>{`
        .dash-kpi {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .dash-table-head {
          display: flex;
          padding: 12px 20px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid var(--border);
          background: rgba(148,163,184,0.03);
        }

        .dash-table-head span { flex: 1; text-align: left; }

        .dash-table-row {
          display: flex;
          align-items: center;
          padding: 14px 20px;
          text-decoration: none;
          color: inherit;
          border-bottom: 1px solid var(--border);
          transition: background 0.12s;
        }
        .dash-table-row:hover { background: rgba(148,163,184,0.04); }
        .dash-table-row:last-child { border-bottom: 0; }

        .dash-table-row span { flex: 1; }

        @media (max-width: 768px) {
          .dash-kpi {
            grid-template-columns: 1fr;
            gap: 12px;
            margin-bottom: 20px;
          }

          .dash-table-head { display: none; }

          .dash-table-row {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
            padding: 14px 16px;
          }

          .dash-table-row span {
            flex: none;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .dash-table-row span::before {
            content: attr(data-label);
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            min-width: 70px;
            flex-shrink: 0;
          }
        }
      `}</style>

      {/* KPI Row */}
      <div className="dash-kpi">
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

      {/* Ad placement for free users */}
      {!planLoading && !isPaid && (
        <div style={{ marginBottom: 20 }}>
          <AdHorizontal />
        </div>
      )}

      {/* Upgrade prompt for free users */}
      {!planLoading && !isPaid && (
        <div style={{ marginBottom: 20 }}>
          <UpgradePrompt />
        </div>
      )}

      {/* Recent Resumes Table */}
      <div className="ui-card" style={s.tableCard}>
        <div style={s.tableTitle}>Recent Resumes</div>
        <div>
          <div className="dash-table-head">
            <span>Filename</span>
            <span>Score</span>
            <span>Date</span>
            <span>Status</span>
          </div>
          {list.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}>{String.fromCodePoint(0x1F4C4)}</div>
              <p style={s.emptyText}>No resumes uploaded yet</p>
              <Link to="/scan" className="btn-primary" style={{ fontSize: 13 }}>Upload Resume</Link>
            </div>
          ) : (
            list.map((r) => {
              const score = r.ats_score || 0;
              const scoreColor = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
              return (
                <Link key={r.id} to={`/results/${r.id}`} className="dash-table-row">
                  <span data-label="Filename" style={{ fontWeight: 500, fontSize: 14, color: "var(--text)" }}>
                    {r.filename}
                  </span>
                  <span data-label="Score" style={{ fontWeight: 700, fontSize: 14, color: scoreColor }}>
                    {score}/100
                  </span>
                  <span data-label="Date" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "--"}
                  </span>
                  <span data-label="Status">
                    <StatusPill atsScore={r.ats_score} />
                  </span>
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
  page: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "clamp(16px, 3vw, 32px)",
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
