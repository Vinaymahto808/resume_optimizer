import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./fx/fx.css";

/** On navigation: scroll to #hash targets (waiting briefly for async content), otherwise to the top. */
export default function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return undefined;
    }
    let tries = 0;
    let timer;
    const find = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("fx-target-flash");
        // Content above may still be loading and push the target down: re-aim twice if it drifted.
        const settle = (left) => {
          timer = setTimeout(() => {
            const top = el.getBoundingClientRect().top;
            if (top < 40 || top > 160) el.scrollIntoView({ behavior: "auto", block: "start" });
            if (left > 1) settle(left - 1);
            else el.classList.remove("fx-target-flash");
          }, 700);
        };
        settle(2);
      } else if (tries++ < 30) {
        timer = setTimeout(find, 100);
      }
    };
    find();
    return () => clearTimeout(timer);
  }, [pathname, hash]);
  return null;
}
