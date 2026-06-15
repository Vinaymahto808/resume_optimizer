import { useState, useEffect } from "react";
import { templates } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import ResumeBuilder from "../components/ResumeBuilder";

function TemplateBg({ name, color = "#4f7dff" }) {
  const letter = (name || "T")[0];
  const isM = letter === "M";
  const bg = isM
    ? <><rect x="20" y="15" width="160" height="170" rx="4" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><line x1="40" y1="50" x2="160" y2="50" stroke={color} strokeWidth="0.5" opacity="0.06" /><line x1="40" y1="70" x2="140" y2="70" stroke={color} strokeWidth="0.5" opacity="0.05" /><line x1="40" y1="90" x2="150" y2="90" stroke={color} strokeWidth="0.5" opacity="0.05" /><line x1="40" y1="110" x2="130" y2="110" stroke={color} strokeWidth="0.5" opacity="0.05" /><line x1="40" y1="130" x2="145" y2="130" stroke={color} strokeWidth="0.5" opacity="0.05" /><circle cx="35" cy="40" r="3" fill={color} opacity="0.08" /></>
    : <><line x1="70" y1="10" x2="70" y2="190" stroke={color} strokeWidth="0.5" opacity="0.06" /><circle cx="35" cy="35" r="10" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><line x1="90" y1="35" x2="170" y2="35" stroke={color} strokeWidth="0.5" opacity="0.06" /><line x1="90" y1="55" x2="160" y2="55" stroke={color} strokeWidth="0.5" opacity="0.06" /><line x1="90" y1="75" x2="165" y2="75" stroke={color} strokeWidth="0.5" opacity="0.06" /><circle cx="35" cy="100" r="2" fill={color} opacity="0.08" /><circle cx="35" cy="130" r="2" fill={color} opacity="0.08" /><circle cx="35" cy="160" r="2" fill={color} opacity="0.08" /></>;
  return (
    <svg style={styles.cardBg} width="100%" height="100%" viewBox="0 0 200 200" fill="none" preserveAspectRatio="none">
      <defs>
        <radialGradient id="tbgGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={color} stopOpacity="0.04" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="200" fill="url(#tbgGrad)" />
      {bg}
    </svg>
  );
}

export default function Templates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    templates.list().then(setList).catch(() => {});
  }, []);

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <h2 style={styles.title}>Resume Templates</h2>
      <p style={styles.subtitle}>
        Choose an ATS-optimized template to build your resume.
      </p>

      {!selected ? (
        <div style={styles.grid}>
          {list.map((t) => (
              <div
              key={t.id}
              className="tool-card"
              style={styles.card}
              onClick={() => {
                if (t.is_pro && !user) {
                  navigate("/signup");
                  return;
                }
                if (t.is_pro) {
                  navigate("/pricing");
                  return;
                }
                setSelected(t.id);
              }}
            >
              <TemplateBg name={t.name} />
              <div style={styles.preview}>{t.name[0]}</div>
              <h3 style={styles.templateName}>{t.name}</h3>
              <p style={styles.templateDesc}>{t.description}</p>
              <ul style={styles.features}>
                {(t.features || []).map((f, i) => (
                  <li key={i} style={styles.feature}>
                    {f}
                  </li>
                ))}
              </ul>
              {t.is_pro && <span style={styles.proBadge}>PRO</span>}
            </div>
          ))}
        </div>
      ) : (
        <ResumeBuilder
          templateId={selected}
          onBack={() => setSelected(null)}
        />
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: "40px 24px",
    position: "relative",
  },
  bgGlow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    width: 500,
    height: 500,
    background:
      "radial-gradient(circle, rgba(79,125,255,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  title: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: 800,
    position: "relative",
  },
  subtitle: {
    textAlign: "center",
    color: "var(--text-secondary)",
    fontSize: 16,
    marginBottom: 40,
    position: "relative",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 24,
    position: "relative",
  },
  card: {
    background: "var(--bg-card)",
    borderRadius: "var(--radius)",
    padding: 24,
    border: "1px solid var(--border)",
    cursor: "pointer",
    position: "relative",
    transition: "transform 0.15s, border-color 0.15s",
  },
  cardBg: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.7, zIndex: 0 },
  preview: {
    width: "100%",
    height: 140,
    background: "rgba(79,125,255,0.06)",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 40,
    fontWeight: 700,
    color: "var(--accent)",
    marginBottom: 16,
    border: "1px solid var(--border)",
    position: "relative", zIndex: 1,
  },
  templateName: { fontSize: 18, fontWeight: 700, marginBottom: 6, position: "relative", zIndex: 1 },
  templateDesc: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, position: "relative", zIndex: 1 },
  features: { listStyle: "none", padding: 0, position: "relative", zIndex: 1 },
  feature: {
    fontSize: 12,
    color: "var(--text-muted)",
    padding: "2px 0",
  },
  proBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    background: "linear-gradient(135deg, var(--accent), #6c5ce7)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    zIndex: 1,
  },
};
