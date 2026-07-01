import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { payments } from "../api";

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState(() => localStorage.getItem("plan") || "free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("active");
  const [planLoading, setPlanLoading] = useState(true);

  const isPaid = plan === "pro" || plan === "enterprise";

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

  useEffect(() => {
    if (user) {
      setPlanLoading(true);
      refreshPlan().finally(() => setPlanLoading(false));
    } else {
      setPlan("free");
      setSubscriptionStatus("active");
      setPlanLoading(false);
    }
  }, [user]);

  return (
    <PlanContext.Provider value={{
      plan,
      subscriptionStatus,
      isPaid,
      planLoading,
      refreshPlan,
    }}>
      {children}
    </PlanContext.Provider>
  );
}

export const usePlan = () => useContext(PlanContext);
