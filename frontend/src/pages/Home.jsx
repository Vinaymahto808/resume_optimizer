import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useEffect, useRef, useState } from "react";

function Reveal({ children, delay = 0, style: extStyle = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal${visible ? " reveal-visible" : ""}`}
      style={{ ...extStyle, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();

  const tools = [
    {
      icon: "scan",
      title: "ATS Resume Scan",
      desc: "Upload your resume and get a precise 0-100 ATS score with breakdown across formatting, keywords, experience, and compatibility.",
      link: "/scan",
      color: "#4f7dff",
      badge: "Popular",
    },
    {
      icon: "brain",
      title: "Profile Analyzer",
      desc: "Paste your LinkedIn profile for keyword analysis, strength/gap detection, and get an optimized headline & About section.",
      link: "/profile-analyzer",
      color: "#a78bfa",
      badge: "New",
    },
    {
      icon: "briefcase",
      title: "Job Recommender",
      desc: "Find matching jobs from 50+ curated roles. See matched vs missing skills and apply directly.",
      link: "/job-recommender",
      color: "#34d399",
      badge: null,
    },
    {
      icon: "sparkles",
      title: "AI Deep Analysis",
      desc: "Get an expert-level Gemini AI critique of your profile with strengths, gaps, role recommendations, and a rewritten About section.",
      link: "/ai-analysis",
      color: "#f472b6",
      badge: "AI",
    },
    {
      icon: "file",
      title: "Resume Templates",
      desc: "Choose from ATS-optimized LaTeX templates. Fill in your details and download a ready-to-use .tex file.",
      link: "/templates",
      color: "#fbbf24",
      badge: null,
    },
    {
      icon: "wrench",
      title: "LinkedIn Optimizer",
      desc: "Fetch your LinkedIn profile, analyze it for recruiter keywords, and get actionable suggestions to improve your visibility.",
      link: "/profile-analyzer",
      color: "#0a66c2",
      badge: null,
    },
  ];

  return (
    <div>
      <section style={styles.hero}>
        <div style={styles.heroBgGrid} />
        <div style={styles.heroGlow1} />
        <div style={styles.heroGlow2} />
        <Particles />
        <div style={styles.heroInner}>
          <div style={styles.heroLeft}>
            <div style={styles.blinkWrap}>
              <svg style={styles.blinkSvg} width="200" height="200" viewBox="0 0 200 200">
                <defs>
                  <radialGradient id="blinkGrad">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3">
                      <animate attributeName="stopOpacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
                    </stop>
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0">
                      <animate attributeName="stopOpacity" values="0;0.2;0" dur="2s" repeatCount="indefinite" />
                    </stop>
                  </radialGradient>
                </defs>
                <circle cx="100" cy="100" r="80" fill="url(#blinkGrad)">
                  <animate attributeName="r" values="80;100;80" dur="2s" repeatCount="indefinite" />
                </circle>
              </svg>
              <svg style={styles.blinkRing} width="300" height="300" viewBox="0 0 300 300">
                <circle cx="150" cy="150" r="120" fill="none" stroke="#6366F1" strokeWidth="1" opacity="0.15">
                  <animate attributeName="r" values="120;140;120" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.15;0.35;0.15" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="150" cy="150" r="100" fill="none" stroke="#8B5CF6" strokeWidth="0.5" opacity="0.1">
                  <animate attributeName="r" values="100;120;100" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
                  <animate attributeName="opacity" values="0.1;0.25;0.1" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
                </circle>
              </svg>
            </div>
            {user && (
              <div style={styles.userBadge}>
                Signed in as <span style={styles.userEmail}>{user.email}</span>
              </div>
            )}
            <div style={styles.heroBadge}>AI-Powered ATS Optimization</div>
            <h1 style={styles.title}>
              Get Hired Faster with{" "}
              <span style={styles.highlight}>AI-Powered</span> Resume Optimization
            </h1>
            <p style={styles.subtitle}>
              Analyze resumes, optimize LinkedIn profiles, and discover jobs using AI.
            </p>
            <div style={styles.actions}>
              {user ? (
                <Link to="/scan" className="btn-primary" style={styles.primaryBtn}>
                  Scan Your Resume
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn-primary" style={styles.primaryBtn}>
                    Get Started Free
                  </Link>
                  <Link to="/login" className="btn-secondary" style={styles.secondaryBtn}>
                    View Demo
                  </Link>
                </>
              )}
              <Link to="/pricing" className="btn-secondary" style={styles.secondaryBtn}>
                View Plans
              </Link>
            </div>
            <div style={styles.trustRow}>
              <div style={styles.trustItem}>
                <span style={styles.trustIcon}>⭐</span>
                <span style={styles.trustText}><strong>3,000+</strong> Users</span>
              </div>
              <div style={styles.trustDot} />
              <div style={styles.trustItem}>
                <span style={styles.trustIcon}>📊</span>
                <span style={styles.trustText}><strong>95%</strong> ATS Accuracy</span>
              </div>
              <div style={styles.trustDot} />
              <div style={styles.trustItem}>
                <span style={styles.trustIcon}>🏆</span>
                <span style={styles.trustText}><strong>#1</strong> Resume Tool</span>
              </div>
            </div>
          </div>

          <div style={styles.heroRight}>
            <FloatingDashboard />
          </div>
        </div>
      </section>

      <section style={styles.tools}>
        <SectionBg color="#6366F1" />
        <div style={styles.sectionInner}>
          <Reveal>
            <h2 style={styles.sectionTitle}>
              All <span style={styles.highlight}>Tools</span>
            </h2>
            <p style={styles.sectionSub}>
              Everything you need to optimize your resume and LinkedIn profile for recruiters and ATS systems.
            </p>
          </Reveal>
          <div style={styles.toolsGrid}>
            {tools.map((t, i) => (
              <Reveal key={i} delay={i * 80}>
                <Link to={t.link} className="tool-card" data-color={t.color} style={styles.toolCard}>
                  <CardBg name={t.icon} color={t.color} />
                  {t.badge && (
                    <span style={{ ...styles.toolBadge, background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}40` }}>
                      {t.badge}
                    </span>
                  )}
                  <div className="tool-icon" style={styles.toolIcon}><ToolIcon name={t.icon} color={t.color} /></div>
                  <h3 style={styles.toolTitle}>{t.title}</h3>
                  <p style={styles.toolDesc}>{t.desc}</p>
                  <span className="tool-cta" style={{ ...styles.toolCta, color: t.color }}>Open Tool &rarr;</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.cta}>
        <div style={styles.ctaGlow} />
        <SectionBg color="#4f7dff" />
        <Reveal>
          <h2 style={styles.ctaTitle}>Ready to optimize your resume?</h2>
          <p style={styles.ctaSub}>3,000+ job seekers have improved their ATS score. Join them.</p>
          <Link to={user ? "/scan" : "/signup"} className="btn-primary" style={styles.ctaBtn}>
            {user ? "Scan Now" : "Get Started Free"}
          </Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}

