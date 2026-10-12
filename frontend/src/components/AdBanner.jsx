import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePlan } from "../contexts/PlanContext";
import { ADSENSE_CLIENT, adSlot, adsConfigured, loadAdSense } from "../lib/ads";

const AD_STYLES = {
  frame: {
    borderRadius: "var(--radius)",
    border: "1px solid var(--border)",
    background: "var(--bg-card)",
    padding: "8px 8px 10px",
    overflow: "hidden",
  },
  label: {
    display: "block",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    textAlign: "center",
    marginBottom: 6,
    userSelect: "none",
  },
  devBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed var(--border)",
    borderRadius: 8,
    background: "var(--bg-soft)",
    color: "var(--text-muted)",
    fontSize: 11,
    textAlign: "center",
    padding: 8,
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

const MIN_HEIGHT = { banner: 90, rectangle: 250, infeed: 120 };

/** Fills one <ins> once it is in the page; a new route remounts it (see AdSlot's key). */
function AdUnit({ kind }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadAdSense().then((ok) => {
      const el = ref.current;
      if (cancelled || !el) return;
      if (!ok) { setFailed(true); return; }
      if (el.getAttribute("data-adsbygoogle-status")) return; // already filled (StrictMode re-run)
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        setFailed(true);
      }
    });
    return () => { cancelled = true; };
  }, []);
  if (failed) return null;
  return (
    <ins
      ref={ref}
      className="adsbygoogle"
      style={{ display: "block", minHeight: MIN_HEIGHT[kind] }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={adSlot(kind)}
      data-ad-format={kind === "rectangle" ? "rectangle" : "auto"}
      data-full-width-responsive="true"
      {...(import.meta.env.DEV ? { "data-adtest": "on" } : {})}
    />
  );
}

/**
 * An ad for free-plan users only. Paid users never load the AdSense script.
 * Without AdSense configuration it renders nothing in production and a labelled box in development.
 */
export function AdSlot({ kind = "banner", style }) {
  const { isPaid, planLoading } = usePlan();
  const { pathname } = useLocation();
  if (planLoading || isPaid) return null;
  if (!adsConfigured()) {
    if (!import.meta.env.DEV) return null;
    return (
      <div style={{ ...AD_STYLES.frame, ...style }}>
        <span style={AD_STYLES.label}>Advertisement</span>
        <div style={{ ...AD_STYLES.devBox, minHeight: MIN_HEIGHT[kind] }}>
          Ad slot ({kind}) — set VITE_ADSENSE_ID and VITE_ADSENSE_SLOT_* to show real ads
        </div>
      </div>
    );
  }
  return (
    <aside style={{ ...AD_STYLES.frame, ...style }} aria-label="Advertisement">
      <span style={AD_STYLES.label}>Advertisement</span>
      <AdUnit key={pathname} kind={kind} />
    </aside>
  );
}

export function AdHorizontal({ style }) {
  return <AdSlot kind="banner" style={style} />;
}

export function AdSidebar({ style }) {
  return <AdSlot kind="rectangle" style={style} />;
}

export function AdInFeed({ style }) {
  return <AdSlot kind="infeed" style={style} />;
}

export function UpgradePrompt({ compact, style }) {
  const { isPaid, planLoading } = usePlan();

  if (planLoading || isPaid) return null;

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
        Go ad-free with Turbo &rarr;
      </a>
    );
  }

  return (
    <div style={{ ...AD_STYLES.upgradeCard, ...style }}>
      <div>
        <div style={AD_STYLES.upgradeTextStrong}>Go ad-free with Turbo</div>
        <div style={AD_STYLES.upgradeText}>
          No ads, unlimited AI credits, full resume tailoring and Insider Connections.
        </div>
      </div>
      <a href="/pricing" style={AD_STYLES.upgradeBtn}>
        Upgrade Now &rarr;
      </a>
    </div>
  );
}
