import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { payments, career, PAYWALL_EVENT, CREDITS_EVENT } from "../api";

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState(() => localStorage.getItem("plan") || "free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [planLoading, setPlanLoading] = useState(true);
  // Career copilot plan (Free / Turbo with daily AI credits), from /api/career/me.
  const [careerProfile, setCareerProfile] = useState(null);
  const [paywall, setPaywall] = useState({ open: false, reason: null });

  const careerPlan = careerProfile?.plan || null;
  const isTurbo = careerPlan?.plan === "turbo";
  const isPaid = plan === "pro" || plan === "enterprise" || isTurbo;

  const refreshPlan = async () => {
    try {
      const sub = await payments.getSubscription();
      if (sub) {
        const p = sub.plan || "free";
        setPlan(p);
        localStorage.setItem("plan", p);
        setSubscriptionStatus(sub.status || "active");
      }
    } catch {
      setPlan("free");
      localStorage.setItem("plan", "free");
      setSubscriptionStatus("active");
    }
  };

  const refreshCareer = useCallback(async () => {
    try {
      const me = await career.me();
      setCareerProfile(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    Promise.resolve()
      .then(() => {
        if (!user) {
          setPlan("free");
          setSubscriptionStatus("active");
          setCareerProfile(null);
          return null;
        }
        setPlanLoading(true);
        return Promise.all([refreshPlan(), refreshCareer()]);
      })
      .finally(() => setPlanLoading(false));
  }, [user, refreshCareer]);

  // 402 from any /api/career call opens the upgrade modal; metered actions refresh credits.
  useEffect(() => {
    const onPaywall = (e) => {
      setPaywall({ open: true, reason: e.detail || null });
      refreshCareer();
    };
    const onCredits = () => refreshCareer();
    window.addEventListener(PAYWALL_EVENT, onPaywall);
    window.addEventListener(CREDITS_EVENT, onCredits);
    return () => {
      window.removeEventListener(PAYWALL_EVENT, onPaywall);
      window.removeEventListener(CREDITS_EVENT, onCredits);
    };
  }, [refreshCareer]);

  const openPaywall = useCallback((reason = null) => setPaywall({ open: true, reason }), []);
  const closePaywall = useCallback(() => setPaywall({ open: false, reason: null }), []);

  return (
    <PlanContext.Provider value={{
      plan,
      subscriptionStatus,
      isPaid,
      planLoading,
      refreshPlan,
      careerProfile,
      setCareerProfile,
      careerPlan,
      isTurbo,
      creditsRemaining: careerPlan ? careerPlan.credits_remaining : null,
      creditsLimit: careerPlan ? careerPlan.credits_limit : null,
      planExpiresAt: careerPlan?.expires_at || null,
      refreshCareer,
      paywall,
      openPaywall,
      closePaywall,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePlan = () => useContext(PlanContext);
