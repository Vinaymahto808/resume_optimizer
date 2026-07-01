import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState, useRef, useEffect, useCallback } from "react";

const checklistItems = [
  { cat: "Content", label: "ATS parse rate" },
  { cat: "Content", label: "Repetition of words & phrases" },
  { cat: "Content", label: "Spelling & grammar" },
  { cat: "Content", label: "Quantifying impact in experience" },
  { cat: "Content", label: "Generate tailored title" },
  { cat: "Content", label: "Action verbs" },
  { cat: "Format", label: "File format & size" },
  { cat: "Format", label: "Resume length" },
  { cat: "Format", label: "Bullet point length" },
  { cat: "Skills", label: "Hard skills" },
  { cat: "Skills", label: "Soft skills" },
  { cat: "Sections", label: "Contact information" },
  { cat: "Sections", label: "Essential sections" },
  { cat: "Sections", label: "Personality showcase" },
  { cat: "Style", label: "Resume design" },
  { cat: "Style", label: "Email address usage" },
  { cat: "Style", label: "Active voice" },
  { cat: "Style", label: "Buzzwords & clichés" },
  { cat: "Style", label: "Hyperlinks compliance" },
];

const testimonials = [
  { name: "Jenica", role: "Solutions Engineer", text: "ProfileOptimizer has changed my life: One week & four interviews later, I will be making 150% more doing the job I chose.", metric: "150% more" },
  { name: "David K.", role: "Product Manager", text: "The AI suggestions improved my bullet points immensely. My resume scored 94 and I got 3 callbacks within a week.", metric: "3 callbacks" },
  { name: "Priya R.", role: "Data Analyst", text: "I had no idea my resume was being filtered out by ATS. After optimizing with this tool, I'm finally getting responses.", metric: "finally getting responses" },
];

const initials = ["JC", "DK", "PR"];
const avatarColors = ["rgba(79, 70, 229, 0.10)", "rgba(16, 185, 129, 0.10)", "rgba(245, 158, 11, 0.10)"];
const avatarTextColors = ["#4F46E5", "#10B981", "#F59E0B"];

const faqs = [
  { q: "What is a resume checker?", a: "Evaluates your resume for ATS formatting, keyword relevance, grammar, and content quality. We assess consistency, suggest improvements, and help meet professional standards." },
  { q: "How do I check my resume score?", a: "Upload your resume and we run 19 checks across 5 categories. Your score reflects parse success rate and quality issues found — typos, weak content, missing keywords." },
  { q: "How do I improve my resume score?", a: "Rewrite experience with quantifiable achievements, include relevant skills, use a clean PDF format, and fix grammar errors. Aim for active voice throughout." },
  { q: "How do I know my resume is ATS compliant?", a: "Use relevant keywords naturally, keep simple formatting with clear headings, use PDF format, include a distinct skills section, and maintain consistent work history." },
  { q: "What is a good ATS score?", a: "Above 80 is strong. But a score is just one metric — key sections like contact info and experience should be flawless." },
  { q: "Can an ATS read PDFs?", a: "Yes. PDFs score higher in ATS tests since they preserve formatting. Using our resume builder ensures formatting stays intact across all systems." },
];

