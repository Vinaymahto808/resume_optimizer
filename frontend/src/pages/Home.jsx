import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState, useRef, useEffect, useCallback } from "react";
import HeroIllustration from "../components/HeroIllustration";

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
const avatarColors = ["rgba(37,99,235,0.12)", "rgba(236,72,153,0.12)", "rgba(245,158,11,0.12)"];
const avatarTextColors = ["#2563EB", "#818cf8", "#f59e0b"];

const faqs = [
  { q: "What is a resume checker?", a: "Evaluates your resume for ATS formatting, keyword relevance, grammar, and content quality. We assess consistency, suggest improvements, and help meet professional standards." },
  { q: "How do I check my resume score?", a: "Upload your resume and we run 19 checks across 5 categories. Your score reflects parse success rate and quality issues found — typos, weak content, missing keywords." },
  { q: "How do I improve my resume score?", a: "Rewrite experience with quantifiable achievements, include relevant skills, use a clean PDF format, and fix grammar errors. Aim for active voice throughout." },
  { q: "How do I know my resume is ATS compliant?", a: "Use relevant keywords naturally, keep simple formatting with clear headings, use PDF format, include a distinct skills section, and maintain consistent work history." },
  { q: "What is a good ATS score?", a: "Above 80 is strong. But a score is just one metric — key sections like contact info and experience should be flawless." },
  { q: "Can an ATS read PDFs?", a: "Yes. PDFs score higher in ATS tests since they preserve formatting. Using our resume builder ensures formatting stays intact across all systems." },
];

