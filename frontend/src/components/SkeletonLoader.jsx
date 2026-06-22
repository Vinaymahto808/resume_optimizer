export default function SkeletonCard({ lines = 3, width = "100%", height = "auto" }) {
  return (
    <div
      style={{
        ...styles.card,
        width,
        height,
      }}
    >
      <div style={styles.header}>
        <div style={styles.avatar} />
        <div style={styles.titleRow}>
          <div style={styles.title} />
          <div style={styles.subtitle} />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.line,
            width: `${70 + Math.random() * 30}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 120 }) {
  return (
    <div
      style={{
        ...styles.circle,
        width: size,
        height: size,
      }}
    />
  );
}

export function SkeletonBar({ width = "100%", height = 12 }) {
  return (
    <div
      style={{
        ...styles.bar,
        width,
        height,
      }}
    />
  );
}

export function SkeletonGrid({ count = 4, lines = 2 }) {
  return (
    <div style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}

const shimmer = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`;

if (typeof document !== "undefined") {
  const styleId = "skeleton-shimmer-keyframes";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = shimmer;
    document.head.appendChild(style);
  }
}

const baseShimmer = {
  background: "linear-gradient(90deg, rgba(148,163,184,0.06) 25%, rgba(148,163,184,0.14) 50%, rgba(148,163,184,0.06) 75%)",
  backgroundSize: "800px 100%",
  animation: "shimmer 1.8s ease-in-out infinite",
  borderRadius: 8,
};

const styles = {
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: 20,
    backdropFilter: "blur(8px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    ...baseShimmer,
  },
  titleRow: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  title: {
    height: 14,
    width: "60%",
    ...baseShimmer,
  },
  subtitle: {
    height: 10,
    width: "40%",
    ...baseShimmer,
  },
  line: {
    height: 10,
    marginTop: 10,
    ...baseShimmer,
  },
  circle: {
    borderRadius: "50%",
    ...baseShimmer,
  },
  bar: {
    borderRadius: 6,
    ...baseShimmer,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
  },
};
