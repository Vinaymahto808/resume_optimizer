import { useState, useEffect } from "react";
import { payments } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const FALLBACK_PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Basic ATS scan to get started",
    price_id: "free",
    amount: 0,
    features: [
      "1 resume scan / month",
      "Basic ATS score",
      "5 optimization suggestions",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    description: "Unlimited scans + essential checks",
    price_id: "price_basic_monthly",
    amount: 500,
    features: [
      "Unlimited resume scans",
      "Detailed ATS breakdown (19 checks)",
      "Keyword & skill analysis",
      "Resume templates",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Full toolkit for serious applicants",
    price_id: "price_pro_monthly",
    amount: 1000,
    features: [
      "Everything in Basic",
      "AI rewrite suggestions",
      "LinkedIn profile analysis",
      "Job matching (9 portals)",
      "Priority support",
    ],
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prices, setPrices] = useState(FALLBACK_PLANS);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    payments.getPrices().then(setPrices).catch(() => {});
  }, []);

  const handleSubscribe = async (priceId) => {
    if (!user) {
      navigate("/signup");
      return;
    }
    setLoading(true);
    setLoadingId(priceId);
    try {
      const result = await payments.createCheckout({
        price_id: priceId,
        success_url: `${window.location.origin}/dashboard`,
        cancel_url: `${window.location.origin}/pricing`,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error(err);
      alert("Payment failed. Check your credentials.");
    }
    setLoading(false);
    setLoadingId(null);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <h2 style={styles.title}>Choose Your Plan</h2>
      <p style={styles.subtitle}>
        Get the right tools to optimize your resume for ATS systems.
      </p>

      <div style={styles.grid}>
        {prices.map((p, idx) => {
          const isPopular = p.id === "basic";
          const isFree = p.id === "free";
          return (
            <div
              key={p.id}
              className="hover-card proximity-glow ui-card"
              style={{
                ...styles.card,
                borderColor: isPopular ? "var(--accent)" : "var(--border)",
              }}
            >
              {isPopular && <div style={styles.popular}>Most Popular</div>}
              <h3 style={styles.planName}>{p.name}</h3>
              <div style={styles.price}>
                {p.amount === 0 ? (
                  <span style={styles.amount}>Free</span>
                ) : (
                  <>
                    <span style={styles.amount}>
                      ${(p.amount / 100).toFixed(0)}
                    </span>
                    <span style={styles.period}>/month</span>
                  </>
                )}
              </div>
              <p style={styles.desc}>{p.description}</p>
              <ul style={styles.features}>
                {(p.features || []).map((f, i) => (
                  <li key={i} style={styles.feature}>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={isFree ? "btn-secondary" : "btn-primary"}
                style={styles.btn}
                onClick={() => handleSubscribe(p.price_id)}
                disabled={loading}
              >
                {loading && loadingId === p.price_id
                  ? "Processing..."
                  : isFree
                  ? "Get Started"
                  : "Subscribe"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "40px 24px",
    position: "relative",
  },
  bgGlow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    width: 600,
    height: 600,
    background:
      "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  title: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: 800,
    color: "var(--text)",
    position: "relative",
  },
  subtitle: {
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 16,
    marginBottom: 32,
    position: "relative",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    position: "relative",
  },
  card: {
    background: "var(--bg-card)",
    borderRadius: "var(--radius)",
    padding: 32,
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  popular: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: "translateX(-50%)",
    background: "var(--accent)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 14px",
    borderRadius: 20,
  },
  planName: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  price: { marginBottom: 12 },
  amount: { fontSize: 40, fontWeight: 800, color: "var(--accent)" },
  period: { fontSize: 16, color: "var(--text-muted)", marginLeft: 4 },
  desc: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 },
  features: { listStyle: "none", padding: 0, flex: 1 },
  feature: {
    padding: "6px 0",
    fontSize: 14,
    color: "var(--text-secondary)",
    borderBottom: "1px solid var(--border)",
  },
  btn: { width: "100%", marginTop: 20, textAlign: "center" },
};
