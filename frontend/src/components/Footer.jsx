import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

const productLinks = [
  { label: "Smart Job Match", to: "/features/ai-job-match" },
  { label: "Resume Tailor", to: "/features/resume-ai" },
  { label: "Instant Autofill", to: "/features/job-autofill" },
  { label: "Referral Finder", to: "/features/insider-connections" },
  { label: "Sage AI Coach", to: "/features/ai-career-coach" },
  { label: "Visa-Friendly Jobs", to: "/features/h1b-jobs" },
  { label: "Interview Practice", to: "/features/interview-prep" },
];

const companyLinks = [
  { label: "Cover Letter Writer", to: "/features/cover-letter" },
  { label: "Application Board", to: "/features/job-tracker" },
  { label: "ATS Resume Checker", to: "/features/ats-resume-checker" },
  { label: "Candidate Verification", to: "/features/fraud-detection" },
  { label: "For Employers", to: "/features/ai-recruiter" },
  { label: "All features", to: "/features" },
  { label: "Pricing", to: "/pricing" },
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
              <div className="footer-brand-tag">Apply smarter with AI</div>
            </div>
          </div>
          <p className="footer-description">
            Fit-ranked jobs, a resume tailored to each role, one-click applications, referral leads and an always-on AI coach.
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
          <h4 className="footer-title">Features</h4>
          {productLinks.map((item) => (
            <Link key={item.to} to={item.to} className="footer-link">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="footer-column">
          <h4 className="footer-title">Tools</h4>
          {companyLinks.map((item) => (
            <Link key={item.to} to={item.to} className="footer-link">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="footer-column">
          <h4 className="footer-title">Company</h4>
          <Link to="/about" className="footer-link">About us</Link>
          <Link to="/privacy" className="footer-link">Privacy policy</Link>
          <Link to="/terms" className="footer-link">Terms of service</Link>
        </div>

        <div className="footer-column footer-art-panel">
          <h4 className="footer-title">Built for momentum</h4>
          <p className="footer-small-copy">
            Upload once, score instantly, and move from application to interview with fewer blind spots.
          </p>
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
