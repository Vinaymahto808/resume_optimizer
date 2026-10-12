/**
 * Google AdSense setup for free-plan users.
 *
 * Configure in the frontend env (e.g. .env.production or the host's build settings):
 *   VITE_ADSENSE_ID=ca-pub-1234567890123456      publisher id (also used for ads.txt)
 *   VITE_ADSENSE_SLOT_BANNER=1234567890            responsive horizontal unit
 *   VITE_ADSENSE_SLOT_RECTANGLE=1234567890         sidebar / rectangle unit
 *   VITE_ADSENSE_SLOT_INFEED=1234567890            unit shown between list items
 * A placement whose slot is missing falls back to the banner slot; with no publisher id nothing loads.
 */
const env = import.meta.env;

export const ADSENSE_CLIENT = /^ca-pub-\d{10,20}$/.test(env.VITE_ADSENSE_ID || "") ? env.VITE_ADSENSE_ID : "";

const SLOTS = {
  banner: env.VITE_ADSENSE_SLOT_BANNER || "",
  rectangle: env.VITE_ADSENSE_SLOT_RECTANGLE || env.VITE_ADSENSE_SLOT_BANNER || "",
  infeed: env.VITE_ADSENSE_SLOT_INFEED || env.VITE_ADSENSE_SLOT_BANNER || "",
};

export function adSlot(kind) {
  return SLOTS[kind] || "";
}

export function adsConfigured() {
  return Boolean(ADSENSE_CLIENT && SLOTS.banner);
}

let loading = null;

/** Inject the AdSense library once, and only when an ad is actually about to render. */
export function loadAdSense() {
  if (!ADSENSE_CLIENT || typeof document === "undefined") return Promise.resolve(false);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false); // blocked by an ad blocker or offline: the slot stays empty
    document.head.appendChild(script);
  });
  return loading;
}
