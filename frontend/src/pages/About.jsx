import { Link } from "react-router-dom";
import { Eye, Shield, Zap, Clock } from "lucide-react";

const stats = [
  { value: "50K+", label: "Resumes scanned" },
  { value: "19", label: "Check points" },
  { value: "9", label: "Job portals" },
  { value: "94%", label: "Avg. satisfaction" },
];

const values = [
  {
    icon: Eye,
    title: "ATS-first design",
    desc: "We built every check around how modern ATS software reads, parses, and ranks resumes — not how humans skim them.",
  },
  {
    icon: Shield,
    title: "Privacy by default",
    desc: "Your resume data belongs to you. We never train on your content, and you can delete everything with one click.",
  },
  {
    icon: Zap,
    title: "Practical scoring",
    desc: "No black-box scores. Every point maps to a fixable issue — weak verb, missing keyword, formatting risk — so you know what to change.",
  },
  {
    icon: Clock,
    title: "Built for speed",
    desc: "Upload, scan, and get a prioritized action list in under 30 seconds. No account needed to see your first score.",
  },
];

export default function About() {
  return (
    <div className="landing">
      <section className="about-hero">
        <div className="about-hero-inner">
          <div className="about-eyebrow">Our Story</div>
          <h1 className="about-title">
            Resume checking that <span className="about-title-gradient">actually helps</span>
          </h1>
          <p className="about-subtitle">
            We started ProfileOptimizer because most resume checkers tell you a number
            without telling you what to fix. We do both — and we keep getting faster.
          </p>
          <div className="about-actions">
            <Link to="/signup" className="btn-primary hero-btn-primary">
              Get started free
            </Link>
            <Link to="/scan" className="btn-secondary hero-btn-secondary">
              Scan your resume
            </Link>
          </div>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stats-bar-inner">
          {stats.map((s) => (
            <div key={s.label} className="stats-bar-item">
              <div className="stats-bar-value"><span>{s.value}</span></div>
              <div className="stats-bar-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="checks-section">
        <div className="section-header">
          <div className="section-eyebrow">Why ProfileOptimizer</div>
          <h2 className="section-title-refined">
            Built for <span className="section-title-gradient">job seekers</span>
          </h2>
          <p className="section-sub-refined">
            Every feature is designed to help you land more interviews with less effort.
          </p>
        </div>
        <div className="about-values-grid">
          {values.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="about-value-card">
                <div className="about-value-icon">
                  <Icon size={18} />
                </div>
                <h3 className="about-value-title">{v.title}</h3>
                <p className="about-value-desc">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="about-cta-banner">
        <div className="about-cta-inner">
          <h2 className="about-cta-title">Ready to see your score?</h2>
          <p className="about-cta-sub">
            No sign-up required to get started. See how your resume stacks up in seconds.
          </p>
          <Link to="/signup" className="btn-primary hero-btn-primary" style={{ display: "inline-flex" }}>
            Scan your resume
          </Link>
        </div>
      </div>
    </div>
  );
}
