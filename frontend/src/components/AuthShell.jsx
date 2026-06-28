import cardPattern from "../assets/card-pattern.svg";

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  metrics = [],
  bullets = [],
  note = "A calmer workspace for serious applications.",
  children,
}) {
  return (
    <div style={styles.page}>
      <div className="auth-shell-grid" style={styles.wrap}>
        <aside className="ui-card auth-shell-aside" style={styles.aside}>
          <div style={styles.asideWash} />
          <div style={styles.eyebrow}>{eyebrow}</div>
          <h1 style={styles.title}>{title}</h1>
          <p style={styles.subtitle}>{subtitle}</p>

          {metrics.length > 0 && (
            <div style={styles.metrics}>
              {metrics.map((metric) => (
                <div key={metric.label} style={styles.metricCard}>
                  <div style={styles.metricValue}>{metric.value}</div>
                  <div style={styles.metricLabel}>{metric.label}</div>
                </div>
              ))}
            </div>
          )}

          {bullets.length > 0 && (
            <div style={styles.bulletList}>
              {bullets.map((bullet) => (
                <div key={bullet} style={styles.bulletRow}>
                  <span style={styles.bulletDot} />
                  <span style={styles.bulletText}>{bullet}</span>
                </div>
              ))}
            </div>
          )}

          <div style={styles.note}>{note}</div>
        </aside>

        <div style={styles.panel}>{children}</div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "calc(100vh - 64px)",
    padding: "clamp(24px, 4vw, 40px) 24px clamp(40px, 6vw, 64px)",
    display: "flex",
    alignItems: "center",
  },
  wrap: {
    width: "100%",
    maxWidth: 1180,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.05fr) minmax(340px, 0.95fr)",
    gap: 24,
    alignItems: "stretch",
  },
  aside: {
    position: "relative",
    overflow: "hidden",
    minHeight: 560,
    padding: "32px clamp(24px, 4vw, 36px)",
    borderRadius: 24,
    border: "1px solid rgba(148, 163, 184, 0.14)",
    background:
      `linear-gradient(160deg, rgba(10,15,28,0.96), rgba(10,15,28,0.84)), url(${cardPattern})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 24px 72px rgba(2, 6, 23, 0.34)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 20,
  },
  asideWash: {
    position: "absolute",
    inset: "auto -18% -28% auto",
    width: 280,
    height: 280,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(34, 197, 94, 0.15), transparent 68%)",
    filter: "blur(12px)",
    pointerEvents: "none",
  },
  eyebrow: {
    position: "relative",
    display: "inline-flex",
    alignSelf: "flex-start",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(34, 197, 94, 0.18)",
    background: "rgba(34, 197, 94, 0.1)",
    color: "var(--accent)",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
  },
  title: {
    position: "relative",
    margin: 0,
    fontFamily: "var(--font-display)",
    fontSize: "clamp(34px, 4.2vw, 52px)",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
    color: "var(--foreground)",
    maxWidth: 540,
  },
  subtitle: {
    position: "relative",
    margin: 0,
    maxWidth: 520,
    color: "var(--text-secondary)",
    fontSize: 15,
    lineHeight: 1.75,
  },
  metrics: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
  },
  metricCard: {
    borderRadius: 16,
    border: "1px solid rgba(148, 163, 184, 0.14)",
    background: "rgba(15, 23, 42, 0.62)",
    padding: "12px 14px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "var(--foreground)",
    lineHeight: 1.1,
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },
  bulletList: {
    position: "relative",
    display: "grid",
    gap: 10,
    paddingTop: 8,
    borderTop: "1px solid rgba(148, 163, 184, 0.12)",
  },
  bulletRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    color: "var(--text-secondary)",
    fontSize: 14,
    lineHeight: 1.6,
  },
  bulletDot: {
    marginTop: 8,
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--accent)",
    flexShrink: 0,
    boxShadow: "0 0 0 5px rgba(34, 197, 94, 0.08)",
  },
  bulletText: {
    flex: 1,
  },
  note: {
    position: "relative",
    marginTop: "auto",
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
  },
  panel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