const categoryData = [
  { name: "Content", color: "#2563EB", pct: 83, checks: 6, icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8" },
  { name: "Format", color: "#4f46e5", pct: 67, checks: 3, icon: "M4 6h16 M4 12h16 M4 18h16" },
  { name: "Skills", color: "#3B82F6", pct: 50, checks: 2, icon: "M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4 M12 14c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4" },
  { name: "Sections", color: "#8b5cf6", pct: 100, checks: 3, icon: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M8 2h8v4H8z" },
  { name: "Style", color: "#f59e0b", pct: 60, checks: 5, icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" },
];

const portalList = [
  { name: "LinkedIn", color: "#0a66c2" },
  { name: "Indeed", color: "#0065b3" },
  { name: "Glassdoor", color: "#0ea15b" },
  { name: "Naukri.com", color: "#e84a5f" },
  { name: "Wellfound", color: "#1a1a1a" },
  { name: "ZipRecruiter", color: "#228be6" },
  { name: "Dice", color: "#ff6700" },
  { name: "CutShort", color: "#6c2bd9" },
  { name: "Monster", color: "#6a1b9a" },
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
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span className="hero-stars-label">4.5 · 3,000+ scans</span>
    </div>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-trigger" onClick={() => setOpen(!open)} type="button" aria-expanded={open}>
        <span>{q}</span>
        <span className={`faq-toggle ${open ? "open" : ""}`}>+</span>
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  );
}

function JobCard({ job }) {
  const matchColor = (pct) => pct >= 85 ? "#2563EB" : pct >= 72 ? "#f59e0b" : "#f87171";
  const matchBg = (pct) => pct >= 85 ? "rgba(52,211,153,0.10)" : pct >= 72 ? "rgba(245,158,11,0.10)" : "rgba(248,113,113,0.10)";
  const mColor = matchColor(job.match);
  const mBg = matchBg(job.match);
  const visibleSkills = job.skills.slice(0, 3);
  const extra = job.skills.length - 3;

  return (
    <div className="job-card">
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

function CheckCard({ cat, items, isOpen, onToggle }) {
  const status = cat.pct >= 80 ? "Good" : cat.pct >= 50 ? "Fair" : "Needs Work";
  const statusColors = cat.pct >= 80
    ? { text: "#2563EB", bg: "rgba(37,99,235,0.10)" }
    : cat.pct >= 50
    ? { text: "#f59e0b", bg: "rgba(245,158,11,0.10)" }
    : { text: "#f87171", bg: "rgba(248,113,113,0.10)" };

  return (
    <div className="check-card">
      {/* Background SVG pattern */}
      <svg className="check-card-bg" width="200" height="200" viewBox="0 0 200 200" fill="none" aria-hidden="true">
        <circle cx="160" cy="40" r="80" stroke={cat.color} strokeWidth="0.5" opacity="0.06" />
        <circle cx="180" cy="60" r="50" stroke={cat.color} strokeWidth="0.5" opacity="0.04" />
        <rect x="140" y="100" width="60" height="60" rx="4" stroke={cat.color} strokeWidth="0.5" opacity="0.05" transform="rotate(15 170 130)" />
        <line x1="120" y1="160" x2="200" y2="160" stroke={cat.color} strokeWidth="0.5" opacity="0.04" />
        <line x1="120" y1="170" x2="180" y2="170" stroke={cat.color} strokeWidth="0.5" opacity="0.03" />
      </svg>
      <div className="check-card-head">
        <div className="check-card-left">
          <div className="check-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <path d={cat.icon.split(" M").join(" M")} />
            </svg>
            {cat.name}
          </div>
          <div className="check-card-meta">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{cat.checks} checks</span>
            <span className="check-card-status" style={{ color: statusColors.text, background: statusColors.bg }}>{status}</span>
          </div>
        </div>
        <div className="check-card-pct">{cat.pct}%</div>
      </div>
      <div className="check-card-bar">
        <div className="check-card-bar-fill" style={{ width: `${cat.pct}%`, background: cat.color }} />
      </div>
      <div className="check-card-items">
        <ul className="check-card-list">
          {items.map((item, i) => (
            <li key={i}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cat.color} strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const pdfVariants = [
  { id: "classic", label: "Classic", badge: "ATS 92", badgeColor: "#2563EB" },
  { id: "modern", label: "Modern", badge: "ATS 88", badgeColor: "#EC4899" },
  { id: "creative", label: "Creative", badge: "ATS 95", badgeColor: "#F472B6" },
  { id: "technical", label: "Technical", badge: "ATS 90", badgeColor: "#3B82F6" },
  { id: "minimal", label: "Minimal", badge: "ATS 85", badgeColor: "#2563EB" },
  { id: "executive", label: "Executive", badge: "ATS 96", badgeColor: "#EC4899" },
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
      <rect x="16" y="14" width="60" height="4" rx="2" fill="rgba(37,99,235,0.5)" />
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
      <rect x="0" y="0" width="52" height="240" fill="rgba(236,72,153,0.08)" />
      <rect x="8" y="16" width="36" height="36" rx="18" fill="rgba(236,72,153,0.15)" />
      <rect x="16" y="26" width="20" height="16" rx="4" fill="rgba(236,72,153,0.3)" />
      <rect x="10" y="62" width="32" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="10" y="68" width="24" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="10" y="76" width="28" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="10" y="82" width="20" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="10" y="96" width="32" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="10" y="102" width="24" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="10" y="116" width="28" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="10" y="122" width="20" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
      <rect x="62" y="14" width="60" height="4" rx="2" fill="rgba(37,99,235,0.5)" />
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
      <rect x="0" y="0" width="180" height="44" fill="rgba(52,211,153,0.08)" />
      <rect x="16" y="12" width="40" height="4" rx="2" fill="rgba(37,99,235,0.5)" />
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
      <circle cx="160" cy="62" r="12" fill="rgba(52,211,153,0.06)" />
      <circle cx="160" cy="62" r="6" fill="rgba(52,211,153,0.12)" />
    </svg>,
    <svg width="100%" height="100%" viewBox="0 0 180 240" fill="none" preserveAspectRatio="xMidYMid meet">
      <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
      <rect x="16" y="12" width="50" height="4" rx="2" fill="rgba(139,92,246,0.5)" />
      <rect x="16" y="20" width="100" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
      <rect x="16" y="32" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
      <rect x="16" y="40" width="40" height="16" rx="3" fill="rgba(139,92,246,0.08)" />
      <rect x="62" y="40" width="40" height="16" rx="3" fill="rgba(52,211,153,0.08)" />
      <rect x="108" y="40" width="40" height="16" rx="3" fill="rgba(245,158,11,0.08)" />
      <rect x="16" y="64" width="40" height="16" rx="3" fill="rgba(59,130,246,0.08)" />
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
  const ctaLabel = user ? "Upload Your Resume" : "Get Started — It's Free";

  return (
    <div className="landing">

      {/* HERO */}
      <section ref={addSectionRef} className="scroll-fade hero-refined">
        <div className="hero-orb hero-orb--1" />
        <div className="hero-orb hero-orb--2" />
        <div className="hero-orb hero-orb--3" />

        {/* Overlapping background corporate illustration */}
        <div className="hero-bg-illustration" aria-hidden="true">
          <HeroIllustration />
        </div>

        {/* Floating PDF decorators */}
        <div className="pdf-float pdf-float--1" aria-hidden="true">
          <svg width="100" height="133" viewBox="0 0 180 240" fill="none">
            <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
            <rect x="16" y="14" width="60" height="4" rx="2" fill="rgba(37,99,235,0.5)" />
            <rect x="16" y="22" width="80" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
            <rect x="16" y="30" width="50" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
            <rect x="16" y="46" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
            <rect x="16" y="54" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
            <rect x="16" y="62" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
            <rect x="16" y="68" width="100" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
            <rect x="16" y="82" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
            <rect x="16" y="90" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
            <rect x="16" y="96" width="80" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
          </svg>
        </div>
        <div className="pdf-float pdf-float--2" aria-hidden="true">
          <svg width="85" height="113" viewBox="0 0 180 240" fill="none">
            <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
            <rect x="0" y="0" width="52" height="240" fill="rgba(236,72,153,0.08)" />
            <rect x="8" y="16" width="36" height="36" rx="18" fill="rgba(236,72,153,0.15)" />
            <rect x="10" y="62" width="32" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
            <rect x="10" y="70" width="24" height="2" rx="1" fill="rgba(148,163,184,0.15)" />
            <rect x="10" y="84" width="32" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
            <rect x="62" y="14" width="60" height="4" rx="2" fill="rgba(37,99,235,0.5)" />
            <rect x="62" y="22" width="80" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
            <rect x="62" y="46" width="108" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
            <rect x="62" y="54" width="40" height="2" rx="1" fill="rgba(148,163,184,0.25)" />
            <rect x="62" y="62" width="108" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
            <rect x="62" y="68" width="70" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
          </svg>
        </div>
        <div className="pdf-float pdf-float--3" aria-hidden="true">
          <svg width="70" height="93" viewBox="0 0 180 240" fill="none">
            <rect width="180" height="240" rx="4" fill="rgba(148,163,184,0.04)" />
            <rect x="16" y="12" width="50" height="4" rx="2" fill="rgba(139,92,246,0.5)" />
            <rect x="16" y="20" width="100" height="2" rx="1" fill="rgba(148,163,184,0.2)" />
            <rect x="16" y="32" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
            <rect x="16" y="40" width="40" height="16" rx="3" fill="rgba(139,92,246,0.08)" />
            <rect x="62" y="40" width="40" height="16" rx="3" fill="rgba(52,211,153,0.08)" />
            <rect x="16" y="64" width="40" height="16" rx="3" fill="rgba(59,130,246,0.08)" />
            <rect x="62" y="64" width="40" height="16" rx="3" fill="rgba(239,68,68,0.08)" />
            <rect x="16" y="90" width="60" height="3" rx="1.5" fill="rgba(148,163,184,0.25)" />
            <rect x="16" y="100" width="148" height="1" rx="0.5" fill="rgba(148,163,184,0.08)" />
            <rect x="16" y="108" width="148" height="2" rx="1" fill="rgba(148,163,184,0.08)" />
          </svg>
        </div>

        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Smart ATS + Resume Optimization
            </div>
            <h1 className="hero-title">
              Make every resume{" "}
              <span className="hero-title-gradient">ATS-ready</span>,
              recruiter-friendly, and job-targeted.
            </h1>
            <p className="hero-sub">
              One calm workspace for resume checks, LinkedIn optimization, and job matching.
            </p>
            <div className="hero-actions">
              <Link to={ctaTo} className="btn-primary hero-btn-primary">
                {ctaLabel}
              </Link>
            </div>
            <div className="hero-social-proof">
              <StarRating />
            </div>
          </div>

          <div className="hero-visual" style={{ position: "relative" }}>
            {/* Floating glassmorphism badge — ATS Score */}
            <div className="hero-resume-badge hero-resume-badge--tl">
              <span className="hero-resume-badge-dot" style={{ background: "#2563EB" }} />
              <span>ATS Score</span>
              <strong style={{ color: "#2563EB", marginLeft: 4 }}>95%</strong>
            </div>
            {/* Floating badge — AI Enhanced */}
            <div className="hero-resume-badge hero-resume-badge--br">
              <span style={{ fontSize: 13, color: "#F472B6" }}>◇</span>
              <span>AI Powered</span>
            </div>

            {/* Resume Document SVG */}
            <div className="hero-resume-doc-wrap">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 450 500"
                width="100%"
                height="100%"
                style={{ background: "transparent", display: "block" }}
                aria-label="Resume document preview"
              >
                {/* Definitions */}
                <defs>
                  <filter id="card-drop-shadow" x="-10%" y="-10%" width="130%" height="130%">
                    <feDropShadow dx="2" dy="5" stdDeviation="6" floodColor="#000000" floodOpacity="0.08" />
                  </filter>
                  <filter id="avatar-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.15" />
                  </filter>
                </defs>

                {/* Background decorative lines */}
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 125,55 C 110,35 125,15 110,-5" stroke="#F472B6" strokeWidth="2" />
                  <path d="M 135,60 C 120,40 135,20 120,0" stroke="#F472B6" strokeWidth="2" />
                  <path d="M 145,65 C 130,45 145,25 130,5" stroke="#2563EB" strokeWidth="1.5" />
                  <path d="M 155,70 C 140,50 155,30 140,10" stroke="#F472B6" strokeWidth="1" />
                  <path d="M 410,130 C 425,150 420,180 435,200" stroke="#EC4899" strokeWidth="1.5" />
                  <path d="M 415,140 C 430,160 425,190 440,210" stroke="#2563EB" strokeWidth="1" />
                  <path d="M 120,380 C 110,400 120,420 110,440" stroke="#F472B6" strokeWidth="2" />
                  <path d="M 128,385 C 118,405 128,425 118,445" stroke="#EC4899" strokeWidth="1.5" />
                </g>

                {/* Main resume document */}
                <g transform="translate(140, 40)">
                  {/* White document base */}
                  <rect width="260" height="380" rx="4" fill="#ffffff" filter="url(#card-drop-shadow)" />

                  {/* AI header accent banner */}
                  <path d="M 0,4 Q 130,-5 260,4 L 260,22 L 0,22 Z" fill="#EC4899" opacity="0.12" />
                  <g transform="translate(130, 14)">
                    <rect x="-45" y="-8" width="90" height="15" rx="7.5" fill="#EC4899" />
                    <path d="M -32,-2 L -29,-2 L -28,-5 L -27,-2 L -24,-2 L -26.5,0 L -25.5,3 L -28,1 L -30.5,3 L -29.5,0 Z" fill="#ffffff" />
                    <text x="-20" y="3" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="bold" fill="#ffffff" letterSpacing="0.5">AI Optimized</text>
                  </g>

                  {/* Header — name & contact */}
                  <g transform="translate(20, 45)">
                    <line x1="0" y1="-12" x2="220" y2="-12" stroke="#e2e8f0" strokeWidth="1" />
                    <text x="0" y="5" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="900" fill="#1e293b" letterSpacing="0.3">VINAY KUMAR</text>
                    <g transform="translate(0, 14)" fill="#64748b" fontFamily="Arial, sans-serif" fontSize="5.5" fontWeight="bold">
                      <rect x="0" y="0" width="4" height="4" rx="1" fill="#EC4899" />
                      <text x="8" y="4">Chennai, India 600015</text>
                      <rect x="0" y="7" width="4" height="4" rx="1" fill="#2563EB" />
                      <text x="8" y="11">+91 9840000000</text>
                      <rect x="0" y="14" width="4" height="4" rx="1" fill="#F472B6" />
                      <text x="8" y="18">example@example.com</text>
                    </g>
                  </g>

                  {/* Summary */}
                  <g transform="translate(20, 95)">
                    <rect x="0" y="0" width="32" height="7" rx="1.5" fill="#EC4899" />
                    <text x="4" y="6" fontFamily="Arial, sans-serif" fontSize="4.5" fontWeight="900" fill="#ffffff">SUMMARY</text>
                    <line x1="40" y1="3" x2="220" y2="3" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <line x1="40" y1="8" x2="215" y2="8" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <line x1="40" y1="13" x2="220" y2="13" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                    <line x1="40" y1="18" x2="160" y2="18" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Skills */}
                  <g transform="translate(20, 130)">
                    <rect x="0" y="0" width="24" height="7" rx="1.5" fill="#2563EB" />
                    <text x="4" y="6" fontFamily="Arial, sans-serif" fontSize="4.5" fontWeight="900" fill="#1e293b">SKILLS</text>
                    <line x1="40" y1="4" x2="75" y2="4" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                    <line x1="125" y1="4" x2="175" y2="4" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                    <line x1="40" y1="11" x2="85" y2="11" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                    <line x1="125" y1="11" x2="165" y2="11" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                    <line x1="40" y1="18" x2="95" y2="18" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                    <line x1="125" y1="18" x2="150" y2="18" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
                  </g>

                  {/* Experience */}
                  <g transform="translate(20, 165)">
                    <rect x="0" y="0" width="36" height="7" rx="1.5" fill="#3B82F6" />
                    <text x="4" y="6" fontFamily="Arial, sans-serif" fontSize="4.5" fontWeight="900" fill="#ffffff">EXPERIENCE</text>
                    <line x1="40" y1="4" x2="110" y2="4" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="170" y1="4" x2="220" y2="4" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="43" cy="12" r="1.5" fill="#94a3b8" />
                    <line x1="50" y1="12" x2="215" y2="12" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="43" cy="19" r="1.5" fill="#94a3b8" />
                    <line x1="50" y1="19" x2="220" y2="19" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="43" cy="26" r="1.5" fill="#94a3b8" />
                    <line x1="50" y1="26" x2="200" y2="26" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                    <line x1="40" y1="37" x2="100" y2="37" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="170" y1="37" x2="220" y2="37" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="43" cy="45" r="1.5" fill="#94a3b8" />
                    <line x1="50" y1="45" x2="210" y2="45" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="43" cy="52" r="1.5" fill="#94a3b8" />
                    <line x1="50" y1="52" x2="195" y2="52" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Education */}
                  <g transform="translate(20, 240)">
                    <rect x="0" y="0" width="48" height="7" rx="1.5" fill="#DB2777" />
                    <text x="4" y="6" fontFamily="Arial, sans-serif" fontSize="4.5" fontWeight="900" fill="#ffffff">EDUCATION AND TRAINING</text>
                    <line x1="60" y1="4" x2="150" y2="4" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="180" y1="4" x2="220" y2="4" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
                    <line x1="60" y1="11" x2="170" y2="11" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Languages */}
                  <g transform="translate(20, 275)">
                    <rect x="0" y="0" width="36" height="7" rx="1.5" fill="#F472B6" />
                    <text x="4" y="6" fontFamily="Arial, sans-serif" fontSize="4.5" fontWeight="900" fill="#1e293b">LANGUAGES</text>
                    <line x1="45" y1="4" x2="70" y2="4" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                    <g transform="translate(45, 10)">
                      <circle cx="0" cy="0" r="2" fill="#F472B6" />
                      <circle cx="6" cy="0" r="2" fill="#F472B6" />
                      <circle cx="12" cy="0" r="2" fill="#F472B6" />
                      <circle cx="18" cy="0" r="2" fill="#F472B6" />
                      <circle cx="24" cy="0" r="2" fill="#cbd5e1" />
                    </g>
                    <line x1="125" y1="4" x2="145" y2="4" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                    <g transform="translate(125, 10)">
                      <circle cx="0" cy="0" r="2" fill="#F472B6" />
                      <circle cx="6" cy="0" r="2" fill="#F472B6" />
                      <circle cx="12" cy="0" r="2" fill="#F472B6" />
                      <circle cx="18" cy="0" r="2" fill="#F472B6" />
                      <circle cx="24" cy="0" r="2" fill="#F472B6" />
                    </g>
                  </g>

                  {/* Document footer controls */}
                  <g transform="translate(20, 325)">
                    <line x1="0" y1="0" x2="220" y2="0" stroke="#f1f5f9" strokeWidth="1.5" />
                    <circle cx="140" cy="18" r="8" fill="#ef4444" />
                    <path d="M 137,18 L 143,18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="162" cy="18" r="8" fill="#2563EB" />
                    <path d="M 158,18 L 161,21 L 167,15" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="184" cy="18" r="3" fill="#EC4899" />
                    <circle cx="194" cy="18" r="3" fill="#94a3b8" opacity="0.5" />
                    <circle cx="204" cy="18" r="3" fill="#94a3b8" opacity="0.5" />
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS STEPS */}
      <section ref={addSectionRef} className="scroll-fade process-section" style={{ position: "relative" }}>
        <PdfDeco variant={0} className="pdf-deco--process" />
        <div className="section-header">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-title-refined">
            Three steps to a <span className="section-title-gradient">stronger resume</span>
          </h2>
        </div>
        <div className="process-grid">
          {[
            { num: "01", title: "Upload & Parse", desc: "NLP engine reads your resume as an ATS would — extracting sections, bullets, and keywords.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
            { num: "02", title: "19-Point Audit", desc: "Machine checks format compliance, keyword density, section completeness. Human review for active voice, impact, grammar.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
            { num: "03", title: "Score & Optimize", desc: "Unified score with per-category breakdowns, AI rewrite suggestions, and matched job listings.",
              icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg> },
          ].map((step, i) => (
            <div key={i} className="process-step">
              <div className="process-step-card">
                <div className="process-step-header">
                  <div className="process-step-icon">{step.icon}</div>
                  <span className="process-step-label">{step.num}</span>
                </div>
                <h3 className="process-step-title">{step.title}</h3>
                <p className="process-step-desc">{step.desc}</p>
              </div>
              {i < 2 && (
                <div className="process-step-arrow">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 19-POINT CHECKS */}
      <section ref={addSectionRef} className="scroll-fade checks-section" style={{ position: "relative" }}>
        <PdfDeco variant={4} className="pdf-deco--checks" />

        <div className="section-header">
          <div className="section-eyebrow">Audit</div>
          <h2 className="section-title-refined" style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            19-point <span className="section-title-gradient">resume check</span>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id="checkGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2563EB" />
                  <stop offset="100%" stopColor="#4F46E5" />
                </linearGradient>
                <linearGradient id="docGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EFF6FF" />
                  <stop offset="100%" stopColor="#DBEAFE" />
                </linearGradient>
              </defs>
              {/* Document body */}
              <g>
                <rect x="6" y="4" width="24" height="28" rx="4" fill="url(#docGrad)" stroke="#93C5FD" strokeWidth="0.8" />
                {/* ATS scan lines */}
                <rect x="10" y="9" width="16" height="2" rx="1" fill="#93C5FD" opacity="0.5">
                  <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
                </rect>
                <rect x="10" y="13" width="12" height="2" rx="1" fill="#93C5FD" opacity="0.4">
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.4s" repeatCount="indefinite" />
                </rect>
                <rect x="10" y="18" width="14" height="2" rx="1" fill="#93C5FD" opacity="0.45">
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.8s" repeatCount="indefinite" />
                </rect>
                <rect x="10" y="22" width="8" height="2" rx="1" fill="#93C5FD" opacity="0.35">
                  <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2.2s" repeatCount="indefinite" />
                </rect>
              </g>
              {/* Badge circle */}
              <circle cx="27" cy="8" r="9" fill="#FFFFFF" stroke="url(#checkGlow)" strokeWidth="1.5" opacity="0.95">
                <animate attributeName="r" values="9;10;9" dur="3s" repeatCount="indefinite" />
              </circle>
              {/* Checkmark in badge */}
              <path d="M23 8.5l2.5 2.5 5-5" stroke="url(#checkGlow)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <animate attributeName="stroke-dasharray" values="0 30;30 0" dur="1.5s" repeatCount="indefinite" />
              </path>
            </svg>
          </h2>
          <p className="section-sub-refined">We check for 19 crucial things across 5 categories</p>
        </div>
        <div className="checks-grid">
          {categoryData.map((cat) => (
            <CheckCard
              key={cat.name}
              cat={cat}
              items={checklistItems.filter((i) => i.cat === cat.name)}
            />
          ))}
        </div>
      </section>

      {/* JOBS */}
      <section ref={addSectionRef} className="scroll-fade jobs-section">
        <PdfDeco variant={3} className="pdf-deco--jobs" />
        <div className="section-header">
          <div className="section-eyebrow">Job matching</div>
          <h2 className="section-title-refined">
            Jobs matched to <span className="section-title-gradient">your profile</span>
          </h2>
          <p className="section-sub-refined">
            Your profile is embedded and matched against <strong>50,000+ live job descriptions</strong> scraped from 9 portals.
          </p>
        </div>
        <div className="portal-row">
          {portalList.map((p) => (
            <span key={p.name} className="portal-chip" style={{ color: p.color, background: `${p.color}0c`, borderColor: `${p.color}18` }}>{p.name}</span>
          ))}
        </div>
        <div className="jobs-grid">
          {jobsData.map((job, i) => (
            <JobCard key={i} job={job} />
          ))}
        </div>
        <div className="jobs-cta-wrap">
          <Link to="/job-recommender" className="btn-primary" style={{ fontSize: 15, padding: "13px 32px", borderRadius: 10 }}>
            View All Jobs
          </Link>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section ref={addSectionRef} className="scroll-fade testimonials-section" style={{ position: "relative" }}>
        <PdfDeco variant={5} className="pdf-deco--testimonials" />
        <div className="testimonials-inner">
          <div className="section-header">
            <div className="section-eyebrow">Testimonials</div>
            <h2 className="section-title-refined">Loved by job seekers</h2>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => {
              const quote = t.text.replace(t.metric, "");
              return (
                <div key={i} className="testimonial-card">
                  <div className="testimonial-top">
                    <div className="testimonial-avatar" style={{ background: avatarColors[i], color: avatarTextColors[i] }}>
                      {initials[i]}
                    </div>
                    <div className="testimonial-quote-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H9.983v10H0z" /></svg>
                    </div>
                  </div>
                  <p className="testimonial-text">"{quote}"</p>
                  <div className="testimonial-result">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Key result: <strong>{t.metric}</strong></span>
                  </div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section ref={addSectionRef} className="scroll-fade faq-section">
        <div className="section-header">
          <div className="section-eyebrow">FAQ</div>
          <h2 className="section-title-refined">
            Frequently asked <span className="section-title-gradient">questions</span>
          </h2>
        </div>
        <div className="faq-list">
          {faqs.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section ref={addSectionRef} className="scroll-fade cta-section-refined">
        <PdfDeco variant={2} className="pdf-deco--cta" />
        <div className="cta-inner">
          <h2 className="cta-title-refined">Get your resume score now</h2>
          <p className="cta-sub-refined">
            Get a personalized report with an actionable task list — and turn applications into callbacks.
          </p>
          <Link to={ctaTo} className="btn-primary" style={{ display: "inline-flex", fontSize: 16, padding: "15px 36px", borderRadius: 10 }}>
            {user ? "Scan Now" : "Upload Your Resume"}
          </Link>
        </div>
      </section>

    </div>
  );
}
