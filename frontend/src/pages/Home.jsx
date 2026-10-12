import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRef, useEffect, useCallback } from "react";
import SEO from "../components/SEO";
import { HeroScene3D } from "../components/landing/Mocks";
import { EmployersBand, FeatureShowcase, JobSearchBar, StatsHub, ToolsGrid } from "../components/landing/CopilotSections";
import { Reveal } from "../components/fx/fx";
import { Faq, FinalCta, ResumeToolkit, Testimonials } from "../components/landing/LowerSections";

const faqs = [
  { q: "What does ProfileOptimizer actually do for me?", a: "It finds jobs that fit your resume, rewrites your resume for each one, fills in application forms with one click, points out people who can refer you and coaches you through interviews and offers. You stay in charge of every application." },
  { q: "Where do the jobs come from?", a: "Directly from company hiring pages (Greenhouse, Lever and Ashby boards) and public job feeds. We remove duplicates, screen out suspicious postings and refresh the feed several times a day." },
  { q: "Do I have to pay?", a: "No. The Free plan covers job matching, the swipe feed, basic tracking, one job alert and 2 AI credits a day, with no card needed. Turbo removes the limits and adds referral leads and more alerts." },
  { q: "Can it apply to jobs on its own?", a: "It prepares everything, including the tailored resume, cover letter and form answers, but you press submit. Nothing is sent in your name without your approval." },
  { q: "What happens to my data?", a: "Your resume and profile are only used to match you and prepare your applications. We don't sell your data, and employers can only see you if you choose to be visible." },
  { q: "How do I check my resume score?", a: "Upload your resume and we run 19 checks across 5 categories. Your score reflects parse success rate and quality issues found — typos, weak content, missing keywords." },
  { q: "How do I improve my resume score?", a: "Rewrite experience with quantifiable achievements, include relevant skills, use a clean PDF format, and fix grammar errors. Aim for active voice throughout." },
  { q: "What is a good ATS score?", a: "Above 80 is strong. But a score is just one metric — key sections like contact info and experience should be flawless." },
];

const portalList = [
  // Job portals — existing 9
  { name: "LinkedIn", color: "#0a66c2" },
  { name: "Indeed", color: "#0065b3" },
  { name: "Glassdoor", color: "#0ea15b" },
  { name: "Naukri.com", color: "#e84a5f" },
  { name: "Wellfound", color: "#1a1a1a" },
  { name: "ZipRecruiter", color: "#228be6" },
  { name: "Dice", color: "#ff6700" },
  { name: "CutShort", color: "#6c2bd9" },
  { name: "Monster", color: "#6a1b9a" },
  // Job portals — new global (10)
  { name: "SimplyHired", color: "#4285F4" },
  { name: "CareerBuilder", color: "#0073AA" },
  { name: "Hired", color: "#0A0A0A" },
  { name: "Remotive", color: "#16A34A" },
  { name: "We Work Remotely", color: "#1E3A5F" },
  { name: "Remote.co", color: "#7C3AED" },
  { name: "AngelList Jobs", color: "#1A1A1A" },
  { name: "Otta", color: "#FF5A1F" },
  { name: "Greenhouse", color: "#3AAB6D" },
  { name: "Lever", color: "#2D6CDF" },
  // Job portals — new India-specific (6)
  { name: "Shine.com", color: "#FF6B00" },
  { name: "TimesJobs", color: "#E63946" },
  { name: "Freshersworld", color: "#F59E0B" },
  { name: "Instahyre", color: "#6366F1" },
  { name: "Hirist", color: "#0EA5E9" },
  { name: "iimjobs", color: "#BE185D" },
];

