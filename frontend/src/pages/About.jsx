import { Link } from "react-router-dom";

const stats = [
  { value: "50K+", label: "Resumes scanned" },
  { value: "19", label: "Check points" },
  { value: "9", label: "Job portals" },
  { value: "94%", label: "Avg. satisfaction" },
];

const values = [
  {
    title: "ATS-first design",
    desc: "We built every check around how modern ATS software reads, parses, and ranks resumes — not how humans skim them.",
  },
  {
    title: "Privacy by default",
    desc: "Your resume data belongs to you. We never train on your content, and you can delete everything with one click.",
  },
  {
    title: "Practical scoring",
    desc: "No black-box scores. Every point maps to a fixable issue — weak verb, missing keyword, formatting risk — so you know what to change.",
  },
  {
    title: "Built for speed",
    desc: "Upload, scan, and get a prioritized action list in under 30 seconds. No account needed to see your first score.",
  },
];

export default function About() {
  return (
    <div className="landing" style={{ minHeight: "100vh" }}>
      <section style={{ padding: "80px 24px", background: "#F8FAFC" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#2563EB", marginBottom: 12 }}>
              <span style={{ width: 20, height: 2, borderRadius: 2, background: "#2563EB" }} />
              About
            </div>
            <h1 style={{ fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, color: "#0F172A", marginBottom: 16 }}>
              Resume checking that <span style={{ background: "linear-gradient(135deg, #2563EB, #4F46E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>actually helps</span>
            </h1>
            <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, maxWidth: 560, margin: "0 auto" }}>
              We started ProfileOptimizer because most resume checkers tell you a number without telling you what to fix. We do both — and we keep getting faster.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 64 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ textAlign: "center", background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: "20px 12px" }}>
                <div style={{ fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #2563EB, #4F46E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "#64748B" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 64 }}>
            {values.map((v) => (
              <div key={v.title} style={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: 28 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>{v.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{v.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", padding: "40px 0", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Ready to see your score?</h2>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>No sign-up required to get started.</p>
            <Link to="/signup" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 28px", borderRadius: 8, fontSize: 15, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg, #2563EB, #4F46E5)", textDecoration: "none" }}>Get your score</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
