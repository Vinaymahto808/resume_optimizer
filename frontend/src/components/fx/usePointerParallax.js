import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/** Tracks the pointer over an element as -1..1 offsets (for parallax scenes). */
export default function usePointerParallax(ref) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return undefined;
    let raf = 0;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPos({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }));
    };
    const leave = () => setPos({ x: 0, y: 0 });
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, [ref, reduce]);
  return pos;
}