function Particles() {
  const dots = Array.from({ length: 30 });
  return (
    <div style={styles.particles}>
      {dots.map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.particle,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 6}s`,
            opacity: 0.2 + Math.random() * 0.3,
          }}
        />
      ))}
    </div>
  );
}

function SectionBg({ color }) {
  return (
    <svg style={styles.sectionBg} width="100%" height="100%" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <circle cx="40" cy="40" r="1.5" fill={color} opacity="0.06" />
      <circle cx="120" cy="40" r="1.5" fill={color} opacity="0.06" />
      <circle cx="200" cy="40" r="1.5" fill={color} opacity="0.06" />
      <circle cx="280" cy="40" r="1.5" fill={color} opacity="0.06" />
      <circle cx="360" cy="40" r="1.5" fill={color} opacity="0.06" />
      <circle cx="40" cy="120" r="1.5" fill={color} opacity="0.06" />
      <circle cx="120" cy="120" r="1.5" fill={color} opacity="0.06" />
      <circle cx="200" cy="120" r="1.5" fill={color} opacity="0.06" />
      <circle cx="280" cy="120" r="1.5" fill={color} opacity="0.06" />
      <circle cx="360" cy="120" r="1.5" fill={color} opacity="0.06" />
      <circle cx="40" cy="200" r="1.5" fill={color} opacity="0.06" />
      <circle cx="120" cy="200" r="1.5" fill={color} opacity="0.06" />
      <circle cx="200" cy="200" r="1.5" fill={color} opacity="0.06" />
      <circle cx="280" cy="200" r="1.5" fill={color} opacity="0.06" />
      <circle cx="360" cy="200" r="1.5" fill={color} opacity="0.06" />
      <circle cx="40" cy="280" r="1.5" fill={color} opacity="0.06" />
      <circle cx="120" cy="280" r="1.5" fill={color} opacity="0.06" />
      <circle cx="200" cy="280" r="1.5" fill={color} opacity="0.06" />
      <circle cx="280" cy="280" r="1.5" fill={color} opacity="0.06" />
      <circle cx="360" cy="280" r="1.5" fill={color} opacity="0.06" />
      <circle cx="40" cy="360" r="1.5" fill={color} opacity="0.06" />
      <circle cx="120" cy="360" r="1.5" fill={color} opacity="0.06" />
      <circle cx="200" cy="360" r="1.5" fill={color} opacity="0.06" />
      <circle cx="280" cy="360" r="1.5" fill={color} opacity="0.06" />
      <circle cx="360" cy="360" r="1.5" fill={color} opacity="0.06" />
      <path d="M0 100H400" stroke={color} strokeWidth="0.5" opacity="0.03" />
      <path d="M0 200H400" stroke={color} strokeWidth="0.5" opacity="0.03" />
      <path d="M0 300H400" stroke={color} strokeWidth="0.5" opacity="0.03" />
      <path d="M100 0V400" stroke={color} strokeWidth="0.5" opacity="0.03" />
      <path d="M200 0V400" stroke={color} strokeWidth="0.5" opacity="0.03" />
      <path d="M300 0V400" stroke={color} strokeWidth="0.5" opacity="0.03" />
    </svg>
  );
}

function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.footerGlow} />
      <div style={styles.footerInner}>
        <div style={styles.footerCol}>
          <div style={styles.footerLogo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span style={styles.footerBrand}>ATSCheck</span>
          </div>
          <p style={styles.footerDesc}>
            AI-powered resume analysis and LinkedIn profile optimization. Land more interviews with data-driven insights.
          </p>
          <div className="footer-social" style={styles.footerSocial}>
            {["GH", "TW", "LI", "MA"].map((s, i) => (
              <span key={i} style={styles.socialCircle}>{s}</span>
            ))}
          </div>
        </div>

        <div style={styles.footerCol}>
          <h4 style={styles.footerHeading}>Product</h4>
          {["ATS Scan", "Profile Analyzer", "Job Recommender", "AI Analysis", "Templates"].map((l) => (
            <Link key={l} to="/scan" style={styles.footerLink}>{l}</Link>
          ))}
        </div>

        <div style={styles.footerCol}>
          <h4 style={styles.footerHeading}>Resources</h4>
          {["Documentation", "API", "Blog", "Changelog", "Status"].map((l) => (
            <span key={l} style={styles.footerLink}>{l}</span>
          ))}
        </div>

        <div style={styles.footerCol}>
          <h4 style={styles.footerHeading}>Company</h4>
          {["About", "Privacy", "Terms", "Contact", "Careers"].map((l) => (
            <span key={l} style={styles.footerLink}>{l}</span>
          ))}
        </div>
      </div>
      <div style={styles.footerDivider} />
      <p style={styles.footerCopy}>&copy; 2026 ATSCheck. All rights reserved.</p>
    </footer>
  );
}

function CardBg({ name, color }) {
  const bg = (name === "scan")
    ? <><path d="M0 40h200M0 80h200M0 120h200M0 160h200" stroke={color} strokeWidth="0.5" opacity="0.06" /><rect x="20" y="20" width="50" height="160" rx="4" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><circle cx="60" cy="45" r="3" fill={color} opacity="0.1" /><circle cx="60" cy="65" r="3" fill={color} opacity="0.1" /><circle cx="60" cy="85" r="3" fill={color} opacity="0.1" /></>
    : (name === "brain")
    ? <><path d="M10 180 Q40 120 70 150 T130 120 T180 140" stroke={color} strokeWidth="1" opacity="0.08" fill="none" /><path d="M20 160 Q60 90 100 130 T160 100 T190 120" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><circle cx="100" cy="30" r="8" fill={color} opacity="0.06" /><circle cx="100" cy="30" r="3" fill={color} opacity="0.08" /></>
    : (name === "briefcase")
    ? <><path d="M10 40 Q40 60 70 40 T130 40 T190 40" stroke={color} strokeWidth="1" opacity="0.07" fill="none" /><path d="M10 80 Q40 100 70 80 T130 80 T190 80" stroke={color} strokeWidth="0.5" opacity="0.05" fill="none" /><circle cx="30" cy="30" r="2" fill={color} opacity="0.08" /><circle cx="170" cy="30" r="2" fill={color} opacity="0.08" /><circle cx="100" cy="150" r="2" fill={color} opacity="0.08" /></>
    : (name === "sparkles")
    ? <><path d="M30 170 L50 130 L90 130 L60 100 L70 60 L100 90 L130 60 L140 100 L170 130 L130 130 L150 170 L120 140 L90 170 Z" fill={color} opacity="0.04" /><circle cx="50" cy="30" r="2" fill={color} opacity="0.1" /><circle cx="150" cy="40" r="2" fill={color} opacity="0.1" /><circle cx="20" cy="100" r="2" fill={color} opacity="0.1" /><circle cx="180" cy="90" r="2" fill={color} opacity="0.1" /></>
    : (name === "file")
    ? <><rect x="40" y="20" width="120" height="160" rx="4" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><line x1="60" y1="60" x2="140" y2="60" stroke={color} strokeWidth="0.5" opacity="0.06" /><line x1="60" y1="90" x2="120" y2="90" stroke={color} strokeWidth="0.5" opacity="0.06" /><line x1="60" y1="120" x2="130" y2="120" stroke={color} strokeWidth="0.5" opacity="0.06" /><circle cx="30" cy="30" r="2" fill={color} opacity="0.08" /><circle cx="170" cy="170" r="2" fill={color} opacity="0.08" /></>
    : /* wrench */ <><circle cx="40" cy="40" r="15" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><circle cx="160" cy="40" r="10" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><circle cx="100" cy="100" r="20" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><circle cx="30" cy="160" r="12" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><circle cx="170" cy="160" r="8" stroke={color} strokeWidth="0.5" opacity="0.06" fill="none" /><line x1="40" y1="55" x2="100" y2="80" stroke={color} strokeWidth="0.5" opacity="0.04" /><line x1="160" y1="50" x2="120" y2="80" stroke={color} strokeWidth="0.5" opacity="0.04" /></>;
  return (
    <svg style={styles.cardBg} width="100%" height="100%" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      {bg}
    </svg>
  );
}

function ToolIcon({ name, color }) {
  const svgProps = { width: 32, height: 32, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    scan: (
      <svg {...svgProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    brain: (
      <svg {...svgProps}>
        <path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4 4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z" />
        <path d="M8 12a4 4 0 0 0-4 4v1a4 4 0 0 0 4 4" />
        <path d="M16 12a4 4 0 0 1 4 4v1a4 4 0 0 1-4 4" />
        <line x1="12" y1="10" x2="12" y2="14" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
    briefcase: (
      <svg {...svgProps}>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="12" y1="9" x2="12" y2="15" />
      </svg>
    ),
    sparkles: (
      <svg {...svgProps}>
        <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
        <path d="M18 16l.75 2.25L21 19l-2.25.75L18 22l-.75-2.25L15 19l2.25-.75z" />
        <path d="M6 16l.75 2.25L9 19l-2.25.75L6 22l-.75-2.25L3 19l2.25-.75z" />
      </svg>
    ),
    file: (
      <svg {...svgProps}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <rect x="8" y="13" width="8" height="2" rx="1" />
        <rect x="8" y="17" width="5" height="2" rx="1" />
      </svg>
    ),
    wrench: (
      <svg {...svgProps}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  };
  return icons[name] || null;
}

function FloatingDashboard() {
  return (
    <div style={styles.dashWrap}>
      <div className="dash-card" style={{ ...styles.dashCard, ...styles.scoreCard }}>
        <div style={styles.scoreRing}>
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle cx="55" cy="55" r="48" fill="none" stroke="url(#scoreGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(92 / 100) * 301.6} 301.6`} transform="rotate(-90 55 55)" />
            <defs>
              <linearGradient id="scoreGrad">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          <div style={styles.scoreInner}>
            <span style={styles.scoreNum}>92</span>
            <span style={styles.scoreOutOf}>/100</span>
          </div>
        </div>
        <p style={styles.scoreLabel}>ATS Score</p>
      </div>

      <div className="dash-card" style={{ ...styles.dashCard, ...styles.matchCard }}>
        <p style={styles.matchLabel}>Match Rate</p>
        <div style={styles.matchBarWrap}>
          <div style={styles.matchBar}>
            <div style={{ ...styles.matchFill, width: "87%" }} />
          </div>
          <span style={styles.matchPct}>87%</span>
        </div>
      </div>

      <div className="dash-card" style={{ ...styles.dashCard, ...styles.skillsCard }}>
        <p style={styles.smallLabel}>Skills Detected</p>
        <div style={styles.skillRow}>
          {["React", "Python", "Node.js", "Java", "ML"].map((s) => (
            <span key={s} style={styles.skillTag}>{s}</span>
          ))}
        </div>
      </div>

      <div className="dash-card" style={{ ...styles.dashCard, ...styles.missingCard }}>
        <p style={styles.smallLabel}>Missing Keywords</p>
        <div style={styles.missingRow}>
          {["Docker", "AWS", "Kubernetes"].map((s) => (
            <span key={s} style={styles.missingTag}>{s}</span>
          ))}
        </div>
      </div>

      <div className="dash-card" style={{ ...styles.dashCard, ...styles.aiCard }}>
        <div style={styles.aiHeader}>
          <span style={styles.aiIcon}>✨</span>
          <span style={styles.aiTitle}>AI Suggestions</span>
        </div>
        <div style={styles.aiList}>
          <div style={styles.aiItem}><span style={styles.aiBullet}>•</span> Add quantified achievements</div>
          <div style={styles.aiItem}><span style={styles.aiBullet}>•</span> Include cloud technologies</div>
          <div style={styles.aiItem}><span style={styles.aiBullet}>•</span> Improve keyword density</div>
        </div>
      </div>

      <div className="dash-card" style={{ ...styles.dashCard, ...styles.jobsCard }}>
        <p style={styles.smallLabel}>Top Matches</p>
        {[
          { company: "Google", role: "SWE Intern", match: "94%" },
          { company: "Amazon", role: "SDE Intern", match: "88%" },
          { company: "Microsoft", role: "Software Engineer", match: "85%" },
        ].map((j, i) => (
          <div key={i} style={styles.jobRow}>
            <div style={styles.jobInfo}>
              <span style={styles.jobCompany}>{j.company}</span>
              <span style={styles.jobRole}>{j.role}</span>
            </div>
            <span style={styles.jobMatch}>{j.match}</span>
          </div>
        ))}
      </div>

      <div className="dash-card" style={{ ...styles.dashCard, ...styles.chartCard }}>
        <p style={styles.smallLabel}>ATS Score Trend</p>
        <svg width="100%" height="40" viewBox="0 0 200 40">
          <defs>
            <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 32 Q20 28 40 30 T80 24 T110 18 T140 14 T170 8 T200 6" fill="none" stroke="#6366F1" strokeWidth="2" />
          <path d="M0 32 Q20 28 40 30 T80 24 T110 18 T140 14 T170 8 T200 6 L200 40 L0 40 Z" fill="url(#chartGrad2)" />
        </svg>
      </div>
    </div>
  );
}

