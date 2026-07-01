import { usePlan } from "../contexts/PlanContext";

const ADSENSE_ID = import.meta.env.VITE_ADSENSE_ID || "";

const AD_STYLES = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
    padding: "16px",
    borderRadius: "var(--radius)",
    border: "1px dashed var(--border)",
    background: "var(--bg-soft)",
    overflow: "hidden",
    position: "relative",
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    opacity: 0.5,
    userSelect: "none",
  },
  upgradeCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "16px 20px",
    borderRadius: "var(--radius)",
    background: "linear-gradient(135deg, rgba(13,148,136,0.06), rgba(15,23,42,0.03))",
    border: "1px solid rgba(13,148,136,0.15)",
    flexWrap: "wrap",
  },
  upgradeText: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
  },
  upgradeTextStrong: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text-heading)",
  },
  upgradeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    background: "var(--accent-gradient)",
    color: "#fff",
    textDecoration: "none",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
};

export function AdPlaceholder({ style }) {
  return (
    <div style={{ ...AD_STYLES.container, ...style }}>
      <span style={AD_STYLES.label}>Advertisement</span>
    </div>
  );
}

export function AdSidebar({ style }) {
  return (
    <div style={{ ...AD_STYLES.container, ...style, minHeight: 250, flexDirection: "column", gap: 8 }}>
      <span style={AD_STYLES.label}>Sponsored Content</span>
      {ADSENSE_ID && (
        <div style={{ width: "100%", textAlign: "center", fontSize: 11, color: "var(--text-muted)", opacity: 0.4 }}>
          AdSense Unit — 300x250
        </div>
      )}
    </div>
  );
}

export function AdHorizontal({ style }) {
  return (
    <div style={{ ...AD_STYLES.container, ...style, minHeight: 90, flexDirection: "column", gap: 8 }}>
      <span style={AD_STYLES.label}>Advertisement</span>
      {ADSENSE_ID && (
        <div style={{ width: "100%", textAlign: "center", fontSize: 11, color: "var(--text-muted)", opacity: 0.4 }}>
          AdSense Unit — 728x90
        </div>
      )}
    </div>
  );
}

export function UpgradePrompt({ compact, style }) {
  const { plan } = usePlan();

  if (plan !== "free") return null;

  if (compact) {
    return (
      <a href="/pricing" style={{
        display: "block",
        padding: "8px 12px",
        borderRadius: 8,
        background: "rgba(13,148,136,0.06)",
        border: "1px solid rgba(13,148,136,0.12)",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--accent)",
        textDecoration: "none",
        textAlign: "center",
        transition: "all 0.15s",
        ...style,
      }}>
        Upgrade to Pro &rarr;
      </a>
    );
  }

  return (
    <div style={{ ...AD_STYLES.upgradeCard, ...style }}>
      <div>
        <div style={AD_STYLES.upgradeTextStrong}>Unlock Pro Features</div>
        <div style={AD_STYLES.upgradeText}>
          Remove ads, get unlimited AI rewrites, and unlock premium templates.
        </div>
      </div>
      <a href="/pricing" style={AD_STYLES.upgradeBtn}>
        Upgrade Now &rarr;
      </a>
    </div>
  );
}
