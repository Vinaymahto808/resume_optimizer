import { usePlan } from "../contexts/PlanContext";
import { AdHorizontal, UpgradePrompt } from "./AdBanner";

export default function FreemiumGate({ children, showAd = true, showUpgrade = true, adPosition = "after" }) {
  const { isPaid, planLoading } = usePlan();

  if (planLoading) return <>{children}</>;
  if (isPaid) return <>{children}</>;

  return (
    <>
      {adPosition === "before" && showAd && <div style={{ marginBottom: 16 }}><AdHorizontal /></div>}
      {children}
      {adPosition === "after" && showAd && <div style={{ marginTop: 16 }}><AdHorizontal /></div>}
      {showUpgrade && <div style={{ marginTop: 16 }}><UpgradePrompt /></div>}
    </>
  );
}
