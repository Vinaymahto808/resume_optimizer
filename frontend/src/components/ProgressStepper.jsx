import { useState, useEffect, useCallback } from "react";

const STEPS = [
  { label: "Uploading", icon: "📄" },
  { label: "Parsing", icon: "🔍" },
  { label: "Analyzing", icon: "⚡" },
  { label: "Scoring", icon: "📊" },
  { label: "Generating", icon: "✨" },
];

export default function ProgressStepper({
  active = false,
  currentStep = 0,
  estimatedSeconds = 30,
  onComplete,
  customSteps,
}) {
  const steps = customSteps || STEPS;
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const advance = useCallback(() => {
    setStep((s) => {
      const next = Math.min(s + 1, steps.length - 1);
      setProgress(0);
      return next;
    });
  }, [steps.length]);

  // Reset when (re)activated or when timing inputs change while active.
  // Derived during render instead of calling setState inside an effect.
  const resetKey = active ? `${estimatedSeconds}|${steps.length}` : null;
  const [prevResetKey, setPrevResetKey] = useState(null);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    if (active) {
      setStep(0);
      setProgress(0);
    }
  }

  // Keep the internal step pinned to an externally-controlled currentStep.
  const pinnedStep = Math.min(currentStep, steps.length - 1);
  if (prevResetKey === resetKey && currentStep > 0 && pinnedStep !== step) {
    setStep(pinnedStep);
  }

  useEffect(() => {
    if (!active) return;
    const interval = (estimatedSeconds * 1000) / steps.length / 10;
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) {
          clearInterval(timer);
          return 90;
        }
        return p + 10;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [active, estimatedSeconds, steps.length]);

  useEffect(() => {
    if (!active) return;
    if (step >= steps.length - 1) {
      const completeTimer = setTimeout(() => {
        setProgress(100);
        onComplete?.();
      }, 600);
      return () => clearTimeout(completeTimer);
    }
    const advanceTimer = setTimeout(advance, estimatedSeconds * 1000 / steps.length);
    return () => clearTimeout(advanceTimer);
  }, [active, step, steps.length, estimatedSeconds, advance, onComplete]);

  if (!active) return null;

  const pct = ((step + progress / 100) / steps.length) * 100;

  return (
    <div style={styles.wrapper}>
      <div style={styles.track}>
        <div style={{ ...styles.fill, width: `${pct}%` }} />
      </div>
      <div style={styles.labels}>
        {steps.map((s, i) => (
          <div
            key={s.label}
            style={{
              ...styles.label,
              opacity: i <= step ? 1 : 0.35,
              color: i <= step ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <span style={styles.icon}>{s.icon}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%",
    marginBottom: 24,
  },
  track: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    background: "rgba(148,163,184,0.12)",
    overflow: "hidden",
    marginBottom: 12,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
    background: "var(--accent-gradient)",
    transition: "width 0.5s ease",
    boxShadow: "0 0 12px var(--accent-glow)",
  },
  labels: {
    display: "flex",
    justifyContent: "space-between",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 500,
    transition: "opacity 0.3s, color 0.3s",
  },
  icon: {
    fontSize: 14,
  },
};
