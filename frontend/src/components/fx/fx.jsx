/* Motion primitives: scroll reveal, 3D tilt, count-up, magnetic parallax. All respect prefers-reduced-motion. */
import { Children, useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import "./fx.css";

const EASE = [0.22, 1, 0.36, 1];

/** Fade + rise into view once. `stagger` reveals direct children one after another. */
export function Reveal({ as = "div", children, delay = 0, y = 28, stagger = 0, className, style, ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  if (stagger) {
    return (
      <Tag className={className} style={style} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }} {...rest}>
        {Children.map(children, (child) => child && (
          <motion.div variants={{
            hidden: reduce ? { opacity: 0 } : { opacity: 0, y, filter: "blur(6px)" },
            show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
          }} style={{ height: "100%" }}>{child}</motion.div>
        ))}
      </Tag>
    );
  }
  return (
    <Tag className={className} style={style}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: EASE, delay }} {...rest}>
      {children}
    </Tag>
  );
}

/** Pointer-tracking 3D tilt with a moving glare. */
export function Tilt({ children, max = 10, scale = 1.02, glare = true, className = "", style }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const frame = useRef(0);

  const onMove = (e) => {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--rx", `${(0.5 - py) * max * 2}deg`);
      el.style.setProperty("--ry", `${(px - 0.5) * max * 2}deg`);
      el.style.setProperty("--gx", `${px * 100}%`);
      el.style.setProperty("--gy", `${py * 100}%`);
      el.style.setProperty("--ts", scale);
      el.style.setProperty("--go", 1);
    });
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--ts", 1);
    el.style.setProperty("--go", 0);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <div ref={ref} className={`fx-tilt ${className}`} style={style} onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="fx-tilt-inner">
        {children}
        {glare && <span className="fx-tilt-glare" aria-hidden="true" />}
      </div>
    </div>
  );
}

/** Counts from 0 to `value` when scrolled into view. */
export function CountUp({ value, duration = 1.6, suffix = "", prefix = "", format = (n) => n.toLocaleString() }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView || value == null || reduce) return undefined;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduce]);

  const display = reduce && inView && value != null ? value : shown;
  return <span ref={ref} className="fx-count">{prefix}{format(display)}{suffix}</span>;
}

/** Animated gradient border wrapper. */
export function GlowBorder({ children, className = "", radius = 20 }) {
  return (
    <div className={`fx-glow ${className}`} style={{ borderRadius: radius }}>
      <div className="fx-glow-inner" style={{ borderRadius: radius - 1 }}>{children}</div>
    </div>
  );
}
