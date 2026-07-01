import { useState, useEffect } from "react";
import { payments } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const FALLBACK_PLANS = [
  {
    id: "free",
    name: "Free",
    description: "Perfect to get a feel for the platform",
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
    description: "Everything you need for a strong job search",
    price_id: "price_basic_monthly",
    amount: 500,
    features: [
      "Unlimited resume scans",
      "Detailed ATS breakdown (19 checks)",
      "Keyword & skill analysis",
      "Professional resume templates",
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
      "Job matching across 9 portals",
      "Career roadmap generator",
      "Priority support",
    ],
  },
];

function CheckIcon() {
  return (
    <div className="pricing-feature-icon">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 6 5 9 10 3" />
      </svg>
    </div>
  );
}

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
    if (!user) { navigate("/signup"); return; }
    setLoading(true);
    setLoadingId(priceId);
    try {
      const result = await payments.createCheckout({
        price_id: priceId,
        success_url: `${window.location.origin}/dashboard`,
        cancel_url: `${window.location.origin}/pricing`,
      });
      if (result.url) window.location.href = result.url;
    } catch {
      alert("Payment failed. Please try again.");
    }
    setLoading(false);
    setLoadingId(null);
  };

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <div className="pricing-eyebrow">Simple Pricing</div>
        <h1 className="pricing-title">
          Pick a plan, <span>land the job</span>
        </h1>
        <p className="pricing-subtitle">
          No surprise fees. Cancel anytime. Start free and upgrade when you're ready.
        </p>
      </div>

      <div className="pricing-cards">
        {prices.map((p) => {
          const isPopular = p.id === "basic";
          const isFree = p.id === "free";
          const isLoading = loading && loadingId === p.price_id;

          return (
            <div
              key={p.id}
              className={`pricing-card${isPopular ? " pricing-card--popular" : ""}`}
            >
              {isPopular && <div className="pricing-card-badge">Most Popular</div>}

              <div className="pricing-card-header">
                <div className={`pricing-plan-name${isPopular ? " pricing-plan-name--popular" : ""}`}>
                  {p.name}
                </div>
                <div className="pricing-amount-row">
                  {p.amount > 0 && <span className="pricing-currency">$</span>}
                  <span className="pricing-amount">
                    {p.amount === 0 ? "Free" : (p.amount / 100).toFixed(0)}
                  </span>
                  {p.amount > 0 && <span className="pricing-period">/mo</span>}
                </div>
                <p className="pricing-desc">{p.description}</p>
              </div>

              <ul className="pricing-features" style={{ marginTop: 8 }}>
                {(p.features || []).map((f, i) => (
                  <li key={i} className="pricing-feature">
                    <CheckIcon />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`pricing-btn ${isPopular || !isFree ? "pricing-btn--primary" : "pricing-btn--secondary"}`}
                onClick={() => handleSubscribe(p.price_id)}
                disabled={loading}
              >
                {isLoading
                  ? "Processing…"
                  : isFree
                  ? "Get started free"
                  : `Get ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="pricing-guarantee">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        30-day money-back guarantee · No credit card for Free plan
      </p>
    </div>
  );
}
