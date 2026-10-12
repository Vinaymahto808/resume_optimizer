import { useEffect, useRef } from "react";
import { career } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { usePlan } from "../../contexts/PlanContext";
import { Modal, Note } from "./ui";
import TurboPlans from "./TurboPlans";

/** Global upgrade/payment modal. Opens on any 402 from /api/career (see api.js) or via openPaywall(). */
export default function UpgradeModal() {
  const { user } = useAuth();
  const { paywall, closePaywall, refreshCareer } = usePlan();
  const handled = useRef(false);

  // PayPal returns to /?turbo=success&token=<order id>: capture it once.
  useEffect(() => {
    if (handled.current || !user) return;
    handled.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("turbo") === "success" && params.get("token")) {
      career.upgrade(params.get("token")).then(refreshCareer).catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user, refreshCareer]);

  if (!paywall.open || !user) return null;
  return (
    <Modal title="Upgrade to Turbo" onClose={closePaywall} wide>
      {paywall.reason && <Note tone="warn">{paywall.reason}</Note>}
      <TurboPlans compact onUpgraded={closePaywall} />
    </Modal>
  );
}
