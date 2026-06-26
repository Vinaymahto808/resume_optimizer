import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

const productLinks = [
  { label: "Resume Scan", to: "/scan" },
  { label: "Profile Analyzer", to: "/profile-analyzer" },
  { label: "Job Matcher", to: "/job-recommender" },
  { label: "AI Analysis", to: "/ai-analysis" },
];

const companyLinks = [
  { label: "Pricing", to: "/pricing" },
  { label: "Templates", to: "/templates" },
  { label: "Dashboard", to: "/dashboard" },
];

function SocialIcon({ children, href, label }) {
  return (
    <a className="footer-social" href={href} target="_blank" rel="noreferrer" aria-label={label}>
      {children}
    </a>
  );
}

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer className="site-footer">
      <div className="footer-orb footer-orb-left" />
      <div className="footer-orb footer-orb-right" />

      <div className="footer-inner">
        <div className="footer-brand-panel">
          <div className="footer-brand-row">
            <img src={logo} alt="Profile Optimizer" className="footer-logo" />
            <div>
              <div className="footer-brand-tag">ATS + LinkedIn optimization in one workflow</div>
            </div>
          </div>
          <p className="footer-description">
            A polished resume suite for applicants who want stronger ATS scores, better profile keywords, and clearer next steps.
          </p>
          <div className="footer-cta-row">
            <Link to={user ? "/scan" : "/signup"} className="btn-primary footer-cta">
              {user ? "Start a scan" : "Create account"}
            </Link>
            <Link to="/pricing" className="btn-secondary footer-ghost">
              View pricing
            </Link>
          </div>
        </div>

        <div className="footer-column">
          <h4 className="footer-title">Product</h4>
          {productLinks.map((item) => (
            <Link key={item.to} to={item.to} className="footer-link">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="footer-column">
          <h4 className="footer-title">Company</h4>
          {companyLinks.map((item) => (
            <Link key={item.to} to={item.to} className="footer-link">
              {item.label}
            </Link>
          ))}
          <Link to="/about" className="footer-link">About us</Link>
          <Link to="/privacy" className="footer-link">Privacy policy</Link>
          <Link to="/terms" className="footer-link">Terms of service</Link>
        </div>

        <div className="footer-column footer-art-panel">
          <h4 className="footer-title">Built for momentum</h4>
          <p className="footer-small-copy">
            Upload once, score instantly, and move from application to interview with fewer blind spots.
          </p>
          <svg className="footer-illustration" viewBox="0 0 420 240" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="footerLine" x1="38" y1="36" x2="382" y2="206" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22c55e" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
              <linearGradient id="footerGlow" x1="90" y1="26" x2="320" y2="214" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="1" stopColor="#22c55e" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect x="28" y="22" width="364" height="196" rx="28" fill="rgba(15, 23, 42, 0.55)" stroke="rgba(148, 163, 184, 0.18)" />
            <path d="M80 152C120 124 150 108 182 108C222 108 242 138 280 138C312 138 342 124 356 110" stroke="url(#footerLine)" strokeWidth="3.25" strokeLinecap="round" />
            <path d="M80 150C118 119 150 98 182 98C219 98 247 132 280 132C311 132 338 120 356 102" stroke="url(#footerGlow)" strokeWidth="12" strokeLinecap="round" />
            <circle cx="112" cy="130" r="8" fill="#22c55e" />
            <circle cx="178" cy="104" r="8" fill="#06b6d4" />
            <circle cx="286" cy="136" r="8" fill="#38bdf8" />
            <circle cx="348" cy="108" r="8" fill="#22c55e" />
            <path d="M94 64H186" stroke="rgba(226,232,240,0.3)" strokeWidth="10" strokeLinecap="round" />
            <path d="M94 86H152" stroke="rgba(226,232,240,0.24)" strokeWidth="8" strokeLinecap="round" />
            <rect x="276" y="58" width="78" height="36" rx="14" fill="rgba(34,197,94,0.12)" stroke="rgba(34,197,94,0.24)" />
            <path d="M294 76L302 84L316 68" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copy">&copy; {new Date().getFullYear()} ProfileOptimizer. All rights reserved.</p>
        <div className="footer-social-row">
          <SocialIcon href="https://www.linkedin.com" label="LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </SocialIcon>
          <SocialIcon href="https://x.com" label="X">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.244 2H21l-6.76 7.73L22 22h-6.79l-5.32-6.79L4 22H1.24l7.23-8.28L2 2h6.95l4.85 6.23L18.24 2Zm-1.19 18h1.91L8.05 3.9H6.02L17.05 20Z" />
            </svg>
          </SocialIcon>
          <SocialIcon href="mailto:support@profileoptimizer.app" label="Email">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 3.2V18h16V7.2l-8 5-8-5Zm8 3 8-5.2H4l8 5.2Z" />
            </svg>
          </SocialIcon>
        </div>
      </div>
    </footer>
  );
}
