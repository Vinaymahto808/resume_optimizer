import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { resumes, payments } from "../api";

export default function Dashboard() {
  const [list, setList] = useState([]);
  const [sub, setSub] = useState(null);

  useEffect(() => {
    resumes.list().then(setList).catch(() => {});
    payments.getSubscription().then(setSub).catch(() => {});
  }, []);

  const avg =
    list.length > 0
      ? Math.round(list.reduce((s, r) => s + (r.ats_score || 0), 0) / list.length)
      : null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Dashboard</h2>
          <p style={styles.subtitle}>
            {list.length} resume{list.length !== 1 ? "s" : ""} scanned
          </p>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.badge}>
            {(sub?.plan || "Free").toUpperCase()}
          </span>
          <Link to="/scan" className="btn-primary" style={styles.scanBtn}>
            + New Scan
          </Link>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{list.length}</div>
          <div style={styles.statLabel}>Total Scans</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>
            {list.filter((r) => (r.ats_score || 0) >= 80).length}
          </div>
          <div style={styles.statLabel}>Above 80%</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{avg ?? "--"}</div>
          <div style={styles.statLabel}>Average Score</div>
        </div>
      </div>

      {list.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>{String.fromCodePoint(0x1F4C4)}</div>
          <h3 style={styles.emptyTitle}>No resumes yet</h3>
          <p style={styles.emptyText}>
            Upload your first resume to get your ATS score.
          </p>
          <Link to="/scan" className="btn-primary">
            Upload Resume
          </Link>
        </div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={styles.th}>Filename</span>
            <span style={styles.th}>Score</span>
            <span style={styles.th}>Date</span>
          </div>
          {list.map((r) => {
            const s = r.ats_score || 0;
            const color =
              s >= 80
                ? "var(--success)"
                : s >= 50
                ? "var(--warning)"
                : "var(--danger)";
            return (
              <Link key={r.id} to={`/results/${r.id}`} style={styles.row}>
                <span style={styles.filename}>{r.filename}</span>
                <span style={{ ...styles.score, color }}>{s}/100</span>
                <span style={styles.date}>
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 900, margin: "0 auto", padding: "40px 24px" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "var(--text-secondary)" },
  headerRight: { display: "flex", alignItems: "center", gap: 12 },
  badge: {
    background: "rgba(79,125,255,0.12)",
    color: "var(--accent)",
    padding: "4px 14px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid rgba(79,125,255,0.2)",
  },
  scanBtn: { fontSize: 13, padding: "8px 18px" },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 24,
    textAlign: "center",
  },
  statNum: { fontSize: 32, fontWeight: 800, color: "var(--accent)" },
  statLabel: { fontSize: 13, color: "var(--text-secondary)", marginTop: 4 },
  empty: {
    textAlign: "center",
    padding: "80px 24px",
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 600, marginBottom: 8 },
  emptyText: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24 },
  table: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    padding: "14px 20px",
    borderBottom: "1px solid var(--border)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  th: { flex: 1 },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "14px 20px",
    textDecoration: "none",
    color: "inherit",
    borderBottom: "1px solid var(--border)",
    transition: "background 0.15s",
  },
  filename: { flex: 1, fontWeight: 500, fontSize: 14 },
  score: { flex: 1, fontWeight: 700, fontSize: 15 },
  date: { flex: 1, fontSize: 13, color: "var(--text-muted)" },
};
