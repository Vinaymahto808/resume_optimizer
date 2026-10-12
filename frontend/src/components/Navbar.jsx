import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronDown, Scan, UserCheck, Briefcase, FileText, Sparkles, ArrowRight, X, Layout, BookOpen,
  ChevronRight, Building2, GraduationCap, Zap, Search, ListChecks, Bot, Compass, Info,
  LayoutDashboard, CreditCard, LogOut, User, Globe2, MousePointerClick, Users, ShieldCheck, LayoutGrid,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

// The navbar's menu lives here (single source of truth). Every link points at a real route in App.jsx.
const NAV_ITEMS = [
  {
    label: "Features",
    columns: [
      {
        title: "Find & apply",
        items: [
          { label: "Smart Job Match", to: "/features/ai-job-match", icon: Search, desc: "Every job scored against your resume", badge: "New" },
          { label: "Instant Autofill", to: "/features/job-autofill", icon: MousePointerClick, desc: "Applications filled in one click" },
          { label: "Apply Agent", to: "/features/auto-apply-agent", icon: Zap, desc: "Busywork handled, you approve" },
          { label: "Visa-Friendly Jobs", to: "/features/h1b-jobs", icon: Globe2, desc: "Employers that sponsor H-1B" },
        ],
      },
      {
        title: "Resume, network & coach",
        items: [
          { label: "Resume Tailor", to: "/features/resume-ai", icon: FileText, desc: "A version for every role" },
          { label: "Referral Finder", to: "/features/insider-connections", icon: Users, desc: "Get in through people you know" },
          { label: "Sage AI Coach", to: "/features/ai-career-coach", icon: Bot, desc: "A career coach that's always on" },
          { label: "All features", to: "/features", icon: LayoutGrid, desc: "Every tool, for seekers and employers" },
        ],
      },
    ],
  },
  {
    label: "Tools",
    columns: [
      {
        title: "Resume",
        items: [
          { label: "ATS Resume Scanner", to: "/scan", icon: Scan, desc: "Score your resume in seconds", badge: "Popular" },
          { label: "Resume Editor", to: "/resume-editor", icon: FileText, desc: "Edit, tailor and export ATS-safe" },
          { label: "Resume Templates", to: "/templates", icon: Layout, desc: "Free ATS-friendly designs" },
          { label: "LinkedIn Profile Audit", to: "/profile-analyzer", icon: UserCheck, desc: "Get noticed by recruiters" },
        ],
      },
      {
        title: "Job search",
        items: [
          { label: "AI Job Match", to: "/jobs", icon: Search, desc: "Jobs ranked by fit to your resume", badge: "New" },
          { label: "Application Tracker", to: "/tracker", icon: ListChecks, desc: "Every application, wishlist to offer" },
          { label: "Auto-Apply Agent", to: "/agent", icon: Zap, desc: "Prepares applications for you" },
          { label: "Sage AI Coach", to: "/coach", icon: Bot, desc: "Interview prep and company insights" },
        ],
      },
    ],
  },
  {
    label: "Solutions",
    columns: [
      {
        items: [
          { label: "For Job Seekers", to: "/jobs", icon: Briefcase, desc: "Matched jobs, tailored resumes, auto-apply" },
          { label: "For Employers", to: "/features/ai-recruiter", icon: Building2, desc: "From job post to shortlist" },
          { label: "Candidate Verification", to: "/features/fraud-detection", icon: ShieldCheck, desc: "Spot fake applicants early" },
          { label: "For Students", to: "/student-resume", icon: GraduationCap, desc: "Your first resume, done right" },
        ],
      },
    ],
  },
  {
    label: "Resources",
    columns: [
      {
        items: [
          { label: "Resume Templates", to: "/templates", icon: BookOpen, desc: "Examples by job and industry" },
          { label: "Career Roadmap", to: "/career-roadmap", icon: Compass, desc: "Skills and steps to your next role" },
          { label: "About ProfileOptimizer", to: "/about", icon: Info, desc: "How our ATS checks work" },
        ],
      },
    ],
  },
  { label: "Pricing", to: "/pricing" },
];

function cn(...classes) { return classes.filter(Boolean).join(" "); }

