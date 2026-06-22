import { useState, useEffect } from "react";
import { ai } from "../api";
import SkeletonCard, { SkeletonCircle, SkeletonBar } from "../components/SkeletonLoader";
import { useResume } from "../contexts/ResumeContext";

function CircularMeter({ score, size = 140, strokeWidth = 10 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color = score >= 80 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={size / 2} y={size / 2 - 6} textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.22} fontWeight={800} fill={color}>{Math.round(score)}</text>
      <text x={size / 2} y={size / 2 + size * 0.1} textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.08} fill="var(--text-muted)">out of 100</text>
    </svg>
  );
}

function BarChart({ categories }) {
  if (!categories?.length) return null;
  return (
    <div style={styles.chart}>
      {categories.map((cat, i) => (
        <div key={i} style={styles.chartRow}>
          <div style={styles.chartLabel}>{cat.name}</div>
          <div style={styles.chartBars}>
            <div style={styles.chartTrack}>
              <div style={{
                ...styles.chartFill, width: `${cat.current_score}%`,
                background: "var(--accent-gradient)",
              }} />
            </div>
            <div style={styles.chartTrack}>
              <div style={{
                ...styles.chartFill, width: `${cat.benchmark_score}%`,
                background: "rgba(148,163,184,0.4)",
              }} />
            </div>
          </div>
          <div style={styles.chartValues}>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>{cat.current_score}%</span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{cat.benchmark_score}%</span>
          </div>
        </div>
      ))}
      <div style={styles.chartLegend}>
        <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "var(--accent-gradient)" }} /> Your Score</span>
        <span style={styles.legendItem}><span style={{ ...styles.legendDot, background: "rgba(148,163,184,0.4)" }} /> Industry Benchmark</span>
      </div>
    </div>
  );
}

