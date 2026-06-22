import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Scan", to: "/scan" },
  { label: "Analyzer", to: "/profile-analyzer" },
  { label: "Jobs", to: "/job-recommender" },
  { label: "Pricing", to: "/pricing" },
];

const templateLinks = [
  { label: "All Templates", to: "/templates", description: "Browse the full library" },
  { label: "Advanced Templates", to: "/templates#advanced", description: "Premium, polished layouts" },
];

const aiToolLinks = [
  { label: "AI Deep Analysis", to: "/ai-analysis", description: "Expert AI profile critique" },
  { label: "Career Roadmap", to: "/career-roadmap", description: "Personalized career plan" },
  { label: "Portfolio Generator", to: "/portfolio-generator", description: "HTML portfolio from resume" },
  { label: "Analytics Dashboard", to: "/dashboard-analytics", description: "Strength meter & benchmarks" },
  { label: "Student Resume", to: "/student-resume", description: "Education-first builder for students" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiToolsOpen, setAiToolsOpen] = useState(false);
  const navRef = useRef(null);

  const activePath = useMemo(() => {
    return (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setTemplatesOpen(false);
    setAiToolsOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const ctaTo = user ? "/scan" : "/signup";
  const ctaLabel = user ? "Start scan" : "Get started";

  return (
    <header className="site-header">
      <nav className="site-nav" ref={navRef}>
        <Link to="/" className="brand" aria-label="Profile Optimizer home">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="8" fill="var(--accent)" opacity="0.12" />
            <path d="M8 10h12M8 14h10M8 18h8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 8l4 4-4 4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="brand-copy">
            <span className="brand-name">Profile</span>
            <span className="brand-accent">Optimizer</span>
          </span>
        </Link>

        <div className="nd nav-links">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${activePath(item.to) ? "nav-link-active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
         
          {user && (
            <DropdownMenu
              label="AI Tools"
              isOpen={aiToolsOpen}
              setIsOpen={setAiToolsOpen}
              isActive={["/ai-analysis","/career-roadmap","/portfolio-generator","/dashboard-analytics","/student-resume"].some(p => activePath(p))}
              items={aiToolLinks}
            />
          )}
          <DropdownMenu
            label="Templates"
            isOpen={templatesOpen}
            setIsOpen={setTemplatesOpen}
            isActive={activePath("/templates")}
            items={templateLinks}
          />
          {user && (
            <Link
              to="/dashboard"
              className={`nav-link ${activePath("/dashboard") ? "nav-link-active" : ""}`}
            >
              Dashboard
            </Link>
          )}
        </div>

        <div className="nd nav-actions">
          {user ? (
            <>
              <div className="nav-user-chip" title={user.email}>
                <span className="nav-user-dot" />
                {user.email?.split("@")[0] || "User"}
              </div>
              <button className="nav-ghost" onClick={handleLogout} type="button">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Sign in</Link>
              <Link to={ctaTo} className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>{ctaLabel}</Link>
            </>
          )}
        </div>

        <button
          className="nm nav-menu-button"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {menuOpen ? (
              <>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </button>

        {menuOpen && (
          <button type="button" className="mobile-menu-backdrop nm" aria-label="Close" onClick={() => setMenuOpen(false)} />
        )}
        {menuOpen && (
          <div className="mobile-menu-panel nm">
            <div className="mobile-menu-top">
              <div>
                <div className="mobile-menu-kicker">ATS Resume Suite</div>
                <div className="mobile-menu-title">Professional tools</div>
              </div>
              <div className="mobile-menu-chip">v1.0</div>
            </div>
            <div className="mobile-menu-scroll">
              <div className="mobile-menu-links">
                {navLinks.map((item) => (
                  <Link key={item.to} to={item.to} className={`mobile-link ${activePath(item.to) ? "mobile-link-active" : ""}`}>
                    <span>{item.label}</span>
                    <span className="mobile-link-arrow">→</span>
                  </Link>
                ))}
                {user && (
                  <div className="mobile-menu-group">
                    <div className="mobile-menu-group-title">AI Tools</div>
                    {aiToolLinks.map((item) => (
                      <Link key={item.to} to={item.to} className={`mobile-link ${activePath(item.to) ? "mobile-link-active" : ""}`}>
                        <span>{item.label}</span>
                        <span className="mobile-link-arrow">→</span>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mobile-menu-group">
                  <div className="mobile-menu-group-title">Templates</div>
                  {templateLinks.map((item) => (
                    <Link key={item.to} to={item.to} className={`mobile-link ${activePath("/templates") && item.to === "/templates" ? "mobile-link-active" : ""}`}>
                      <span>{item.label}</span>
                      <span className="mobile-link-arrow">→</span>
                    </Link>
                  ))}
                </div>
                {user && (
                  <Link to="/dashboard" className={`mobile-link ${activePath("/dashboard") ? "mobile-link-active" : ""}`}>
                    <span>Dashboard</span>
                    <span className="mobile-link-arrow">→</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="mobile-menu-footer">
              {user ? (
                <>
                  <button className="nav-ghost mobile-secondary" onClick={handleLogout} type="button">Log out</button>
                  <Link to="/scan" className="btn-primary mobile-primary">Start scan</Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-ghost mobile-secondary">Sign in</Link>
                  <Link to={ctaTo} className="btn-primary mobile-primary">{ctaLabel}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

function DropdownMenu({ label, isOpen, setIsOpen, isActive, items }) {
  return (
    <div className="nav-dropdown">
      <button
        type="button"
        className={`nav-link nav-dropdown-trigger ${isActive ? "nav-link-active" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-expanded={isOpen}
      >
        {label}
        <svg className={`nav-chevron ${isOpen ? "nav-chevron-open" : ""}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="nav-dropdown-menu" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
          {items.map((item) => (
            <Link key={item.to} to={item.to} className="nav-dropdown-item">
              <div className="nav-dropdown-copy">
                <span className="nav-dropdown-label">{item.label}</span>
                <span className="nav-dropdown-desc">{item.description}</span>
              </div>
              <span className="nav-dropdown-arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