function Hamburger({ open }) {
  return (
    <div className="relative h-3.5 w-[18px]">
      <span className={cn("absolute left-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out origin-center", open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0")} />
      <span className={cn("absolute left-0 top-1/2 -translate-y-1/2 h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out", open ? "opacity-0 scale-x-0" : "opacity-100")} />
      <span className={cn("absolute left-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-out origin-center", open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0")} />
    </div>
  );
}

function Badge({ children }) {
  return <span className="rounded-full bg-gradient-to-r from-teal-600 to-teal-500 px-1.5 py-px text-[10px] font-semibold leading-4 text-white">{children}</span>;
}

function MenuLink({ item, onClick, compact = false }) {
  const Icon = item.icon || Sparkles;
  return (
    <Link to={item.to} onClick={onClick}
      className="group/child flex items-start gap-3 rounded-xl p-2.5 text-left transition-colors duration-150 hover:bg-teal-50/80 focus-visible:outline-none focus-visible:bg-teal-50"
    >
      <span className={cn("flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors duration-150 group-hover/child:bg-teal-100 group-hover/child:text-teal-700", compact ? "h-8 w-8" : "h-9 w-9")}>
        <Icon size={compact ? 15 : 16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-slate-900 group-hover/child:text-teal-700">{item.label}</span>
          {item.badge && <Badge>{item.badge}</Badge>}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.desc}</span>
      </span>
    </Link>
  );
}

function FlyoutDropdown({ item, open, onEnter, onLeave, onToggle, onClose }) {
  const wide = item.columns.length > 1;
  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button type="button" onClick={onToggle}
        className={cn(
          "flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60",
          open ? "text-teal-700 bg-teal-50" : "text-slate-600 hover:text-teal-700 hover:bg-teal-50/60",
        )}
        aria-expanded={open} aria-haspopup="true"
      >
        {item.label}
        <ChevronDown size={14} className={cn("transition-transform duration-200", open ? "rotate-180 text-teal-600" : "text-slate-400")} />
      </button>

      {/* pt-2 bridges the gap so the menu stays open while the pointer moves down to it */}
      <div className={cn(
        "absolute left-1/2 top-full -translate-x-1/2 pt-2 transition-all duration-150 ease-out",
        open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1 pointer-events-none",
      )}>
        <div className={cn("rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10", wide ? "w-[600px]" : "w-[320px]")}>
          <div className={cn("grid gap-1", wide && "grid-cols-2")}>
            {item.columns.map((col, ci) => (
              <div key={ci} className={cn(wide && ci > 0 && "border-l border-slate-100 pl-1")}>
                {col.title && <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{col.title}</div>}
                {col.items.map((child) => <MenuLink key={child.label} item={child} onClick={onClose} />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileAccordion({ item, expanded, onToggle, onClose }) {
  const isExpanded = expanded === item.label;
  return (
    <div className="border-b border-slate-100">
      <button type="button" onClick={() => onToggle(isExpanded ? null : item.label)} aria-expanded={isExpanded}
        className={cn(
          "flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold transition-colors duration-150",
          isExpanded ? "text-teal-700 bg-teal-50/70" : "text-slate-700 hover:text-teal-700 hover:bg-slate-50",
        )}
      >
        <span>{item.label}</span>
        <ChevronDown size={16} className={cn("transition-transform duration-200", isExpanded ? "rotate-180 text-teal-600" : "text-slate-400")} />
      </button>
      {isExpanded && (
        <div className="px-3 pb-3">
          {item.columns.map((col, ci) => (
            <div key={ci}>
              {col.title && <div className="px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{col.title}</div>}
              {col.items.map((child) => <MenuLink key={child.label} item={child} onClick={onClose} compact />)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const initials = (user.full_name || user.email || "U").split(/[\s@]/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true" aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 transition-colors hover:border-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-[11px] font-bold text-white">{initials}</span>
        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
          <div className="px-3 py-2">
            <div className="truncate text-sm font-semibold text-slate-900">{user.full_name || "Your account"}</div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          {[
            { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { to: "/account", label: "Account settings", icon: User },
            { to: "/pricing", label: "Plan & billing", icon: CreditCard },
          ].map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700">
              <Icon size={15} />{label}
            </Link>
          ))}
          <div className="my-1 h-px bg-slate-100" />
          <button type="button" onClick={() => { setOpen(false); onLogout(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <LogOut size={15} />Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => typeof window !== "undefined" && window.scrollY > 10);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const navRef = useRef(null);
  const leaveTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change (derived during render instead of in an effect).
  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    setMenuOpen(false);
    setActiveDropdown(null);
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") { setMenuOpen(false); setActiveDropdown(null); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    const handler = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setActiveDropdown(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleEnter = useCallback((label) => { clearTimeout(leaveTimer.current); setActiveDropdown(label); }, []);
  const handleLeave = useCallback(() => { leaveTimer.current = setTimeout(() => setActiveDropdown(null), 160); }, []);
  const handleLogout = () => { logout(); setMenuOpen(false); navigate("/"); };

  const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));
  const closeMobile = () => setMenuOpen(false);

  return (
    <>
      <header ref={navRef} className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled || menuOpen
          ? "bg-white/90 backdrop-blur-xl border-b border-slate-200/70 shadow-sm shadow-slate-900/5"
          : "bg-white/60 backdrop-blur-xl border-b border-transparent",
      )}>
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Main">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5 shrink-0" aria-label="ProfileOptimizer home">
            <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <FileText size={16} strokeWidth={2.2} className="transition-transform duration-200 group-hover:-rotate-6" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              Profile<span className="text-teal-600">Optimizer</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex flex-1 items-center justify-center gap-0.5">
            {NAV_ITEMS.map((item) =>
              item.columns ? (
                <FlyoutDropdown key={item.label} item={item} open={activeDropdown === item.label}
                  onEnter={() => handleEnter(item.label)} onLeave={handleLeave}
                  onToggle={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                  onClose={() => setActiveDropdown(null)} />
              ) : (
                <Link key={item.to} to={item.to}
                  className={cn(
                    "px-3 py-2 text-sm font-semibold rounded-lg transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60",
                    isActive(item.to) ? "text-teal-700 bg-teal-50" : "text-slate-600 hover:text-teal-700 hover:bg-teal-50/60",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <Link to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                  <LayoutDashboard size={15} />Dashboard
                </Link>
                <AccountMenu user={user} onLogout={handleLogout} />
              </>
            ) : (
              <>
                <Link to="/login"
                  className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                  Log In
                </Link>
                <Link to="/scan"
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60">
                  <Scan size={15} />Start Free Scan
                  <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button type="button" onClick={() => setMenuOpen((v) => !v)}
            className="flex lg:hidden items-center justify-center h-10 w-10 rounded-lg text-slate-600 transition-colors duration-150 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen} aria-controls="mobile-menu"
          >
            <Hamburger open={menuOpen} />
          </button>
        </nav>
      </header>

      {/* Mobile menu: rendered outside <header> because its backdrop-filter would trap position:fixed children. */}
      <div id="mobile-menu" className={cn("lg:hidden fixed inset-0 z-[60]", menuOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!menuOpen}>
        <button type="button" tabIndex={menuOpen ? 0 : -1}
          className={cn("absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300", menuOpen ? "opacity-100" : "opacity-0")}
          onClick={closeMobile} aria-label="Close menu"
        />
        <div className={cn(
          "absolute right-0 top-0 flex h-full w-[86vw] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          menuOpen ? "translate-x-0" : "translate-x-full",
        )} role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
            <Link to="/" className="flex items-center gap-2" onClick={closeMobile}>
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <FileText size={14} strokeWidth={2.2} />
              </div>
              <span className="text-sm font-extrabold text-slate-900">Profile<span className="text-teal-600">Optimizer</span></span>
            </Link>
            <button type="button" onClick={closeMobile} tabIndex={menuOpen ? 0 : -1}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          {user && (
            <div className="border-b border-slate-100 px-5 py-3">
              <div className="truncate text-sm font-semibold text-slate-900">{user.full_name || "Your account"}</div>
              <div className="truncate text-xs text-slate-500">{user.email}</div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {NAV_ITEMS.map((item) =>
              item.columns ? (
                <MobileAccordion key={item.label} item={item} expanded={mobileExpanded} onToggle={setMobileExpanded} onClose={closeMobile} />
              ) : (
                <Link key={item.to} to={item.to} onClick={closeMobile}
                  className={cn(
                    "flex items-center justify-between border-b border-slate-100 px-5 py-3.5 text-sm font-semibold transition-colors duration-150",
                    isActive(item.to) ? "text-teal-700 bg-teal-50/70" : "text-slate-700 hover:text-teal-700 hover:bg-slate-50",
                  )}
                >
                  {item.label}<ChevronRight size={16} className="text-slate-300" />
                </Link>
              ),
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t border-slate-100 bg-white px-5 py-4">
            {user ? (
              <>
                <Link to="/dashboard" onClick={closeMobile}
                  className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-teal-500/20">
                  <LayoutDashboard size={15} />Go to Dashboard
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/account" onClick={closeMobile} className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:text-teal-700">
                    <User size={14} />Account
                  </Link>
                  <button type="button" onClick={handleLogout} className="flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:border-red-200 hover:bg-red-50">
                    <LogOut size={14} />Log out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/scan" onClick={closeMobile}
                  className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-teal-500/20">
                  <Scan size={15} />Start Free Scan<ArrowRight size={14} />
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" onClick={closeMobile} className="flex items-center justify-center rounded-full border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-teal-200 hover:text-teal-700">Log In</Link>
                  <Link to="/signup" onClick={closeMobile} className="flex items-center justify-center rounded-full border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100">Sign up free</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
