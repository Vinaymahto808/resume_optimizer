import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import TurboPlans from "../components/career/TurboPlans";

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="pricing-page">
      <SEO
        title="Pricing Plans"
        description="Start free with daily AI credits, or go Turbo for unlimited AI job matching, resume tailoring, auto-apply and insider connections."
        canonical="https://www.profileotimizer.online/pricing"
      />
      <div className="pricing-header">
        <div className="pricing-eyebrow">Simple Pricing</div>
        <h1 className="pricing-title">
          Pick a plan, <span>land the job</span>
        </h1>
        <p className="pricing-subtitle">
          No surprise fees. Start free with daily AI credits and upgrade when you're ready. Save more with quarterly or annual billing.
        </p>
      </div>

      <TurboPlans onNeedLogin={user ? undefined : () => navigate("/signup")} onUpgraded={() => navigate("/dashboard")} />

      <p className="pricing-guarantee">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        No card needed for Free · Every UPI payment is checked by hand
      </p>
    </div>
  );
}