export default function DashboardAnalytics() {
  const { latestText } = useResume();
  const [text, setText] = useState(latestText || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoFired, setAutoFired] = useState(false);

  useEffect(() => {
    if (latestText && !autoFired && !loading && !result) {
      setText(latestText);
      setAutoFired(true);
      const timer = setTimeout(() => handleAnalyze(latestText), 300);
      return () => clearTimeout(timer);
    }
  }, [latestText]);

  const handleAnalyze = async (overrideText) => {
    const t = overrideText ?? text;
    if (!t.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await ai.analytics(t);
      setResult(data.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Analytics generation failed. Make sure GEMINI_API_KEY is set."
      );
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <h2 style={styles.title}>Profile Analytics Dashboard</h2>
      <p style={styles.subtitle}>
        Analyze your profile strength, prioritize improvements, and benchmark against industry standards.
      </p>

      <div className="ui-card" style={styles.card}>
        <textarea
          style={styles.textarea}
          rows={5}
          placeholder="Paste your profile text or resume content..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          className="btn-primary"
          onClick={() => handleAnalyze()}
          disabled={loading || !text.trim()}
          style={{ marginTop: 12 }}
        >
          {loading ? "Analyzing..." : "Analyze Profile"}
        </button>
      </div>

      {loading && (
        <div style={styles.results}>
          <div className="ui-card" style={styles.strengthCard}>
            <div style={{ ...styles.meterRow, justifyContent: "center" }}>
              <SkeletonCircle size={140} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <SkeletonBar width="60%" height={14} />
                <div style={{ marginTop: 16 }} />
                <SkeletonBar width="90%" height={10} />
                <div style={{ marginTop: 10 }} />
                <SkeletonBar width="75%" height={10} />
                <div style={{ marginTop: 10 }} />
                <SkeletonBar width="50%" height={10} />
              </div>
            </div>
          </div>
          <SkeletonCard lines={4} />
          <div className="ui-card" style={styles.card}>
            <SkeletonBar width="40%" height={16} />
            <div style={{ marginTop: 16 }} />
            <SkeletonBar width="100%" height={10} />
            <div style={{ marginTop: 8 }} />
            <SkeletonBar width="100%" height={10} />
            <div style={{ marginTop: 8 }} />
            <SkeletonBar width="70%" height={10} />
          </div>
        </div>
      )}

      {result && (
        <div style={styles.results}>
          {/* Profile Strength Meter */}
          {result.profile_strength && (
            <div className="ui-card" style={styles.strengthCard}>
              <h3 style={styles.cardTitle}>Profile Strength</h3>
              <div style={styles.meterRow}>
                <CircularMeter score={result.profile_strength.score} />
                <div style={styles.sectionBreakdown}>
                  {result.profile_strength.sections?.map((sec, i) => (
                    <div key={i} style={styles.sectionRow}>
                      <div style={styles.sectionInfo}>
                        <span style={{
                          ...styles.statusDot,
                          background: sec.completed ? "var(--success)" : "var(--text-muted)",
                        }} />
                        <span style={styles.sectionName}>{sec.name}</span>
                      </div>
                      <span style={{
                        ...styles.sectionWeight,
                        color: sec.completed ? "var(--success)" : "var(--text-muted)",
                      }}>
                        +{sec.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top 5 Improvements */}
          {result.top_improvements?.length > 0 && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Top Improvements</h3>
              <p style={styles.improveHint}>Sorted by impact — highest score reward first</p>
              <div style={styles.improveList}>
                {result.top_improvements.map((item, i) => (
                  <div key={item.id} style={styles.improveItem}>
                    <div style={styles.improveRank}>
                      <span style={styles.improveNum}>{i + 1}</span>
                      <div style={{
                        ...styles.improveBar,
                        width: `${item.impact_weight}%`,
                        background: item.impact_weight >= 70 ? "var(--success)" :
                          item.impact_weight >= 40 ? "var(--warning)" : "var(--text-muted)",
                      }} />
                    </div>
                    <div style={styles.improveContent}>
                      <div style={styles.improveTitle}>{item.title}</div>
                      <p style={styles.improveDesc}>{item.description}</p>
                    </div>
                    <div style={styles.improveRight}>
                      <span style={styles.improvePoints}>+{item.impact_weight}</span>
                      <span className="btn-primary" style={styles.improveBtn}>
                        {item.action_label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill Categories Bar Chart */}
          {result.skill_categories?.length > 0 && (
            <div className="ui-card" style={styles.card}>
              <h3 style={styles.cardTitle}>Skills Benchmark</h3>
              <p style={styles.chartSubtitle}>Your current score vs. industry benchmark</p>
              <BarChart categories={result.skill_categories} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 800, margin: "0 auto", padding: "40px 24px", position: "relative" },
  bgGlow: {
    position: "absolute", top: "20%", left: "50%", width: 500, height: 500,
    background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)", pointerEvents: "none",
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4, position: "relative" },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, position: "relative" },
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, marginBottom: 16, position: "relative",
  },
  strengthCard: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 24, marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  textarea: {
    width: "100%", padding: "12px 14px", background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)", borderRadius: "var(--radius-sm)",
    color: "var(--text)", fontSize: 14, fontFamily: "inherit",
    resize: "vertical", lineHeight: 1.7, outline: "none", boxSizing: "border-box",
  },
  error: {
    color: "var(--danger)", fontSize: 13, padding: "8px 12px",
    background: "rgba(248,113,113,0.1)", borderRadius: "var(--radius-sm)", marginTop: 12,
  },
  results: { marginTop: 24, display: "flex", flexDirection: "column", gap: 16 },
  meterRow: { display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" },
  sectionBreakdown: { flex: 1, minWidth: 200 },
  sectionRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 0", borderBottom: "1px solid rgba(148,163,184,0.08)",
  },
  sectionInfo: { display: "flex", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  sectionName: { fontSize: 13, color: "var(--text-secondary)" },
  sectionWeight: { fontSize: 13, fontWeight: 700 },
  improveHint: { fontSize: 12, color: "var(--text-muted)", marginTop: -12, marginBottom: 16 },
  improveList: { display: "flex", flexDirection: "column", gap: 8 },
  improveItem: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "12px 14px", borderRadius: "var(--radius-sm)",
    border: "1px solid rgba(148,163,184,0.14)", background: "rgba(148,163,184,0.08)",
    position: "relative", overflow: "hidden",
  },
  improveRank: { position: "relative", width: 28, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  improveNum: { fontSize: 14, fontWeight: 800, color: "var(--text)", position: "relative", zIndex: 1 },
  improveBar: {
    height: 3, borderRadius: 2, position: "absolute", bottom: 0,
    transition: "width 0.5s ease",
  },
  improveContent: { flex: 1, minWidth: 0 },
  improveTitle: { fontSize: 14, fontWeight: 600, marginBottom: 2 },
  improveDesc: { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 },
  improveRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 },
  improvePoints: {
    fontSize: 16, fontWeight: 800, color: "var(--accent)",
  },
  improveBtn: {
    padding: "4px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6,
    cursor: "pointer",
  },
  chart: { display: "flex", flexDirection: "column", gap: 12 },
  chartSubtitle: { fontSize: 12, color: "var(--text-muted)", marginTop: -12, marginBottom: 16 },
  chartRow: { display: "grid", gridTemplateColumns: "120px 1fr 70px", gap: 12, alignItems: "center" },
  chartLabel: { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" },
  chartBars: { display: "flex", flexDirection: "column", gap: 3 },
  chartTrack: { height: 10, borderRadius: 5, background: "rgba(148,163,184,0.08)", overflow: "hidden" },
  chartFill: { height: "100%", borderRadius: 5, transition: "width 0.8s ease" },
  chartValues: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 },
  chartLegend: {
    display: "flex", gap: 20, justifyContent: "center", marginTop: 8,
    fontSize: 12, color: "var(--text-secondary)",
  },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: "50%", display: "inline-block" },
};