const categoryData = [
  { name: "Content", color: "#4F46E5", pct: 83, checks: 6, icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8", gradient: "linear-gradient(135deg, #4F46E5, #6366F1)" },
  { name: "Format", color: "#10B981", pct: 67, checks: 3, icon: "M4 6h16 M4 12h16 M4 18h16", gradient: "linear-gradient(135deg, #10B981, #34D399)" },
  { name: "Skills", color: "#4F46E5", pct: 50, checks: 2, icon: "M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4 M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4", gradient: "linear-gradient(135deg, #4F46E5, #818CF8)" },
  { name: "Sections", color: "#10B981", pct: 100, checks: 3, icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M8 2h8v4H8z", gradient: "linear-gradient(135deg, #10B981, #6EE7B7)" },
  { name: "Style", color: "#F59E0B", pct: 60, checks: 5, icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z", gradient: "linear-gradient(135deg, #F59E0B, #FBBF24)" },
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

const internshipPortalList = [
  { name: "Internshala", color: "#0077FF" },
  { name: "LetsIntern", color: "#FF6B35" },
  { name: "HelloIntern", color: "#10B981" },
  { name: "Internship.in", color: "#6366F1" },
  { name: "Twenty19", color: "#F59E0B" },
  { name: "Chegg Internships", color: "#FF5A00" },
  { name: "WayUp", color: "#5B4FCF" },
  { name: "Handshake", color: "#E63F3F" },
  { name: "AfterCollege", color: "#0369A1" },
];

const jobsData = [
  { title: "Data Scientist", company: "Johnson & Johnson", portal: "LinkedIn", location: "Mumbai", skills: ["Python", "ML", "NLP", "SQL"], match: 92 },
  { title: "ML Engineer — NLP", company: "Google", portal: "LinkedIn", location: "Bengaluru", skills: ["Python", "NLP", "PyTorch", "Transformers"], match: 85 },
  { title: "Data Analyst", company: "Flipkart", portal: "LinkedIn", location: "Bengaluru", skills: ["SQL", "Python", "Data Viz", "A/B Testing"], match: 78 },
  { title: "MLOps Engineer", company: "Razorpay", portal: "Indeed", location: "Bengaluru", skills: ["Docker", "K8s", "GCP", "CI/CD"], match: 72 },
  { title: "CV Engineer", company: "Mahindra", portal: "LinkedIn", location: "Chennai", skills: ["Python", "CV", "PyTorch", "MLOps"], match: 68 },
  { title: "BI & Analytics Lead", company: "Walmart", portal: "Monster", location: "Bengaluru", skills: ["SQL", "Python", "Tableau", "Forecasting"], match: 65 },
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

function FaqItem({ q, a, idx }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "faq-item--open" : ""}`}>
      <button className="faq-trigger" onClick={() => setOpen(!open)} type="button" aria-expanded={open}>
        <span className="faq-number">{String(idx + 1).padStart(2, "0")}</span>
        <span className="faq-trigger-text">{q}</span>
        <span className={`faq-toggle ${open ? "open" : ""}`}>+</span>
      </button>
      <div className="faq-answer">{a}</div>
    </div>
  );
}

function JobCard({ job }) {
  const matchColor = (pct) => pct >= 85 ? "#4F46E5" : pct >= 72 ? "#F59E0B" : "#EF4444";
  const matchBg = (pct) => pct >= 85 ? "rgba(79,70,229,0.10)" : pct >= 72 ? "rgba(245,158,11,0.10)" : "rgba(239,68,68,0.10)";
  const mColor = matchColor(job.match);
  const mBg = matchBg(job.match);
  const visibleSkills = job.skills.slice(0, 3);
  const extra = job.skills.length - 3;

  return (
    <div className="job-card" style={{ borderLeft: `3px solid ${mColor}`, borderRadius: "0 var(--radius) var(--radius) 0" }}>
      <div className="job-card-top">
        <div className="job-card-company">
          <div className="job-card-icon">{job.company[0]}</div>
          <div>
            <div className="job-card-company-name">{job.company}</div>
            <div className="job-card-portal">{job.portal}</div>
          </div>
        </div>
        <div className="job-card-match" style={{ color: mColor, background: mBg }}>{job.match}%</div>
      </div>
      <h3 className="job-card-title">{job.title}</h3>
      <div className="job-card-skills">
        {visibleSkills.map((sk, j) => (
          <span key={j} className="job-card-skill">{sk}</span>
        ))}
        {extra > 0 && <span className="job-card-skill-more">+{extra} more</span>}
      </div>
      <div className="job-card-footer">
        <span className="job-card-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {job.location}
        </span>
        <Link to="/job-recommender" className="job-card-apply" style={{ color: mColor }}>Apply →</Link>
      </div>
    </div>
  );
}

function CheckCard({ cat, items }) {
  const status = cat.pct >= 80 ? "Good" : cat.pct >= 50 ? "Fair" : "Needs Work";
  const statusColors = cat.pct >= 80
    ? { text: "var(--success)", bg: "var(--success-soft)" }
    : cat.pct >= 50
    ? { text: "var(--warning)", bg: "var(--warning-soft)" }
    : { text: "var(--danger)", bg: "var(--danger-soft)" };

  return (
    <div className="audit-card" style={{ "--audit-color": cat.color }}>
      <div className="audit-card-accent" style={{ background: cat.gradient }} />
      <svg className="audit-card-bg" width="200" height="200" viewBox="0 0 200 200" fill="none" aria-hidden="true">
        <circle cx="160" cy="40" r="80" stroke={cat.color} strokeWidth="0.5" opacity="0.06" />
        <circle cx="180" cy="60" r="50" stroke={cat.color} strokeWidth="0.5" opacity="0.04" />
      </svg>

      <div className="audit-card-header">
        <div className="audit-card-icon" style={{ color: cat.color, background: `${cat.color}12` }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={cat.icon} />
          </svg>
        </div>
        <div className="audit-card-info">
          <span className="audit-card-name">{cat.name}</span>
          <span className="audit-card-count">{cat.checks} checks</span>
        </div>
        <div className="audit-card-pct" style={{ color: cat.color }}>{cat.pct}%</div>
      </div>

      <div className="audit-card-bar-wrap">
        <div className="audit-card-bar">
          <div className="audit-card-bar-fill" style={{ width: `${cat.pct}%`, background: cat.gradient }} />
        </div>
        <span className="audit-card-status" style={{ color: statusColors.text, background: statusColors.bg }}>{status}</span>
      </div>

      <ul className="audit-card-list">
        {items.map((item, i) => (
          <li key={i}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const pdfVariants = [
  { id: "classic", label: "Classic", badge: "ATS 92", badgeColor: "#4F46E5" },
  { id: "modern", label: "Modern", badge: "ATS 88", badgeColor: "#10B981" },
  { id: "creative", label: "Creative", badge: "ATS 95", badgeColor: "#F59E0B" },
  { id: "technical", label: "Technical", badge: "ATS 90", badgeColor: "#4F46E5" },
  { id: "minimal", label: "Minimal", badge: "ATS 85", badgeColor: "#10B981" },
  { id: "executive", label: "Executive", badge: "ATS 96", badgeColor: "#4F46E5" },
];

function PdfDeco({ variant, className }) {
  const v = pdfVariants[variant] || pdfVariants[0];
  return (
    <div className={`pdf-deco ${className || ""}`} aria-hidden="true">
      <div className="pdf-deco-card">
        <div className="pdf-deco-svg">
          <PdfSvgInner variant={variant} />
        </div>
        <div className="pdf-deco-label">
          <span className="pdf-deco-name">{v.label}</span>
          <span className="pdf-deco-badge" style={{ color: v.badgeColor, background: `${v.badgeColor}14` }}>{v.badge}</span>
        </div>
      </div>
    </div>
  );
}

function PdfSvgInner({ variant }) {
  const svgs = [
    <svg width="100%" height="100%" viewBox="0 0 180 240" fill="none" preserveAspectRatio="xMidYMid meet">
      <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
      <rect x="16" y="14" width="60" height="4" rx="2" fill="rgba(79,70,229,0.5)" />
      <rect x="16" y="22" width="80" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="16" y="30" width="50" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="16" y="46" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="54" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
      <rect x="16" y="62" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="68" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="74" width="100" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="88" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
      <rect x="16" y="96" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="102" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="108" width="90" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="122" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
      <rect x="16" y="130" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="136" width="120" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="142" width="80" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
    </svg>,
    <svg width="100%" height="100%" viewBox="0 0 180 240" fill="none" preserveAspectRatio="xMidYMid meet">
      <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
      <rect x="0" y="0" width="52" height="240" fill="rgba(79,70,229,0.08)" />
      <rect x="8" y="16" width="36" height="36" rx="18" fill="rgba(79,70,229,0.15)" />
      <rect x="16" y="26" width="20" height="16" rx="4" fill="rgba(79,70,229,0.3)" />
      <rect x="10" y="62" width="32" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="10" y="68" width="24" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="10" y="76" width="28" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="10" y="82" width="20" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="10" y="96" width="32" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="10" y="102" width="24" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="10" y="116" width="28" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="10" y="122" width="20" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="62" y="14" width="60" height="4" rx="2" fill="rgba(79,70,229,0.5)" />
      <rect x="62" y="22" width="80" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="62" y="30" width="50" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="62" y="46" width="108" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
      <rect x="62" y="54" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
      <rect x="62" y="62" width="108" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="62" y="68" width="108" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="62" y="74" width="70" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="62" y="88" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
      <rect x="62" y="96" width="108" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="62" y="102" width="80" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="62" y="116" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
      <rect x="62" y="124" width="108" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="62" y="130" width="90" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
    </svg>,
    <svg width="100%" height="100%" viewBox="0 0 180 240" fill="none" preserveAspectRatio="xMidYMid meet">
      <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
      <rect x="0" y="0" width="180" height="44" fill="rgba(16,185,129,0.08)" />
      <rect x="16" y="12" width="40" height="4" rx="2" fill="rgba(79,70,229,0.5)" />
      <rect x="16" y="20" width="70" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
      <rect x="16" y="26" width="50" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="140" y="12" width="28" height="4" rx="2" fill="rgba(245,158,11,0.3)" />
      <rect x="16" y="56" width="60" height="3" rx="1.5" fill="rgba(245,158,11,0.4)" />
      <rect x="16" y="65" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="72" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="78" width="100" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="92" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="100" width="60" height="3" rx="1.5" fill="rgba(245,158,11,0.4)" />
      <rect x="16" y="109" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="115" width="120" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="129" width="60" height="3" rx="1.5" fill="rgba(245,158,11,0.4)" />
      <rect x="16" y="138" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="144" width="80" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <circle cx="160" cy="62" r="12" fill="rgba(16,185,129,0.06)" />
      <circle cx="160" cy="62" r="6" fill="rgba(16,185,129,0.12)" />
    </svg>,
    <svg width="100%" height="100%" viewBox="0 0 180 240" fill="none" preserveAspectRatio="xMidYMid meet">
      <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
      <rect x="16" y="12" width="50" height="4" rx="2" fill="rgba(79,70,229,0.5)" />
      <rect x="16" y="20" width="100" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="16" y="32" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="40" width="40" height="16" rx="3" fill="rgba(79,70,229,0.08)" />
      <rect x="62" y="40" width="40" height="16" rx="3" fill="rgba(16,185,129,0.08)" />
      <rect x="108" y="40" width="40" height="16" rx="3" fill="rgba(245,158,11,0.08)" />
      <rect x="16" y="64" width="40" height="16" rx="3" fill="rgba(79,70,229,0.08)" />
      <rect x="62" y="64" width="40" height="16" rx="3" fill="rgba(239,68,68,0.08)" />
      <rect x="16" y="90" width="60" height="3" rx="1.5" fill="rgba(148,163,184,0.25)" />
      <rect x="16" y="100" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="108" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="114" width="100" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="128" width="60" height="3" rx="1.5" fill="rgba(148,163,184,0.25)" />
      <rect x="16" y="138" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="146" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="152" width="80" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="166" width="60" height="3" rx="1.5" fill="rgba(148,163,184,0.25)" />
      <rect x="16" y="176" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
    </svg>,
    <svg width="100%" height="100%" viewBox="0 0 180 240" fill="none" preserveAspectRatio="xMidYMid meet">
      <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
      <rect x="60" y="16" width="60" height="4" rx="2" fill="rgba(16,185,129,0.4)" />
      <rect x="70" y="24" width="40" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="16" y="42" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="52" width="148" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="58" width="148" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="64" width="100" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="78" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="88" width="148" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="94" width="148" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="100" width="60" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="114" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="124" width="148" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="130" width="120" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="136" width="80" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="150" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.06)" />
      <rect x="16" y="160" width="148" height="2" rx="1" fill="rgba(148,163,184,0.06)" />
    </svg>,
    <svg width="100%" height="100%" viewBox="0 0 180 240" fill="none" preserveAspectRatio="xMidYMid meet">
      <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
      <rect x="0" y="0" width="180" height="52" fill="rgba(16,185,129,0.06)" />
      <rect x="16" y="14" width="55" height="4" rx="2" fill="rgba(16,185,129,0.5)" />
      <rect x="16" y="22" width="90" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="16" y="28" width="60" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="140" y="16" width="28" height="20" rx="4" fill="rgba(16,185,129,0.1)" />
      <rect x="148" y="22" width="12" height="8" rx="2" fill="rgba(16,185,129,0.25)" />
      <rect x="16" y="64" width="148" height="2" rx="1" fill="rgba(16,185,129,0.15)" />
      <rect x="16" y="74" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="80" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="86" width="100" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="100" width="148" height="2" rx="1" fill="rgba(16,185,129,0.15)" />
      <rect x="16" y="110" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="116" width="120" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="130" width="148" height="2" rx="1" fill="rgba(16,185,129,0.15)" />
      <rect x="16" y="140" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="146" width="80" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="160" width="148" height="2" rx="1" fill="rgba(16,185,129,0.15)" />
      <rect x="16" y="170" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="176" width="60" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
    </svg>,
  ];
  return svgs[variant] || svgs[0];
}

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <rect width="800" height="600" fill="#EFF6FF" />
      <rect width="360" height="600" fill="#FDF2F8" />
      <rect x="360" width="8" height="600" fill="#F472B6" opacity="0.08" />
      <g stroke="#EC4899" strokeOpacity="0.06" strokeWidth="0.8" fill="none">
        <line x1="0" y1="0" x2="0" y2="600" /><line x1="60" y1="0" x2="60" y2="600" />
        <line x1="120" y1="0" x2="120" y2="600" /><line x1="180" y1="0" x2="180" y2="600" />
        <line x1="240" y1="0" x2="240" y2="600" /><line x1="300" y1="0" x2="300" y2="600" />
        <line x1="0" y1="75" x2="360" y2="75" /><line x1="0" y1="150" x2="360" y2="150" />
        <line x1="0" y1="225" x2="360" y2="225" /><line x1="0" y1="300" x2="360" y2="300" />
        <line x1="0" y1="375" x2="360" y2="375" /><line x1="0" y1="450" x2="360" y2="450" />
        <line x1="0" y1="525" x2="360" y2="525" />
      </g>
      <g stroke="#3B82F6" strokeOpacity="0.06" strokeWidth="0.8" fill="none">
        <line x1="440" y1="0" x2="440" y2="600" /><line x1="500" y1="0" x2="500" y2="600" />
        <line x1="560" y1="0" x2="560" y2="600" /><line x1="620" y1="0" x2="620" y2="600" />
        <line x1="680" y1="0" x2="680" y2="600" /><line x1="740" y1="0" x2="740" y2="600" />
        <line x1="440" y1="75" x2="800" y2="75" /><line x1="440" y1="150" x2="800" y2="150" />
        <line x1="440" y1="225" x2="800" y2="225" /><line x1="440" y1="300" x2="800" y2="300" />
        <line x1="440" y1="375" x2="800" y2="375" /><line x1="440" y1="450" x2="800" y2="450" />
        <line x1="440" y1="525" x2="800" y2="525" />
      </g>
      <g stroke="#EC4899" strokeOpacity="0.05" strokeWidth="0.6" fill="none">
        <line x1="0" y1="0" x2="120" y2="600" /><line x1="60" y1="0" x2="180" y2="600" />
        <line x1="180" y1="0" x2="60" y2="600" /><line x1="300" y1="0" x2="180" y2="600" />
      </g>
      <g stroke="#3B82F6" strokeOpacity="0.05" strokeWidth="0.6" fill="none">
        <line x1="440" y1="0" x2="560" y2="600" /><line x1="500" y1="0" x2="620" y2="600" />
        <line x1="620" y1="0" x2="500" y2="600" /><line x1="740" y1="0" x2="620" y2="600" />
      </g>
      <g fill="#EC4899" fillOpacity="0.10">
        <polygon points="180,150 184,154 180,158 176,154" />
        <polygon points="60,300 64,304 60,308 56,304" />
        <polygon points="300,300 304,304 300,308 296,304" />
        <polygon points="120,450 124,454 120,458 116,454" />
        <polygon points="240,450 244,454 240,458 236,454" />
        <polygon points="60,75 64,79 60,83 56,79" />
        <polygon points="300,525 304,529 300,533 296,529" />
      </g>
      <g fill="#3B82F6" fillOpacity="0.10">
        <polygon points="560,150 564,154 560,158 556,154" />
        <polygon points="440,300 444,304 440,308 436,304" />
        <polygon points="680,300 684,304 680,308 676,304" />
        <polygon points="500,450 504,454 500,458 496,454" />
        <polygon points="620,450 624,454 620,458 616,454" />
        <polygon points="440,75 444,79 440,83 436,79" />
        <polygon points="680,525 684,529 680,533 676,529" />
      </g>
      <g fill="#EC4899" fillOpacity="0.08">
        <circle cx="60" cy="300" r="2" /><circle cx="300" cy="300" r="2" />
        <circle cx="180" cy="75" r="1.5" /><circle cx="180" cy="525" r="1.5" />
        <circle cx="60" cy="150" r="1" /><circle cx="300" cy="450" r="1" />
      </g>
      <g fill="#3B82F6" fillOpacity="0.08">
        <circle cx="440" cy="300" r="2" /><circle cx="680" cy="300" r="2" />
        <circle cx="560" cy="75" r="1.5" /><circle cx="560" cy="525" r="1.5" />
        <circle cx="440" cy="150" r="1" /><circle cx="680" cy="450" r="1" />
      </g>
      <g stroke="#EC4899" strokeOpacity="0.12" strokeWidth="0.7">
        <path d="M 116,226 L 126,226 M 121,221 L 121,231" />
        <path d="M 236,374 L 246,374 M 241,369 L 241,379" />
        <path d="M 176,75 L 186,75 M 181,70 L 181,80" />
      </g>
      <g stroke="#3B82F6" strokeOpacity="0.12" strokeWidth="0.7">
        <path d="M 556,226 L 566,226 M 561,221 L 561,231" />
        <path d="M 676,374 L 686,374 M 681,369 L 681,379" />
        <path d="M 556,75 L 566,75 M 561,70 L 561,80" />
      </g>
      <g transform="translate(180, 300)" stroke="#EC4899" strokeOpacity="0.20" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 0,-24 C 20,-24 30,-12 20,0 C 10,12 0,6 0,0 C 0,-6 -10,-12 -20,0 C -30,12 -20,24 0,24" />
        <path d="M 0,-24 C -20,-24 -30,-12 -20,0 C -10,12 0,6 0,0 C 0,-6 10,-12 20,0 C 30,12 20,24 0,24" />
      </g>
      <g transform="translate(560, 300)" stroke="#3B82F6" strokeOpacity="0.20" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M -22,-22 L 0,24 L 22,-22" />
        <path d="M -22,-22 C -10,-6 10,-6 22,-22" />
        <path d="M 22,-22 C 10,6 -10,6 -22,-22" />
      </g>
      <g transform="translate(300, 50)">
        <rect x="0" y="0" width="200" height="36" rx="18" fill="#FFFFFF" />
        <rect x="4" y="4" width="28" height="28" rx="14" fill="#EC4899" />
        <path d="M14 18l4 4 6-6" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <text x="42" y="22" fill="#1e293b" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">AI Resume Builder</text>
      </g>
      <g transform="translate(400, 270)">
        <rect x="-110" y="-130" width="220" height="280" rx="8" fill="#FFFFFF" />
        <rect x="-110" y="-130" width="220" height="36" rx="8" fill="#EC4899" />
        <rect x="-110" y="-94" width="220" height="2" fill="#EC4899" opacity="0.08" />
        <text x="0" y="-108" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="Inter, sans-serif">PROFESSIONAL RESUME</text>
        <rect x="-90" y="-78" width="180" height="5" rx="2.5" fill="#1e293b" opacity="0.12" />
        <rect x="-90" y="-65" width="120" height="5" rx="2.5" fill="#1e293b" opacity="0.06" />
        <rect x="-90" y="-48" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="-42" width="160" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="-36" width="140" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="-24" width="40" height="10" rx="3" fill="#EC4899" />
        <rect x="-90" y="-6" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="0" width="160" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="6" width="120" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="20" width="50" height="10" rx="3" fill="#3B82F6" />
        <rect x="-90" y="38" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="44" width="150" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="58" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="64" width="140" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="78" width="48" height="10" rx="3" fill="#F472B6" />
        <rect x="-90" y="96" width="180" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="-90" y="102" width="130" height="2" rx="1" fill="#1e293b" opacity="0.05" />
        <rect x="70" y="-120" width="32" height="18" rx="4" fill="#3B82F6" />
        <text x="86" y="-108" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800" fontFamily="Inter, sans-serif">96</text>
      </g>
      <g transform="translate(260, 480)">
        <rect x="0" y="0" width="280" height="44" rx="10" fill="#FFFFFF" />
        <rect x="12" y="12" width="76" height="20" rx="10" fill="#EC4899" opacity="0.1" />
        <text x="28" y="25" fill="#EC4899" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">ATS Scoring</text>
        <rect x="96" y="12" width="80" height="20" rx="10" fill="#3B82F6" opacity="0.1" />
        <text x="114" y="25" fill="#3B82F6" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">AI Rewrite</text>
        <rect x="184" y="12" width="84" height="20" rx="10" fill="#F472B6" opacity="0.1" />
        <text x="202" y="25" fill="#EC4899" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">Job Match</text>
      </g>
      <path d="M 20 40 L 40 40 L 40 20" stroke="#EC4899" strokeWidth="1.5" opacity="0.25" fill="none" />
      <path d="M 780 40 L 760 40 L 760 20" stroke="#3B82F6" strokeWidth="1.5" opacity="0.25" fill="none" />
      <path d="M 20 560 L 40 560 L 40 580" stroke="#EC4899" strokeWidth="1.5" opacity="0.25" fill="none" />
      <path d="M 780 560 L 760 560 L 760 580" stroke="#3B82F6" strokeWidth="1.5" opacity="0.25" fill="none" />
    </svg>
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

  const ctaTo = user ? "/scan" : "/signup";
  const ctaLabel = user ? "Upload Your Resume" : "Get Your Free Score";
  const auditAvg = Math.round(categoryData.reduce((s, c) => s + c.pct, 0) / categoryData.length);

  return (
    <div className="landing">

      {/* ─── SECTION 1: HERO ─── */}
      <section ref={addSectionRef} className="scroll-fade hero-refined" style={{ position: "relative" }}>
        <div className="hero-bg-illustration-full" aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", opacity: 0.35, overflow: "hidden" }}>
          <HeroIllustration />
        </div>
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
              Introducing AI Resume Score
              <span style={{ color: "#4F46E5", fontWeight: 700, marginLeft: 4 }}>→ Try it free</span>
            </div>

            <h1 className="hero-title-xl">
              <span className="hero-title-main">Land your dream job</span><br />
              <span className="hero-title-gradient--new">with a perfect resume</span>
            </h1>

            <p className="hero-sub" style={{ fontSize: 18, maxWidth: 480, marginBottom: 36 }}>
              Free ATS resume score checker — upload your resume, get an instant ATS score, 19-point audit, AI suggestions, and job matches.
            </p>

            <div className="hero-actions">
              <Link to={ctaTo} className="btn-primary hero-btn-primary shimmer-btn" style={{ position: "relative", zIndex: 0, fontSize: 16, padding: "15px 32px", borderRadius: 12 }}>
                {ctaLabel} →
              </Link>
              <Link to="/scan" className="hero-btn-secondary" style={{ fontSize: 16, padding: "15px 28px", borderRadius: 12, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text)", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                Watch Demo ▶
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
            <div className="hero-visual-frame">
              <div className="hero-visual-glow" />

              <div className="hero-resume-badge hero-resume-badge--tl" style={{ zIndex: 5 }}>
                <span className="hero-resume-badge-dot" style={{ background: "var(--accent)" }} />
                <span>✦ ATS Score</span>
                <strong style={{ color: "var(--accent)", marginLeft: 4 }}>95%</strong>
              </div>

              <div className="hero-resume-badge" style={{ top: 12, right: -8, zIndex: 5, animation: "float 5s ease-in-out infinite 0.8s" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <polyline points="18 15 12 9 6 15" />
                </svg>
                <span>↑ 3x more callbacks</span>
              </div>

              <div className="hero-resume-doc-wrap">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 450 500"
                  width="100%"
                  height="100%"
                  style={{ background: "transparent", display: "block" }}
                  aria-label="Resume document preview with ATS score visualization"
                >
                  <defs>
                    <filter id="card-drop-shadow" x="-10%" y="-10%" width="130%" height="130%">
                      <feDropShadow dx="2" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.08" />
                    </filter>
                    <linearGradient id="g-indigo" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#6366F1" />
                    </linearGradient>
                    <linearGradient id="g-emerald" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#34D399" />
                    </linearGradient>
                    <linearGradient id="g-amber" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#FBBF24" />
                    </linearGradient>
                  </defs>

                  {/* Connector lines */}
                  <g fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
                    <path d="M 120,55 C 105,35 120,15 105,-5" stroke="url(#g-indigo)" strokeWidth="1.8" />
                    <path d="M 130,60 C 115,40 130,20 115,0" stroke="url(#g-indigo)" strokeWidth="1.4" />
                    <path d="M 140,65 C 125,45 140,25 125,5" stroke="url(#g-indigo)" strokeWidth="1" />
                    <path d="M 410,140 C 425,160 420,190 435,210" stroke="url(#g-emerald)" strokeWidth="1.2" />
                    <path d="M 120,390 C 110,410 120,430 110,450" stroke="url(#g-indigo)" strokeWidth="1.4" />
                  </g>

                  <g transform="translate(140, 40)">
                    <rect width="260" height="390" rx="6" fill="#ffffff" filter="url(#card-drop-shadow)" />
                    <path d="M 0,6 Q 130,-4 260,6 L 260,28 L 0,28 Z" fill="url(#g-indigo)" opacity="0.06" />
                    <g transform="translate(130, 18)">
                      <rect x="-48" y="-9" width="96" height="18" rx="9" fill="url(#g-indigo)" opacity="0.95" />
                      <path d="M -35,-3 L -32,-3 L -31,-6 L -30,-3 L -27,-3 L -29.5,-1 L -28.5,2 L -31,0 L -33.5,2 L -32.5,-1 Z" fill="#ffffff" />
                      <text x="-22" y="3" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="bold" fill="#ffffff" letterSpacing="1">AI SCORE 95%</text>
                    </g>
                    <g transform="translate(220, 16)">
                      <circle cx="18" cy="18" r="16" fill="#ffffff" stroke="url(#g-emerald)" strokeWidth="2" opacity="0.9" />
                      <circle cx="18" cy="18" r="16" fill="none" stroke="url(#g-emerald)" strokeWidth="2" strokeLinecap="round"
                        strokeDasharray="100" strokeDashoffset="15" transform="rotate(-90 18 18)" opacity="0.25" />
                      <text x="18" y="21" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="900" fill="#10B981">95</text>
                    </g>
                    <g transform="translate(20, 52)">
                      <line x1="0" y1="-8" x2="220" y2="-8" stroke="var(--border)" strokeWidth="1" opacity="0.5" />
                      <text x="0" y="7" fontFamily="'Inter', Arial, sans-serif" fontSize="13" fontWeight="800" fill="#0F172A" letterSpacing="-0.3">VINAY KUMAR</text>
                      <g transform="translate(0, 18)" fill="#64748b" fontFamily="'Inter', Arial, sans-serif" fontSize="6" fontWeight="600">
                        <rect x="0" y="0" width="4" height="4" rx="1" fill="url(#g-indigo)" />
                        <text x="9" y="4">Full-Stack Engineer</text>
                        <rect x="115" y="0" width="4" height="4" rx="1" fill="url(#g-indigo)" />
                        <text x="124" y="4">Chennai, India</text>
                        <rect x="0" y="8" width="4" height="4" rx="1" fill="url(#g-emerald)" />
                        <text x="9" y="12">google@example.com</text>
                        <rect x="115" y="8" width="4" height="4" rx="1" fill="url(#g-emerald)" />
                        <text x="124" y="12">+91 98765 43210</text>
                      </g>
                    </g>
                    <g transform="translate(20, 100)">
                      <rect x="0" y="0" width="36" height="8" rx="2" fill="url(#g-indigo)" />
                      <text x="5" y="6.5" fontFamily="'Inter', Arial, sans-serif" fontSize="5" fontWeight="800" fill="#ffffff" letterSpacing="0.5">SUMMARY</text>
                      <line x1="44" y1="4" x2="220" y2="4" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="44" y1="10" x2="200" y2="10" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="44" y1="16" x2="215" y2="16" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
                      <line x1="44" y1="22" x2="165" y2="22" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
                    </g>
                    <g transform="translate(20, 140)">
                      <rect x="0" y="0" width="28" height="8" rx="2" fill="url(#g-indigo)" />
                      <text x="5" y="6.5" fontFamily="'Inter', Arial, sans-serif" fontSize="5" fontWeight="800" fill="#1e293b" letterSpacing="0.3">SKILLS</text>
                      <line x1="36" y1="4" x2="100" y2="4" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                      <line x1="140" y1="4" x2="200" y2="4" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                      <line x1="36" y1="12" x2="90" y2="12" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                      <line x1="140" y1="12" x2="180" y2="12" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                      <line x1="36" y1="20" x2="110" y2="20" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                      <line x1="140" y1="20" x2="160" y2="20" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                    </g>
                    <g transform="translate(20, 180)">
                      <rect x="0" y="0" width="48" height="8" rx="2" fill="url(#g-indigo)" />
                      <text x="5" y="6.5" fontFamily="'Inter', Arial, sans-serif" fontSize="5" fontWeight="800" fill="#ffffff" letterSpacing="0.3">EXPERIENCE</text>
                      <line x1="56" y1="4" x2="130" y2="4" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="170" y1="4" x2="220" y2="4" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="3" cy="14" r="1.8" fill="url(#g-indigo)" />
                      <line x1="10" y1="14" x2="215" y2="14" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="3" cy="22" r="1.8" fill="url(#g-indigo)" />
                      <line x1="10" y1="22" x2="220" y2="22" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="3" cy="30" r="1.8" fill="#94a3b8" />
                      <line x1="10" y1="30" x2="190" y2="30" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="0" y1="40" x2="80" y2="40" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="170" y1="40" x2="220" y2="40" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="3" cy="50" r="1.8" fill="url(#g-indigo)" />
                      <line x1="10" y1="50" x2="210" y2="50" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="3" cy="58" r="1.8" fill="#94a3b8" />
                      <line x1="10" y1="58" x2="195" y2="58" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                    <g transform="translate(20, 260)">
                      <rect x="0" y="0" width="44" height="8" rx="2" fill="url(#g-emerald)" />
                      <text x="5" y="6.5" fontFamily="'Inter', Arial, sans-serif" fontSize="5" fontWeight="800" fill="#ffffff" letterSpacing="0.3">EDUCATION</text>
                      <line x1="52" y1="4" x2="140" y2="4" stroke="#0F172A" strokeWidth="2.2" strokeLinecap="round" />
                      <line x1="180" y1="4" x2="220" y2="4" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                      <line x1="52" y1="12" x2="175" y2="12" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" />
                    </g>
                    <g transform="translate(20, 300)">
                      <rect x="0" y="0" width="44" height="8" rx="2" fill="url(#g-emerald)" />
                      <text x="5" y="6.5" fontFamily="'Inter', Arial, sans-serif" fontSize="5" fontWeight="800" fill="#1e293b" letterSpacing="0.3">LANGUAGES</text>
                      <line x1="52" y1="4" x2="80" y2="4" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                      <g transform="translate(52, 12)">
                        <circle cx="0" cy="0" r="2.2" fill="url(#g-emerald)" />
                        <circle cx="7" cy="0" r="2.2" fill="url(#g-emerald)" />
                        <circle cx="14" cy="0" r="2.2" fill="url(#g-emerald)" />
                        <circle cx="21" cy="0" r="2.2" fill="url(#g-emerald)" />
                        <circle cx="28" cy="0" r="2.2" fill="#cbd5e1" />
                      </g>
                      <line x1="140" y1="4" x2="160" y2="4" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                      <g transform="translate(140, 12)">
                        <circle cx="0" cy="0" r="2.2" fill="url(#g-emerald)" />
                        <circle cx="7" cy="0" r="2.2" fill="url(#g-emerald)" />
                        <circle cx="14" cy="0" r="2.2" fill="url(#g-emerald)" />
                        <circle cx="21" cy="0" r="2.2" fill="url(#g-emerald)" />
                        <circle cx="28" cy="0" r="2.2" fill="url(#g-emerald)" />
                      </g>
                    </g>
                    <g transform="translate(20, 345)">
                      <line x1="0" y1="0" x2="220" y2="0" stroke="#f1f5f9" strokeWidth="1.5" />
                      <circle cx="40" cy="12" r="6" fill="#ef4444" opacity="0.85" />
                      <line x1="37.5" y1="12" x2="42.5" y2="12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                      <text x="52" y="15" fontFamily="'Inter', Arial, sans-serif" fontSize="5" fontWeight="600" fill="#ef4444">Weak verb usage</text>
                      <circle cx="120" cy="12" r="6" fill="url(#g-emerald)" opacity="0.85" />
                      <path d="M 117.5,12 L 119.5,14 L 123,10.5" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <text x="132" y="15" fontFamily="'Inter', Arial, sans-serif" fontSize="5" fontWeight="600" fill="#10B981">Contact OK</text>
                      <circle cx="190" cy="12" r="3" fill="url(#g-emerald)" />
                      <circle cx="200" cy="12" r="3" fill="#94a3b8" opacity="0.4" />
                      <circle cx="210" cy="12" r="3" fill="#94a3b8" opacity="0.4" />
                    </g>
                  </g>
                </svg>
              </div>

              <div className="hero-resume-badge hero-resume-badge--br" style={{ zIndex: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>✓ AI Optimized</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, #4F46E5, transparent)", pointerEvents: "none" }} />
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

      {/* ─── SECTION 3: STATS BAR ─── */}
      <div ref={addSectionRef} className="scroll-fade stats-bar" style={{ position: "relative" }}>
        <div className="section-bg-svg" aria-hidden="true">
          <svg className="section-bg-svg__grid section-bg-svg__grid--l" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s3" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#4F46E5" strokeWidth="0.5" /></pattern></defs>
            <rect width="300" height="300" fill="url(#g-s3)" />
          </svg>
          <svg className="section-bg-svg__grid section-bg-svg__grid--r" viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s3r" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M 34 0 L 0 0 0 34" fill="none" stroke="#10B981" strokeWidth="0.5" /></pattern></defs>
            <rect width="250" height="250" fill="url(#g-s3r)" />
          </svg>
        </div>
        <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 2, background: "linear-gradient(90deg, transparent, #4F46E5, transparent)", pointerEvents: "none" }} />
        <div className="stats-bar-inner">
          {[
            { val: "50K+", label: "Resumes scanned", icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />, color: "#4F46E5" },
            { val: "94%", label: "Average ATS score lift", icon: <path d="M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6" />, color: "#10B981" },
            { val: "25", label: "Job portals integrated", icon: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>, color: "#4F46E5" },
            { val: "3K+", label: "Happy job seekers", icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" />, color: "#F59E0B" },
          ].map((item, i) => (
            <div key={i} className="stats-bar-item" style={{ gap: 4, padding: "16px 20px" }}>
              <div className="stats-bar-item-icon" style={{ background: `${item.color}0c` }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
              </div>
              <div className="stats-bar-value"><span>{item.val}</span></div>
              <div className="stats-bar-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SECTION 4: INTERACTIVE DASHBOARD ─── */}
      <section ref={addSectionRef} className="scroll-fade interactive-dash-section" style={{ position: "relative" }}>
        <div className="section-bg-svg" aria-hidden="true">
          <svg className="section-bg-svg__grid section-bg-svg__grid--l" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-id-l" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" fill="none" stroke="#0056B3" strokeWidth="0.5" /></pattern></defs>
            <rect width="280" height="280" fill="url(#g-id-l)" />
          </svg>
          <svg className="section-bg-svg__grid section-bg-svg__grid--r" viewBox="0 0 230 230" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-id-r" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 L 0 0 0 26" fill="none" stroke="#00875A" strokeWidth="0.5" /></pattern></defs>
            <rect width="230" height="230" fill="url(#g-id-r)" />
          </svg>
        </div>

        <div className="interactive-dash-inner">
          {/* Left: Copy */}
          <div className="interactive-dash-content">
            <div className="section-eyebrow" style={{ color: "#0056B3", justifyContent: "flex-start" }}>
              Everything you need
            </div>
            <h2 className="interactive-dash-title">
              One tool. <span style={{ color: "#00875A" }}>Total resume clarity.</span>
            </h2>
            <p className="interactive-dash-sub">
              From raw PDF to interview-ready in minutes. Flat modern UI design meets intelligent ATS parsing — giving you a clear roadmap to land more interviews.
            </p>
            <ul className="interactive-dash-bullets">
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#00875A"/><path d="M8.5 12.5L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ATS-friendly formatting checks
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#00875A"/><path d="M8.5 12.5L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Keyword gap analysis against job descriptions
              </li>
              <li>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#00875A"/><path d="M8.5 12.5L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Real-time score &amp; actionable suggestions
              </li>
            </ul>
            <div className="interactive-dash-actions">
              <Link to="/scan" className="interactive-dash-btn" style={{ background: "#0056B3", color: "#fff" }}>
                Upload Your Resume
              </Link>
            </div>
          </div>

          {/* Right: Big SVG Graphic */}
          <div className="interactive-dash-visual">
            <svg viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "auto", display: "block" }}>
              <defs>
                <filter id="ds-shadow"><feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000000" floodOpacity="0.06"/></filter>
                <filter id="ds-shadow-lg"><feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000000" floodOpacity="0.08"/></filter>
                <linearGradient id="ds-accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#0056B3"/><stop offset="100%" stopColor="#0066CC"/></linearGradient>
                <linearGradient id="ds-green" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#00875A"/><stop offset="100%" stopColor="#00A36C"/></linearGradient>
                <linearGradient id="ds-card-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E2F4EE"/><stop offset="100%" stopColor="#D0EDE3"/></linearGradient>
              </defs>

              <rect x="20" y="20" width="560" height="460" rx="28" fill="url(#ds-card-bg)" />
              <rect x="20" y="20" width="560" height="460" rx="28" stroke="#C8E0D6" strokeWidth="1" />

              <g transform="translate(60, 40)" filter="url(#ds-shadow)">
                <rect x="0" y="0" width="140" height="190" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
                <rect x="0" y="0" width="140" height="28" rx="6" fill="#0056B3" />
                <rect x="12" y="38" width="80" height="4" rx="2" fill="#CBD5E0" />
                <rect x="12" y="46" width="50" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="12" y="56" width="116" height="1" rx="0.5" fill="#F1F5F9" />
                <rect x="12" y="64" width="40" height="3" rx="1.5" fill="#CBD5E0" />
                <rect x="12" y="72" width="116" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="12" y="78" width="100" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="12" y="90" width="40" height="3" rx="1.5" fill="#CBD5E0" />
                <rect x="12" y="98" width="116" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="12" y="104" width="80" height="3" rx="1.5" fill="#E2E8F0" />
                <circle cx="118" cy="112" r="12" fill="#E2F4EE" />
                <text x="118" y="116" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="700" fill="#00875A">92</text>
              </g>

              <g transform="translate(400, 30)" filter="url(#ds-shadow)">
                <rect x="0" y="0" width="120" height="170" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
                <rect x="0" y="0" width="32" height="170" rx="6" fill="#E2F4EE" />
                <rect x="40" y="14" width="60" height="4" rx="2" fill="#CBD5E0" />
                <rect x="40" y="22" width="40" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="40" y="32" width="72" height="1" rx="0.5" fill="#F1F5F9" />
                <rect x="40" y="40" width="70" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="40" y="46" width="50" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="40" y="58" width="70" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="40" y="64" width="60" height="3" rx="1.5" fill="#E2E8F0" />
                <rect x="8" y="48" width="16" height="16" rx="8" fill="#00875A" opacity="0.15" />
              </g>

              <g transform="translate(140, 80)" filter="url(#ds-shadow-lg)">
                <rect x="0" y="0" width="320" height="380" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
                <rect x="0" y="0" width="320" height="6" rx="8" fill="#00875A" />
                <rect x="240" y="-14" width="64" height="28" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" filter="url(#ds-shadow)" />
                <circle cx="254" cy="0" r="8" fill="#00875A" />
                <path d="M250 -2 L254 2 L259 -4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <text x="268" y="3" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="700" fill="#00875A">ATS 95%</text>

                <text x="24" y="44" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="800" fill="#1A202C">Vinay Kumar</text>
                <text x="24" y="62" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="600" fill="#64748B">Full-Stack Engineer · Chennai, India</text>
                <rect x="24" y="74" width="272" height="1" rx="0.5" fill="#E2E8F0" />

                <rect x="24" y="86" width="48" height="6" rx="3" fill="#0056B3" />
                <text x="24" y="104" fontFamily="Arial, sans-serif" fontSize="9" fill="#475569">Results-driven engineer with 5+ years of</text>
                <text x="24" y="116" fontFamily="Arial, sans-serif" fontSize="9" fill="#475569">experience building scalable web applications.</text>

                <rect x="24" y="132" width="272" height="1" rx="0.5" fill="#E2E8F0" />

                <rect x="24" y="144" width="36" height="6" rx="3" fill="#0056B3" />
                <rect x="24" y="158" width="60" height="16" rx="4" fill="#E2F4EE" />
                <text x="30" y="169" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="600" fill="#00875A">React</text>
                <rect x="90" y="158" width="60" height="16" rx="4" fill="#E2F4EE" />
                <text x="96" y="169" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="600" fill="#00875A">Python</text>
                <rect x="156" y="158" width="80" height="16" rx="4" fill="#E2F4EE" />
                <text x="162" y="169" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="600" fill="#00875A">TypeScript</text>
                <rect x="242" y="158" width="54" height="16" rx="4" fill="#E2F4EE" />
                <text x="248" y="169" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="600" fill="#00875A">Node.js</text>

                <rect x="24" y="184" width="272" height="1" rx="0.5" fill="#E2E8F0" />

                <rect x="24" y="196" width="56" height="6" rx="3" fill="#0056B3" />
                <circle cx="32" cy="216" r="4" fill="#0056B3" />
                <text x="44" y="220" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" fill="#1A202C">Senior Frontend Engineer</text>
                <text x="180" y="220" fontFamily="Arial, sans-serif" fontSize="8" fill="#94A3B8">2021 — Present</text>
                <text x="44" y="234" fontFamily="Arial, sans-serif" fontSize="8" fill="#64748B">Led migration of legacy codebase to React 18, improving</text>
                <text x="44" y="244" fontFamily="Arial, sans-serif" fontSize="8" fill="#64748B">page load speed by 40% and reducing bundle size by 60%.</text>

                <circle cx="32" cy="262" r="4" fill="#0056B3" />
                <text x="44" y="266" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" fill="#1A202C">Full-Stack Developer</text>
                <text x="176" y="266" fontFamily="Arial, sans-serif" fontSize="8" fill="#94A3B8">2018 — 2021</text>
                <text x="44" y="280" fontFamily="Arial, sans-serif" fontSize="8" fill="#64748B">Built RESTful APIs with Node.js and PostgreSQL serving</text>
                <text x="44" y="290" fontFamily="Arial, sans-serif" fontSize="8" fill="#64748B">1M+ monthly requests with 99.9% uptime.</text>

                <rect x="24" y="304" width="272" height="1" rx="0.5" fill="#E2E8F0" />

                <rect x="24" y="316" width="52" height="6" rx="3" fill="#00875A" />
                <text x="24" y="340" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" fill="#1A202C">B.Tech Computer Science</text>
                <text x="170" y="340" fontFamily="Arial, sans-serif" fontSize="8" fill="#94A3B8">2014 — 2018</text>
                <text x="24" y="354" fontFamily="Arial, sans-serif" fontSize="8" fill="#64748B">Indian Institute of Technology · CGPA: 8.6/10</text>

                <rect x="24" y="370" width="272" height="1" rx="0.5" fill="#E2E8F0" />
                <circle cx="32" cy="384" r="5" fill="#F59E0B" />
                <text x="42" y="387" fontFamily="Arial, sans-serif" fontSize="7" fill="#F59E0B" fontWeight="600">2 issues found · Weak action verbs, missing quantifiers</text>
              </g>

              <g transform="translate(430, 120)" filter="url(#ds-shadow)">
                <rect x="0" y="0" width="130" height="36" rx="18" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
                <circle cx="22" cy="18" r="10" fill="#E2F4EE" />
                <svg x="15" y="11" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" fill="#00875A" />
                </svg>
                <text x="44" y="22" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" fill="#1A202C">AI Optimized</text>
              </g>

              <g transform="translate(410, 380)" filter="url(#ds-shadow)">
                <rect x="0" y="0" width="140" height="36" rx="18" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.5" />
                <circle cx="22" cy="18" r="10" fill="#0056B3" />
                <path d="M16 14 L20 18 L28 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(6, 4)" />
                <text x="48" y="22" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="700" fill="#0056B3">27 Checks Passed</text>
              </g>

              <g transform="translate(70, 400)" filter="url(#ds-shadow)">
                <rect x="0" y="0" width="100" height="28" rx="14" fill="#00875A" />
                <path d="M10 13 L14 17 L20 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(8, 4)" />
                <text x="42" y="17" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="700" fill="#FFFFFF">ATS Ready</text>
              </g>

              <circle cx="168" cy="64" r="3" fill="#0056B3" opacity="0.3" />
              <circle cx="300" cy="54" r="2" fill="#00875A" opacity="0.3" />
              <circle cx="430" cy="68" r="2.5" fill="#0056B3" opacity="0.2" />
              <circle cx="520" cy="100" r="1.5" fill="#00875A" opacity="0.25" />
              <circle cx="68" cy="300" r="2" fill="#0056B3" opacity="0.2" />
              <circle cx="520" cy="340" r="1.5" fill="#00875A" opacity="0.2" />

              <circle cx="500" cy="48" r="1.5" fill="#0056B3" opacity="0.4" />
              <circle cx="510" cy="42" r="1" fill="#00875A" opacity="0.3" />
              <circle cx="80" cy="48" r="1.5" fill="#0056B3" opacity="0.3" />
              <circle cx="90" cy="42" r="1" fill="#00875A" opacity="0.25" />
            </svg>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: FEATURES BENTO GRID ─── */}
      <section ref={addSectionRef} className="scroll-fade features-section" style={{ position: "relative" }}>
        <div className="section-bg-svg" aria-hidden="true">
          <svg className="section-bg-svg__grid section-bg-svg__grid--l" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s4" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" fill="none" stroke="#4F46E5" strokeWidth="0.5" /></pattern></defs>
            <rect width="280" height="280" fill="url(#g-s4)" />
          </svg>
          <svg className="section-bg-svg__grid section-bg-svg__grid--r" viewBox="0 0 230 230" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s4r" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 L 0 0 0 26" fill="none" stroke="#10B981" strokeWidth="0.5" /></pattern></defs>
            <rect width="230" height="230" fill="url(#g-s4r)" />
          </svg>
        </div>
        <div className="section-header">
          <div className="section-eyebrow" style={{ justifyContent: "center" }}>Core features</div>
          <h2 className="section-title-refined">
            Everything you need to <span className="section-title-gradient">succeed.</span>
          </h2>
          <p className="section-sub-refined">Powerful tools to help you land your next role.</p>
        </div>

        <div className="features-bento">
          {/* Card A — ATS Score Engine */}
          <div className="bento-card bento-card--large" style={{ background: "var(--bg-card)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(circle at 0 0, rgba(79,70,229,0.03), transparent 70%)", pointerEvents: "none" }} />
            <div>
              <span className="bento-card-tag" style={{ background: "rgba(79,70,229,0.08)", color: "#4F46E5" }}>Core Feature</span>
              <h3 className="bento-card-title" style={{ fontSize: 20 }}>Instant ATS Score</h3>
              <p className="bento-card-body">Get a score out of 100 across 19 checks the moment you upload.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="52" stroke="#E2E8F0" strokeWidth="6" />
                <circle cx="60" cy="60" r="52" stroke="#4F46E5" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="327" strokeDashoffset="65" transform="rotate(-90 60 60)" opacity="0.85" />
                <text x="60" y="56" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="28" fontWeight="800" fill="#0F172A">87</text>
                <text x="60" y="72" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" fill="#94A3B8">/100</text>
              </svg>
            </div>
            <div className="bento-accent-line" />
          </div>

          {/* Card B — AI Rewrite */}
          <div className="bento-card bento-card--medium" style={{ background: "rgba(79,70,229,0.02)" }}>
            <div className="bento-card-icon" style={{ background: "rgba(79,70,229,0.08)", color: "#4F46E5" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
              </svg>
            </div>
            <h3 className="bento-card-title">AI Rewrite Suggestions</h3>
            <p className="bento-card-body">Turn weak bullets into quantified achievements.</p>
            <div className="bento-accent-line" />
          </div>

          {/* Card C — Job Matching */}
          <div className="bento-card bento-card--medium" style={{ background: "rgba(16,185,129,0.02)" }}>
            <div className="bento-card-icon" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <rect x="2" y="7" width="18" height="14" rx="2" ry="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <h3 className="bento-card-title">Job Matching</h3>
            <p className="bento-card-body">Matched against 50,000+ live listings across 9 portals.</p>
            <div className="bento-accent-line" />
          </div>

          {/* Card D — Templates */}
          <div className="bento-card bento-card--tall">
            <h3 className="bento-card-title">15 LaTeX Templates</h3>
            <p className="bento-card-body">ATS-optimized designs. One-click PDF download.</p>
            <div className="bento-tpl-stack">
              <div className="bento-tpl-item" style={{ width: 60, transform: "rotate(-6deg)" }}>
                <div style={{ padding: 6, display: "flex", justifyContent: "center", alignItems: "center", aspectRatio: "3/4" }}>
                  <PdfSvgInner variant={0} />
                </div>
              </div>
              <div className="bento-tpl-item" style={{ width: 60, transform: "rotate(2deg)", marginLeft: -20 }}>
                <div style={{ padding: 6, display: "flex", justifyContent: "center", alignItems: "center", aspectRatio: "3/4" }}>
                  <PdfSvgInner variant={1} />
                </div>
              </div>
              <div className="bento-tpl-item" style={{ width: 60, transform: "rotate(8deg)", marginLeft: -20 }}>
                <div style={{ padding: 6, display: "flex", justifyContent: "center", alignItems: "center", aspectRatio: "3/4" }}>
                  <PdfSvgInner variant={2} />
                </div>
              </div>
            </div>
            <div className="bento-accent-line" style={{ background: "linear-gradient(90deg, #F59E0B, #FBBF24)" }} />
          </div>

          {/* Card E — LinkedIn Analysis */}
          <div className="bento-card bento-card--small">
            <div className="bento-card-icon" style={{ background: "rgba(10,102,194,0.08)", color: "#0a66c2" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </div>
            <h3 className="bento-card-title">LinkedIn Optimizer</h3>
            <p className="bento-card-body">Score and fix your LinkedIn profile alongside your resume.</p>
            <div className="bento-accent-line" />
          </div>

          {/* Card F — Privacy */}
          <div className="bento-card bento-card--small">
            <div className="bento-card-icon" style={{ background: "rgba(16,185,129,0.08)", color: "#10B981" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="bento-card-title">Private by Default</h3>
            <p className="bento-card-body">Your resume is never stored or used for training.</p>
            <div className="bento-accent-line" />
          </div>
        </div>
      </section>



      {/* ─── SECTION 7: JOBS ─── */}
      <section ref={addSectionRef} className="scroll-fade jobs-section" style={{ position: "relative", background: "var(--bg-card)" }}>
        <div className="section-bg-svg" aria-hidden="true">
          <svg className="section-bg-svg__grid section-bg-svg__grid--l" viewBox="0 0 320 320" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s6" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M 22 0 L 0 0 0 22" fill="none" stroke="#4F46E5" strokeWidth="0.5" /></pattern></defs>
            <rect width="320" height="320" fill="url(#g-s6)" />
          </svg>
          <svg className="section-bg-svg__grid section-bg-svg__grid--r" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s6r" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="#10B981" strokeWidth="0.5" /></pattern></defs>
            <rect width="260" height="260" fill="url(#g-s6r)" />
          </svg>
        </div>
        <svg style={{ position: "absolute", right: "5%", top: "10%", pointerEvents: "none", opacity: 0.04 }} width="100" height="200" viewBox="0 0 100 200" fill="none" aria-hidden="true">
          <circle cx="50" cy="50" r="40" fill="#4F46E5"><animate attributeName="r" values="40;45;40" dur="4s" repeatCount="indefinite" /></circle>
          <circle cx="80" cy="150" r="20" fill="#10B981"><animate attributeName="r" values="20;24;20" dur="3s" repeatCount="indefinite" /></circle>
          <circle cx="20" cy="120" r="15" fill="#4F46E5"><animate attributeName="r" values="15;18;15" dur="5s" repeatCount="indefinite" /></circle>
        </svg>
        <PdfDeco variant={3} className="pdf-deco--jobs" />
        <div className="section-header">
          <div className="section-eyebrow" style={{ justifyContent: "center" }}>Job matching</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
            <h2 className="section-title-refined" style={{ marginBottom: 0 }}>
              Jobs matched to <span className="section-title-gradient">your profile</span>
            </h2>
            <span className="live-chip">
              <span className="live-chip-dot" />
              50,000+ listings
            </span>
          </div>
          <p className="section-sub-refined">
            Your profile is embedded and matched against <strong>50,000+ live job descriptions</strong> scraped from 25 portals.
          </p>
        </div>

        {/* Portal marquee strip — 2 rows */}
        <div className="portal-marquee-wrap">
          <div className="portal-label-row">
            <span>Matching jobs from 25 portals</span>
            <span>🎓 + 9 internship platforms</span>
          </div>
          <div className="portal-marquee-track portal-marquee-track--left">
            {[...portalList, ...portalList].map((p, i) => (
              <span key={i} className="marquee-chip" style={{ color: p.color, background: `${p.color}0c`, borderColor: `${p.color}18` }}>
                <span className="marquee-chip-dot" style={{ background: p.color }} />
                {p.name}
              </span>
            ))}
          </div>
          <div className="portal-marquee-track portal-marquee-track--right">
            {[...internshipPortalList, ...internshipPortalList].map((p, i) => (
              <span key={i} className="marquee-chip" style={{ color: p.color, background: `${p.color}0c`, borderColor: `${p.color}18` }}>
                <span className="marquee-chip-dot" style={{ background: p.color }} />
                🎓 {p.name}
              </span>
            ))}
          </div>
        </div>

        <div className="jobs-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
          {jobsData.map((job, i) => (
            <JobCard key={i} job={job} />
          ))}
        </div>
        <div className="jobs-cta-wrap" style={{ flexDirection: "column", gap: 8 }}>
          <Link to="/job-recommender" className="btn-primary" style={{ fontSize: 15, padding: "13px 32px", borderRadius: 10 }}>
            View All Jobs →
          </Link>
          <Link to="/job-recommender?tab=internships" style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600, display: "block", textAlign: "center", marginTop: 8 }}>
            🎓 Browse free internship portals →
          </Link>
        </div>
      </section>

      {/* ─── SECTION 8: TESTIMONIALS ─── */}
      <section ref={addSectionRef} className="scroll-fade testimonials-section" style={{ position: "relative", background: "var(--bg-soft)" }}>
        <div className="section-bg-svg" aria-hidden="true">
          <svg className="section-bg-svg__grid section-bg-svg__grid--l" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s7" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M 26 0 L 0 0 0 26" fill="none" stroke="#10B981" strokeWidth="0.5" /></pattern></defs>
            <rect width="300" height="300" fill="url(#g-s7)" />
          </svg>
          <svg className="section-bg-svg__grid section-bg-svg__grid--r" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s7r" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#4F46E5" strokeWidth="0.5" /></pattern></defs>
            <rect width="240" height="240" fill="url(#g-s7r)" />
          </svg>
        </div>
        <PdfDeco variant={5} className="pdf-deco--testimonials" />
        <div className="testimonials-inner">
          <div className="section-header">
            <div className="section-eyebrow" style={{ justifyContent: "center" }}>Testimonials</div>
            <h2 className="section-title-refined">Loved by job seekers</h2>
          </div>

          <div className="testimonials-featured-grid">
            {/* Hero card → Jenica */}
            <div className="testimonials-hero-card" style={{ position: "relative", borderLeft: "4px solid #4F46E5", borderRadius: "var(--radius)" }}>
              <div style={{ position: "absolute", top: 16, left: 16, fontSize: 80, fontWeight: 800, color: "#4F46E5", opacity: 0.06, lineHeight: 1, pointerEvents: "none", fontFamily: "Georgia, serif" }}>"</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div className="testimonial-avatar" style={{ background: avatarColors[0], color: avatarTextColors[0] }}>
                  {initials[0]}
                </div>
                <div className="hero-stars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </div>
              </div>
              <p className="testimonial-text" style={{ fontSize: 16, fontStyle: "italic", lineHeight: 1.8, color: "var(--text)" }}>
                "ProfileOptimizer has changed my life: One week & four interviews later, I will be making 150% more doing the job I chose."
              </p>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#4F46E5", marginBottom: 12, letterSpacing: "-0.03em" }}>
                150% more salary
              </div>
              <div style={{ marginTop: "auto" }}>
                <div className="testimonial-name" style={{ fontSize: 15 }}>Jenica</div>
                <div className="testimonial-role" style={{ fontSize: 13 }}>Solutions Engineer</div>
              </div>
            </div>

            {/* Right stack */}
            <div className="testimonials-featured-right">
              {testimonials.slice(1).map((t, idx) => {
                const i = idx + 1;
                const quote = t.text.replace(t.metric, "");
                return (
                  <div key={i} className="testimonials-compact-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="testimonial-avatar" style={{ background: avatarColors[i], color: avatarTextColors[i], width: 36, height: 36, fontSize: 12 }}>
                        {initials[i]}
                      </div>
                      <div>
                        <div className="testimonial-name" style={{ fontSize: 13 }}>{t.name}</div>
                        <div className="testimonial-role" style={{ fontSize: 11 }}>{t.role}</div>
                      </div>
                    </div>
                    <p className="testimonial-text" style={{ fontSize: 13 }}>"{quote}"</p>
                    <div className="testimonial-result" style={{ padding: "6px 10px", fontSize: 12, alignSelf: "flex-start" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Result: <strong>{t.metric}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="testimonials-social-proof">
            <div className="testimonials-avatars">
              {initials.map((init, i) => (
                <div key={i} className="testimonials-avatar-item" style={{ backgroundColor: avatarColors[i], color: avatarTextColors[i] }}>
                  {init}
                </div>
              ))}
              <span className="testimonials-total" style={{ marginLeft: 16 }}>
                <strong style={{ color: "var(--text)" }}>3,000+</strong> professionals optimized their resume
              </span>
            </div>
            <div className="hero-stars">
              {[1, 2, 3, 4, 5].map((i) => (
                <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
              <span className="hero-stars-label" style={{ fontSize: 13 }}>4.5 · 3,000+ scans</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 9: FAQ ─── */}
      <section ref={addSectionRef} className="scroll-fade faq-section" style={{ position: "relative" }}>
        <div className="section-bg-svg" aria-hidden="true">
          <svg className="section-bg-svg__grid section-bg-svg__grid--l" viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s8" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#4F46E5" strokeWidth="0.5" /></pattern></defs>
            <rect width="280" height="280" fill="url(#g-s8)" />
          </svg>
          <svg className="section-bg-svg__grid section-bg-svg__grid--r" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s8r" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#10B981" strokeWidth="0.5" /></pattern></defs>
            <rect width="220" height="220" fill="url(#g-s8r)" />
          </svg>
        </div>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle, rgba(79,70,229,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="section-header">
          <div className="section-eyebrow" style={{ justifyContent: "center" }}>FAQ</div>
          <h2 className="section-title-refined">
            Frequently asked <span className="section-title-gradient">questions</span>
          </h2>
        </div>
        <div className="faq-two-col">
          {faqs.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} idx={i} />
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <Link to="#" style={{ color: "#4F46E5", fontSize: 14, fontWeight: 600, textDecoration: "none" }} onClick={(e) => { e.preventDefault(); window.location.href = "mailto:support@profileoptimizer.com"; }}>
            Still have questions? Chat with us →
          </Link>
        </div>
      </section>

      {/* ─── SECTION 10: FINAL CTA ─── */}
      <section ref={addSectionRef} className="scroll-fade cta-section-refined" style={{ position: "relative" }}>
        <div className="section-bg-svg" aria-hidden="true">
          <svg className="section-bg-svg__grid section-bg-svg__grid--l" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s9" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10B981" strokeWidth="0.5" /></pattern></defs>
            <rect width="260" height="260" fill="url(#g-s9)" />
          </svg>
          <svg className="section-bg-svg__grid section-bg-svg__grid--r" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="g-s9r" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="#4F46E5" strokeWidth="0.5" /></pattern></defs>
            <rect width="200" height="200" fill="url(#g-s9r)" />
          </svg>
        </div>
        <svg style={{ position: "absolute", left: "10%", top: "20%", pointerEvents: "none", opacity: 0.06 }} width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
          <circle cx="60" cy="60" r="50" stroke="#4F46E5" strokeWidth="1" />
          <circle cx="60" cy="60" r="40" stroke="#4F46E5" strokeWidth="0.5" />
          <circle cx="60" cy="60" r="30" stroke="#10B981" strokeWidth="0.3" />
        </svg>
        <svg style={{ position: "absolute", right: "8%", bottom: "25%", pointerEvents: "none", opacity: 0.05 }} width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="30" stroke="#10B981" strokeWidth="1">
            <animate attributeName="r" values="30;35;30" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx="40" cy="40" r="20" stroke="#10B981" strokeWidth="0.5">
            <animate attributeName="r" values="20;24;20" dur="4s" repeatCount="indefinite" />
          </circle>
        </svg>
        <PdfDeco variant={2} className="pdf-deco--cta" />

        <div className="cta-split">
          <div className="cta-split-left">
            <h2 className="cta-split-title">Ready to land your dream job?</h2>
            <p className="cta-split-sub" style={{ maxWidth: 440 }}>
              Join 3,000+ job seekers who turned their resume into callbacks.
            </p>
            <div className="cta-split-actions">
              <Link to={ctaTo} className="cta-btn-primary shimmer-btn" style={{ position: "relative", overflow: "hidden" }}>
                {user ? "Scan My Resume Free →" : "Scan My Resume Free →"}
              </Link>
            </div>
            <div className="cta-trust-row">
              <span>✓ Free forever</span>
              <span>·</span>
              <span>✓ No signup needed</span>
              <span>·</span>
              <span>✓ Instant results</span>
            </div>
          </div>

          <div className="cta-split-right">
            <div className="cta-score-card">
              <div className="cta-score-number">
                95<span style={{ fontSize: 20, fontWeight: 500, color: "#64748B", verticalAlign: "super" }}>/100</span>
              </div>
              <div className="cta-score-label">Your ATS Score</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 100, background: "rgba(16,185,129,0.12)", color: "#10B981", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
                </svg>
                +23 from last scan
              </div>
              <div className="cta-score-bars">
                <div className="cta-score-bar-item">
                  <div className="cta-score-bar-head">
                    <span>Content Quality</span>
                    <span>82%</span>
                  </div>
                  <div className="cta-score-bar-track">
                    <div className="cta-score-bar-fill" style={{ width: "82%", background: "#4F46E5" }} />
                  </div>
                </div>
                <div className="cta-score-bar-item">
                  <div className="cta-score-bar-head">
                    <span>Formatting</span>
                    <span>94%</span>
                  </div>
                  <div className="cta-score-bar-track">
                    <div className="cta-score-bar-fill" style={{ width: "94%", background: "#10B981" }} />
                  </div>
                </div>
                <div className="cta-score-bar-item">
                  <div className="cta-score-bar-head">
                    <span>Keyword Match</span>
                    <span>74%</span>
                  </div>
                  <div className="cta-score-bar-track">
                    <div className="cta-score-bar-fill" style={{ width: "74%", background: "#F59E0B" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