function StarRating() {
  return (
    <div className="hero-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="hero-stars-label">4.5 · 3,000+ scans</span>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const sectionRefs = useRef([]);
  const addSectionRef = useCallback((el) => { if (el && !sectionRefs.current.includes(el)) sectionRefs.current.push(el); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } });
    }, { threshold: 0.08 });
    sectionRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, []);

  const ctaTo = user ? "/jobs" : "/signup?next=%2Fjobs";
  const ctaLabel = user ? "Open my job feed" : "Start free";

  return (
    <div className="landing">
      <SEO
        title="ProfileOptimizer: AI Job Matching, Resume Tailoring & One-Click Apply"
        description="Fit-ranked jobs, a resume tailored to every role, one-click applications, referral leads and Sage, an always-on AI career coach. Plus a free ATS resume checker."
        canonical="https://www.profileotimizer.online/"
        ogTitle="ATS Resume Checker — Free Resume Score & Analysis"
        ogDescription="Scan your resume against 27 ATS checkpoints. Get a detailed score, keyword analysis, and actionable suggestions to beat applicant tracking systems."
      />

      {/* ─── SECTION 1: HERO ─── */}
      <section ref={addSectionRef} className="scroll-fade hero-refined" style={{ position: "relative" }}>
        <div className="hero-dot-grid-bg" />
        <div className="hero-orb hero-orb--1" style={{ opacity: 0.1 }} />
        <div className="hero-orb hero-orb--2" style={{ opacity: 0.1 }} />
        <div className="hero-bg-pattern" aria-hidden="true">
          <svg className="grid-left" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-l" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#4F46E5" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="300" height="300" fill="url(#grid-l)" />
          </svg>
          <svg className="grid-right" viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-r" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#10B981" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="250" height="250" fill="url(#grid-r)" />
          </svg>
        </div>

        <div className="hero-bg-illustration" aria-hidden="true">
          <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hi-g1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="hi-g2" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.025" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="hi-g3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 600 Q180 500 360 550 Q540 600 720 480 Q900 360 1080 420 Q1260 480 1440 380 L1440 800 L0 800 Z" fill="url(#hi-g1)" />
            <path d="M0 700 Q240 580 480 620 Q720 660 960 540 Q1200 420 1440 480 L1440 800 L0 800 Z" fill="url(#hi-g2)" />
            <ellipse cx="160" cy="200" rx="280" ry="280" fill="url(#hi-g3)" />
            <ellipse cx="1280" cy="300" rx="200" ry="200" fill="url(#hi-g3)" />
            <circle cx="120" cy="180" r="6" fill="#4F46E5" opacity="0.06" />
            <circle cx="280" cy="120" r="3" fill="#10B981" opacity="0.08" />
            <circle cx="1100" cy="160" r="5" fill="#4F46E5" opacity="0.06" />
            <circle cx="1320" cy="240" r="4" fill="#10B981" opacity="0.07" />
            <circle cx="720" cy="100" r="8" fill="#4F46E5" opacity="0.04" />
            <circle cx="860" cy="180" r="3" fill="#10B981" opacity="0.06" />
            <circle cx="400" cy="260" r="4" fill="#4F46E5" opacity="0.05" />
            <circle cx="580" cy="140" r="2" fill="#10B981" opacity="0.08" />
          </svg>
        </div>

        <div className="pdf-float pdf-float--1" aria-hidden="true">
          <svg width="100" height="133" viewBox="0 0 180 240" fill="none">
            <defs>
              <linearGradient id="pdf1-g-i" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id="pdf1-g-e" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
            <rect width="180" height="240" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
            <path d="M 0,4 Q 90,-4 180,4 L 180,24 L 0,24 Z" fill="url(#pdf1-g-i)" opacity="0.06" />
            <rect x="16" y="34" width="50" height="5" rx="2.5" fill="url(#pdf1-g-i)" opacity="0.6" />
            <rect x="16" y="44" width="80" height="2" rx="1" fill="#94A3B8" opacity="0.3" />
            <rect x="16" y="50" width="60" height="2" rx="1" fill="#94A3B8" opacity="0.2" />
            <rect x="16" y="62" width="148" height="1" rx="0.5" fill="#E2E8F0" />
            <rect x="16" y="72" width="90" height="2" rx="1" fill="#94A3B8" opacity="0.3" />
            <rect x="16" y="78" width="148" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <rect x="16" y="84" width="120" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <rect x="16" y="98" width="90" height="2" rx="1" fill="#94A3B8" opacity="0.3" />
            <rect x="16" y="104" width="148" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <rect x="16" y="110" width="100" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <circle cx="152" cy="38" r="16" fill="url(#pdf1-g-e)" opacity="0.08" />
            <circle cx="152" cy="38" r="8" fill="url(#pdf1-g-e)" opacity="0.12" />
          </svg>
        </div>
        <div className="pdf-float pdf-float--2" aria-hidden="true">
          <svg width="85" height="113" viewBox="0 0 180 240" fill="none">
            <defs>
              <linearGradient id="pdf2-g-i" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
            </defs>
            <rect width="180" height="240" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
            <rect x="0" y="0" width="48" height="240" fill="url(#pdf2-g-i)" opacity="0.04" />
            <rect x="8" y="16" width="32" height="32" rx="16" fill="url(#pdf2-g-i)" opacity="0.12" />
            <rect x="14" y="24" width="20" height="16" rx="4" fill="url(#pdf2-g-i)" opacity="0.25" />
            <rect x="10" y="58" width="28" height="2" rx="1" fill="#94A3B8" opacity="0.2" />
            <rect x="10" y="64" width="22" height="2" rx="1" fill="#94A3B8" opacity="0.15" />
            <rect x="10" y="74" width="28" height="2" rx="1" fill="#94A3B8" opacity="0.2" />
            <rect x="60" y="14" width="60" height="5" rx="2.5" fill="url(#pdf2-g-i)" opacity="0.6" />
            <rect x="60" y="24" width="90" height="2" rx="1" fill="#94A3B8" opacity="0.3" />
            <rect x="60" y="30" width="70" height="2" rx="1" fill="#94A3B8" opacity="0.2" />
            <rect x="60" y="44" width="110" height="1" rx="0.5" fill="#E2E8F0" />
            <rect x="60" y="52" width="50" height="2" rx="1" fill="#94A3B8" opacity="0.3" />
            <rect x="60" y="58" width="110" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <rect x="60" y="64" width="90" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <rect x="10" y="84" width="28" height="2" rx="1" fill="#94A3B8" opacity="0.2" />
            <rect x="60" y="84" width="50" height="2" rx="1" fill="#94A3B8" opacity="0.3" />
            <rect x="60" y="90" width="110" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
          </svg>
        </div>
        <div className="pdf-float pdf-float--3" aria-hidden="true">
          <svg width="70" height="93" viewBox="0 0 180 240" fill="none">
            <defs>
              <linearGradient id="pdf3-g-i" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id="pdf3-g-e" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
            <rect width="180" height="240" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.5" />
            <rect x="0" y="0" width="180" height="44" fill="url(#pdf3-g-e)" opacity="0.04" />
            <rect x="14" y="12" width="40" height="5" rx="2.5" fill="url(#pdf3-g-i)" opacity="0.6" />
            <rect x="14" y="22" width="80" height="2" rx="1" fill="#94A3B8" opacity="0.3" />
            <rect x="14" y="28" width="50" height="2" rx="1" fill="#94A3B8" opacity="0.2" />
            <rect x="14" y="52" width="60" height="3" rx="1.5" fill="#F59E0B" opacity="0.3" />
            <rect x="14" y="60" width="148" height="1" rx="0.5" fill="#E2E8F0" />
            <rect x="14" y="66" width="148" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <rect x="14" y="72" width="100" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <rect x="14" y="86" width="60" height="3" rx="1.5" fill="#F59E0B" opacity="0.3" />
            <rect x="14" y="94" width="148" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
            <rect x="14" y="100" width="110" height="2" rx="1" fill="#94A3B8" opacity="0.1" />
          </svg>
        </div>

        <div className="hero-inner">
          {/* LEFT COLUMN — Content */}
          <div className="hero-content">
            <div className="hero-announcement">
              <span className="hero-announcement-dot" />
              New: AI that applies with you
              <Link to="/features" style={{ color: "#4F46E5", fontWeight: 700, marginLeft: 4, textDecoration: "none" }}>→ See all features</Link>
            </div>

            <h1 className="hero-title-xl">
              <span className="hero-title-main">Apply smarter, not harder.</span>
              <span className="hero-title-gradient--new">Let AI find, tailor and apply.</span>
            </h1>

            <p className="hero-sub" style={{ fontSize: 18, maxWidth: 480, marginBottom: 36 }}>
              ProfileOptimizer ranks fresh jobs against your resume, rewrites it for each role, fills applications in one click and shows you who can refer you.
            </p>

            <div className="hero-actions">
              <Link to={ctaTo} className="btn-primary hero-btn-primary shimmer-btn" style={{ position: "relative", zIndex: 0, fontSize: 16, padding: "15px 32px", borderRadius: 12 }}>
                {ctaLabel} →
              </Link>
              <Link to="/scan" className="hero-btn-secondary" style={{ fontSize: 16, padding: "15px 28px", borderRadius: 12, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text)", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                Score my resume
              </Link>
            </div>

            <div className="hero-trust-row">
              <span>🔒 End-to-end encrypted</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>⚡ Results in 30 seconds</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>✓ No credit card required</span>
            </div>

            <div className="hero-social-proof-row">
              <StarRating />
              <span className="hero-social-proof-text">Trusted by 3,000+ job seekers</span>
            </div>
          </div>

          {/* RIGHT COLUMN — Visual */}
          <div className="hero-visual">
            <HeroScene3D />
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #4F46E5, transparent)", pointerEvents: "none" }} />
      </section>

      {/* ─── JOB SEARCH ─── */}
      <section className="jr-section" style={{ paddingTop: 8, paddingBottom: 32 }}>
        <Reveal className="jr-wrap">
          <JobSearchBar />
        </Reveal>
      </section>

      {/* ─── SECTION 2: LOGO/BRAND MARQUEE ─── */}
      <div ref={addSectionRef} className="scroll-fade marquee-strip" style={{ position: "relative" }}>
        <div className="section-bg-svg" aria-hidden="true">
          <svg className="section-bg-svg__grid section-bg-svg__grid--l" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s2" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#4F46E5" strokeWidth="0.5" /></pattern></defs>
            <rect width="300" height="300" fill="url(#g-s2)" />
          </svg>
          <svg className="section-bg-svg__grid section-bg-svg__grid--r" viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s2r" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#10B981" strokeWidth="0.5" /></pattern></defs>
            <rect width="250" height="250" fill="url(#g-s2r)" />
          </svg>
        </div>
        <div className="marquee-inner">
          <span className="marquee-label">Matches jobs from 25 portals</span>
          <div className="marquee-track">
            <div className="marquee-track-inner">
              {[...portalList, ...portalList].map((p, i) => (
                <span key={i} className="marquee-chip" style={{ color: p.color, background: `${p.color}0c`, borderColor: `${p.color}18` }}>
                  <span className="marquee-chip-dot" style={{ background: p.color }} />
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── COPILOT: live job hub, feature showcase, tools, employers ─── */}
      <StatsHub />
      <FeatureShowcase />
      <ToolsGrid />
      <EmployersBand />

      {/* ─── RESUME TOOLKIT, STORIES, FAQ, CLOSING CTA ─── */}
      <ResumeToolkit />
      <Testimonials />
      <Faq items={faqs} />
      <FinalCta />

    </div>
  );
}