const styles = {
  hero: {
    position: "relative",
    minHeight: "90vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    background: "#030712",
  },
  heroBgGrid: {
    position: "absolute", inset: 0,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  heroGlow1: {
    position: "absolute", top: "10%", left: "15%",
    width: 500, height: 500,
    background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  heroGlow2: {
    position: "absolute", bottom: "10%", right: "10%",
    width: 400, height: 400,
    background: "radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 60%)",
    pointerEvents: "none",
  },
  particles: {
    position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
  },
  particle: {
    position: "absolute",
    borderRadius: "50%",
    background: "#6366F1",
    animation: "float 8s ease-in-out infinite",
  },
  heroInner: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 60,
    maxWidth: 1200,
    width: "100%",
    padding: "0 24px",
    alignItems: "center",
  },
  heroLeft: { position: "relative", zIndex: 1 },
  userBadge: {
    display: "inline-block",
    background: "rgba(74,222,128,0.1)",
    color: "var(--success)",
    padding: "6px 18px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 12,
    border: "1px solid rgba(74,222,128,0.2)",
  },
  userEmail: { fontWeight: 700 },
  heroBadge: {
    display: "inline-block",
    background: "rgba(99,102,241,0.12)",
    color: "#818cf8",
    padding: "6px 18px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 20,
    border: "1px solid rgba(99,102,241,0.25)",
    letterSpacing: "0.02em",
  },
  title: {
    fontSize: 48,
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: 20,
    letterSpacing: "-0.03em",
  },
  highlight: {
    background: "linear-gradient(135deg, #6366F1, #8B5CF6, #a78bfa)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: 17,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.7,
    marginBottom: 32,
    maxWidth: 500,
  },
  actions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  primaryBtn: { fontSize: 15, padding: "14px 32px" },
  secondaryBtn: { fontSize: 15, padding: "14px 32px" },
  trustRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginTop: 36,
    flexWrap: "wrap",
  },
  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  trustIcon: { fontSize: 15 },
  trustText: { fontSize: 13, color: "rgba(255,255,255,0.5)" },
  trustDot: {
    width: 4, height: 4, borderRadius: "50%",
    background: "rgba(255,255,255,0.15)",
  },

  /* Right Side Dashboard */
  heroRight: { position: "relative" },
  blinkWrap: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 0, width: 400, height: 400 },
  blinkSvg: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 400 },
  blinkRing: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500 },
  dashWrap: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gridAutoRows: "auto",
    gap: 8,
  },
  dashCard: {
    background: "rgba(255,255,255,0.04)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
  },

  /* Score circle */
  scoreCard: {
    gridColumn: "1 / 2",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 16px",
  },
  /* Score + Match on same row, other cards stack cleanly */
  scoreRing: { position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" },
  scoreInner: { position: "absolute", display: "flex", alignItems: "baseline", gap: 1 },
  scoreNum: { fontSize: 30, fontWeight: 800, color: "#fff" },
  scoreOutOf: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 },
  scoreLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" },

  /* Match rate */
  matchCard: { gridColumn: "2 / 3" },
  matchLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" },
  matchBarWrap: { display: "flex", alignItems: "center", gap: 10 },
  matchBar: { flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" },
  matchFill: { height: "100%", background: "linear-gradient(90deg, #6366F1, #8B5CF6)", borderRadius: 3 },
  matchPct: { fontSize: 16, fontWeight: 700, color: "#818cf8" },

  /* Skills */
  skillsCard: {},
  smallLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" },
  skillRow: { display: "flex", flexWrap: "wrap", gap: 4 },
  skillTag: {
    background: "rgba(99,102,241,0.12)", color: "#818cf8", padding: "3px 8px",
    borderRadius: 6, fontSize: 10, fontWeight: 600, border: "1px solid rgba(99,102,241,0.2)",
  },

  /* Missing keywords */
  missingCard: {},
  missingRow: { display: "flex", flexWrap: "wrap", gap: 4 },
  missingTag: {
    background: "rgba(248,113,113,0.1)", color: "#f87171", padding: "3px 8px",
    borderRadius: 6, fontSize: 10, fontWeight: 600, border: "1px solid rgba(248,113,113,0.2)",
  },

  /* AI Suggestions */
  aiCard: { gridColumn: "1 / 3" },
  aiHeader: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
  aiIcon: { fontSize: 13 },
  aiTitle: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" },
  aiList: { display: "flex", flexDirection: "column", gap: 4 },
  aiItem: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 },
  aiBullet: { color: "#818cf8", marginRight: 4 },

  /* Job matches */
  jobsCard: { gridColumn: "1 / 3" },
  jobRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  jobInfo: { display: "flex", flexDirection: "column", gap: 1 },
  jobCompany: { fontSize: 12, fontWeight: 600 },
  jobRole: { fontSize: 10, color: "rgba(255,255,255,0.4)" },
  jobMatch: { fontSize: 13, fontWeight: 700, color: "#4ade80" },

  /* Mini chart */
  chartCard: { gridColumn: "1 / 3", padding: "12px 16px" },

  /* Tools Section */
  tools: { position: "relative", padding: "80px 24px 100px" },
  sectionInner: { maxWidth: 1100, margin: "0 auto" },
  sectionTitle: { textAlign: "center", fontSize: 36, fontWeight: 700, marginBottom: 12 },
  sectionSub: { textAlign: "center", color: "var(--text-secondary)", fontSize: 16, maxWidth: 600, margin: "0 auto 60px", lineHeight: 1.6 },
  toolsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 },
  toolCard: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 28, textDecoration: "none",
    color: "inherit", position: "relative",
    transition: "border-color 0.2s, transform 0.2s", display: "flex", flexDirection: "column",
  },
  toolBadge: {
    position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700,
    padding: "3px 10px", borderRadius: 12, letterSpacing: "0.02em",
  },
  toolIcon: { fontSize: 36, marginBottom: 14, position: "relative", zIndex: 1 },
  cardBg: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.6, zIndex: 0 },
  toolTitle: { fontSize: 17, fontWeight: 600, marginBottom: 8, position: "relative", zIndex: 1 },
  toolDesc: { fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, flex: 1, marginBottom: 16, position: "relative", zIndex: 1 },
  toolCta: { fontSize: 13, fontWeight: 700, position: "relative", zIndex: 1 },

  /* CTA Section */
  cta: { position: "relative", textAlign: "center", padding: "100px 24px", overflow: "hidden" },
  ctaGlow: {
    position: "absolute", top: "50%", left: "50%", width: 500, height: 500,
    background: "radial-gradient(circle, rgba(79,125,255,0.1) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)", pointerEvents: "none",
  },
  ctaTitle: { position: "relative", fontSize: 36, fontWeight: 700, marginBottom: 12 },
  ctaSub: { position: "relative", color: "var(--text-secondary)", fontSize: 16, marginBottom: 28 },
  ctaBtn: { position: "relative", fontSize: 16, padding: "14px 36px" },
  sectionBg: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.5, zIndex: 0 },

  /* Footer */
  footer: { position: "relative", background: "#05050f", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "60px 24px 30px", overflow: "hidden", marginTop: 40 },
  footerGlow: {
    position: "absolute", bottom: 0, left: "50%", width: 500, height: 300,
    background: "radial-gradient(ellipse, rgba(99,102,241,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, 0)", pointerEvents: "none",
  },
  footerInner: { maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 40, position: "relative", zIndex: 1 },
  footerCol: { display: "flex", flexDirection: "column", gap: 10 },
  footerLogo: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  footerBrand: { fontSize: 18, fontWeight: 700, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  footerDesc: { fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 280 },
  footerSocial: { display: "flex", gap: 8, marginTop: 8 },
  socialCircle: {
    width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.05)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)",
    border: "1px solid rgba(255,255,255,0.06)", cursor: "default",
  },
  footerHeading: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 },
  footerLink: { fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "color 0.2s" },
  footerDivider: { maxWidth: 1100, margin: "30px auto 20px", height: 1, background: "rgba(255,255,255,0.04)", position: "relative", zIndex: 1 },
  footerCopy: { textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)", position: "relative", zIndex: 1 },
};
