import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const GTM_ID = import.meta.env.VITE_GTM_ID;

export function pushGTMEvent(event, data = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...data });
}

export function useGTMPageView() {
  const location = useLocation();

  useEffect(() => {
    if (!GTM_ID) return;
    pushGTMEvent("page_view", {
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  }, [location]);
}

export function useGTM() {
  return {
    GTM_ID,
    pushEvent: pushGTMEvent,
    trackLogin: (method = "email") =>
      pushGTMEvent("login", { method }),
    trackSignup: (method = "email") =>
      pushGTMEvent("signup", { method }),
    trackResumeUpload: (fileType = "pdf") =>
      pushGTMEvent("resume_upload", { file_type: fileType }),
    trackScanComplete: (score) =>
      pushGTMEvent("scan_complete", { score }),
    trackPayment: (plan, amount) =>
      pushGTMEvent("payment", { plan, amount }),
    trackFeature: (feature) =>
      pushGTMEvent("feature_used", { feature }),
  };
}
