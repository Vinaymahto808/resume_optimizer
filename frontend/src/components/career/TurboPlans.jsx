import { useEffect, useState } from "react";
import { career, apiError } from "../../api";
import { usePlan } from "../../contexts/PlanContext";
import { ErrorNote, Loading, Note, Spinner } from "./ui";
import { inr, money } from "./format";
import UpiPayment from "./UpiPayment";

function Check() {
  return (
    <div className="pricing-feature-icon">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 6 5 9 10 3" />
      </svg>
    </div>
  );
}

/** Free vs Turbo with billing periods, and checkout through UPI (manual), PayPal or dev mode.
 *  Used by the Pricing page and the global upgrade modal. */
export default function TurboPlans({ compact = false, onUpgraded, onNeedLogin }) {
  const { careerPlan, isTurbo, refreshCareer, planExpiresAt } = usePlan();
  const [info, setInfo] = useState(null);
  const [periodId, setPeriodId] = useState("monthly");
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    career.plans().then(setInfo).catch((e) => setError(apiError(e)));
  }, []);

  if (!info) return error ? <ErrorNote message={error} /> : <Loading />;

  const mode = info.billing_mode;
  const upi = mode === "upi_manual";
  const periods = info.billing_periods || [];
  const period = periods.find((p) => p.id === periodId) || periods[0];
  const price = (usd, rupees) => (upi ? inr(rupees) : money(usd));

  const checkout = async () => {
    setError(null);
    if (onNeedLogin) { onNeedLogin(); return; }
    if (upi) { setPaying(true); return; }
    setBusy(true);
    try {
      if (mode === "paypal") {
        const r = await career.checkout(periodId);
        if (r.approval_url) { window.location.href = r.approval_url; return; }
      }
      await career.upgrade("", periodId);
      await refreshCareer();
      onUpgraded?.();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (paying && period) {
    return (
      <div className="cp-stack upi-pay">
        <button className="cp-link" style={{ alignSelf: "flex-start" }} onClick={() => setPaying(false)}>← Back to plans</button>
        <UpiPayment period={period.id} periodLabel={period.label} onSubmitted={() => refreshCareer()}
          onApproved={async () => { await refreshCareer(); setPaying(false); onUpgraded?.(); }} />
      </div>
    );
  }

  return (
    <div className={`cp-stack turbo-plans${compact ? " turbo-plans--compact" : ""}`} style={{ gap: compact ? 14 : 20 }}>
      {careerPlan?.payment?.status === "pending" && (
        <Note tone="warn">Your UPI payment ({careerPlan.payment.utr}) is under review. Turbo turns on once it's approved.</Note>
      )}
      {periods.length > 1 && (
        <div className="cp-tabs turbo-periods" role="radiogroup" aria-label="Billing period" style={{ alignSelf: "center" }}>
          {periods.map((p) => (
            <button key={p.id} role="radio" aria-checked={p.id === periodId}
              className={`cp-tab${p.id === periodId ? " cp-tab--active" : ""}`} onClick={() => setPeriodId(p.id)}>
              {p.label}{p.savings_pct > 0 && <span className="turbo-save">-{p.savings_pct}%</span>}
            </button>
          ))}
        </div>
      )}
      <div className="pricing-cards turbo-cards">
        {info.plans.map((p) => {
          const turbo = p.id === "turbo";
          const amount = turbo && period
            ? price(period.per_month_usd, period.per_month_inr ?? Math.round(period.price_inr / period.months))
            : price(0, 0);
          return (
            <div key={p.id} className={`pricing-card${turbo ? " pricing-card--popular" : " pricing-card--free"}`}>
              {turbo && <div className="pricing-card-badge">Best for job seekers</div>}
              <div className="pricing-card-header">
                <div className={`pricing-plan-name${turbo ? " pricing-plan-name--popular" : ""}`}>{p.name}</div>
                <div className="pricing-amount-row">
                  <span className="pricing-amount">{turbo ? amount : "Free"}</span>
                  {turbo && <span className="pricing-period">/mo</span>}
                </div>
                <p className="pricing-desc">
                  {turbo && period
                    ? period.months > 1 ? `${price(period.price_usd, period.price_inr)} billed every ${period.months} months` : "Billed monthly"
                    : "Daily AI credits to get started"}
                </p>
              </div>
              <ul className="pricing-features" style={{ marginTop: 8 }}>
                {p.features.map((f) => <li key={f} className="pricing-feature"><Check /><span>{f}</span></li>)}
              </ul>
              {turbo ? (
                isTurbo ? (
                  <button className="pricing-btn pricing-btn--secondary" disabled>
                    Active{planExpiresAt ? ` until ${new Date(`${planExpiresAt}Z`).toLocaleDateString()}` : ""}
                  </button>
                ) : mode === "disabled" ? (
                  <button className="pricing-btn pricing-btn--secondary" disabled>Payments not configured</button>
                ) : (
                  <button className="pricing-btn pricing-btn--primary" onClick={checkout} disabled={busy}>
                    {busy ? <Spinner /> : upi ? "Pay with UPI" : mode === "paypal" ? "Continue to PayPal" : "Activate Turbo (dev, no charge)"}
                  </button>
                )
              ) : (
                <button className="pricing-btn pricing-btn--secondary" disabled>{isTurbo ? "Included" : "Current plan"}</button>
              )}
            </div>
          );
        })}
      </div>
      <ErrorNote message={error} />
    </div>
  );
}
