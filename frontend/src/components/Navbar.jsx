import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronDown, Scan, UserCheck, Briefcase, Brain, GraduationCap,
  Compass, Palette, BarChart3, Layout, CreditCard, Home, Info,
  Shield, FileText, Sparkles, ArrowRight, X, Grid3X3, LineChart,
  BookOpen, MessageSquare, ChevronRight, Building2, Building,
  Database, Target,
} from "lucide-react";
import { portals } from "../api";

const FALLBACK_NAV_ITEMS = [
  { label: "Platform", icon: "Grid3X3", children: [
    [
      { label: "ATS Resume Scanner", to: "/scan", icon: "Scan", desc: "Score your resume in seconds", badge: "Popular" },
      { label: "AI Resume Builder", to: "/templates", icon: "FileText", desc: "Build an ATS-friendly resume" },
      { label: "Cover Letter Optimizer", to: "/profile-analyzer", icon: "MessageSquare", desc: "Generate tailored cover letters" },
    ],
    [
      { label: "LinkedIn Profile Audit", to: "/profile-analyzer", icon: "UserCheck", desc: "Get noticed by recruiters" },
      { label: "Job Application Tracker", to: "/dashboard", icon: "BarChart3", desc: "Track applications & interviews" },
      { label: "AI Deep Analysis", to: "/ai-analysis", icon: "Brain", desc: "Advanced AI-powered insights" },
    ],
  ]},
  { label: "Solutions", icon: "Briefcase", children: [
    [
      { label: "For Job Seekers", to: "/", icon: "UserCheck", desc: "Land 3x more interviews" },
      { label: "For Hiring Managers", to: "/pricing", icon: "Building2", desc: "Streamline your hiring pipeline" },
      { label: "For Enterprise Teams", to: "/pricing", icon: "Building", desc: "Enterprise-grade ATS optimization" },
    ],
  ]},
  { label: "Learning Hub", icon: "BookOpen", children: [
    [
      { label: "Career Blog", to: "/about", icon: "BookOpen", desc: "Advice & guides for job seekers" },
      { label: "Resume Templates", to: "/templates", icon: "Layout", desc: "Free ATS-friendly templates" },
      { label: "ATS Database", to: "/about", icon: "Database", desc: "How ATS software works" },
    ],
    [
      { label: "Success Stories", to: "/about", icon: "Sparkles", desc: "Real results from real users" },
      { label: "Resume Examples", to: "/templates", icon: "FileText", desc: "Examples by job & industry" },
      { label: "Pricing Plans", to: "/pricing", icon: "CreditCard", desc: "Choose the right plan" },
    ],
  ]},
  { label: "Pricing", to: "/pricing", icon: "CreditCard" },
];

const ICON_MAP = {
  Home, Scan, UserCheck, Briefcase, Brain, GraduationCap,
  Compass, Palette, BarChart3, Layout, CreditCard, Info,
  Shield, FileText, Sparkles, ArrowRight, Grid3X3, LineChart,
  BookOpen, MessageSquare, Building2, Building, Database, Target,
};

function resolveIcon(item) {
  if (!item) return Sparkles;
  const iconName = typeof item.icon === "string" ? item.icon : item.icon?.name;
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
  if (item.icon && typeof item.icon !== "string") return item.icon;
  return Sparkles;
}

function resolveChildren(item) {
  if (item.children && Array.isArray(item.children[0])) return item.children;
  if (item.children) return [item.children];
  return [];
}

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

function FlyoutDropdown({ item, activeDropdown, onEnter, onLeave, onClose }) {
  const isOpen = activeDropdown === item.label;

  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        onClick={() => onClose(isOpen ? null : item.label)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
          isOpen
            ? "text-blue-600 bg-blue-50/80"
            : "text-slate-600 hover:text-blue-600 hover:bg-blue-50/50",
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {item.label}
        <ChevronDown size={12} className={cn("transition-all duration-250 ease-out", isOpen ? "rotate-180 text-blue-500" : "text-slate-400")} />
      </button>

      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 top-full pt-3 transition-all duration-200 ease-out",
        isOpen ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-2 pointer-events-none",
      )}>
        <div className="relative rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 border-l border-t border-slate-200 bg-white" />
          <div className="flex gap-0">
            {resolveChildren(item).map((col, ci) => (
              <div key={ci} className={cn("p-2", ci > 0 && "border-l border-slate-100")}>
                <div className="space-y-0.5 min-w-[220px]">
                  {col.map((child) => {
                    const Icon = resolveIcon(child);
                    return (
                      <Link key={child.label} to={child.to} onClick={() => onClose(null)}
                        className="group/child flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 hover:bg-blue-50"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all duration-150 group-hover/child:bg-blue-100 group-hover/child:text-blue-600">
                          <Icon size={16} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700 group-hover/child:text-blue-700 transition-colors duration-150">{child.label}</span>
                            {child.badge && <span className="text-[9px] font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-1.5 py-0.5 rounded-full">{child.badge}</span>}
                          </div>
                          <span className="block text-xs text-slate-400 group-hover/child:text-blue-500 transition-colors duration-150">{child.desc}</span>
                        </div>
                        <ChevronRight size={14} className="shrink-0 text-slate-300 transition-all duration-150 group-hover/child:translate-x-1 group-hover/child:text-blue-400" />
                      </Link>
                    );
                  })}
                </div>
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
    <div>
      <button onClick={() => onToggle(item.label)}
        className={cn(
          "flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold transition-all duration-200 border-b border-slate-100",
          isExpanded ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:text-blue-600 hover:bg-slate-50",
        )}
      >
        <span>{item.label}</span>
        <ChevronDown size={14} className={cn("transition-all duration-250 ease-out", isExpanded ? "rotate-180 text-blue-500" : "text-slate-400")} />
      </button>
      <div className="overflow-hidden transition-[max-height] duration-300 ease-in-out" style={{ maxHeight: isExpanded ? 800 : 0 }}>
        <div className="py-1 px-5 space-y-0.5">
          {resolveChildren(item).flat().map((child) => {
            const Icon = resolveIcon(child);
            return (
              <Link key={child.label} to={child.to} onClick={onClose}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-all duration-150 hover:bg-blue-50 hover:text-blue-700"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600">
                  <Icon size={13} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{child.label}</span>
                    {child.badge && <span className="text-[9px] font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-1.5 py-0.5 rounded-full">{child.badge}</span>}
                  </div>
                  <span className="block text-[11px] text-slate-400 truncate">{child.desc}</span>
                </div>
                <ChevronRight size={12} className="shrink-0 text-slate-300" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [navItems, setNavItems] = useState(FALLBACK_NAV_ITEMS);
  const navRef = useRef(null);
  const leaveTimer = useRef(null);

  useEffect(() => {
    portals.getNavLinks()
      .then((data) => { if (data && data.length) setNavItems(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setActiveDropdown(null); }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") { setMenuOpen(false); setActiveDropdown(null); } };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => { document.body.style.overflow = menuOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [menuOpen]);

  useEffect(() => {
    const handler = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setActiveDropdown(null); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleEnter = useCallback((label) => { clearTimeout(leaveTimer.current); setActiveDropdown(label); }, []);
  const handleLeave = useCallback(() => { leaveTimer.current = setTimeout(() => setActiveDropdown(null), 180); }, []);

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <header ref={navRef} className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled
        ? "bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
        : "bg-white/95 border-b border-transparent",
    )}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5 shrink-0" aria-label="Home">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:shadow-slate-900/20 group-hover:scale-105">
            <Target size={15} className="transition-all duration-200 group-hover:rotate-12" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900 transition-colors duration-200">
            Profile<span className="text-blue-600">Optimizer</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center justify-center flex-1 gap-1">
          {navItems.map((item) =>
            item.children ? (
              <FlyoutDropdown key={item.label} item={item} activeDropdown={activeDropdown} onEnter={() => handleEnter(item.label)} onLeave={handleLeave} onClose={setActiveDropdown} />
            ) : (
              <Link key={item.to} to={item.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60",
                  isActive(item.to)
                    ? "text-blue-600 bg-blue-50/80"
                    : "text-slate-600 hover:text-blue-600 hover:bg-blue-50/50",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </div>

        {/* Desktop Right */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <Link to="/login"
            className="text-sm font-semibold text-slate-500 transition-all duration-200 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 rounded-lg px-3 py-2"
          >
            Log In
          </Link>
          <Link to="/scan"
            className="relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.03] active:scale-[0.98] overflow-hidden group"
          >
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200" />
            <Scan size={15} />
            <span>Get Your Free ATS Report</span>
            <ArrowRight size={14} className="transition-all duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button type="button" onClick={() => setMenuOpen((v) => !v)}
          className="flex lg:hidden items-center justify-center h-9 w-9 rounded-lg text-slate-500 transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen} aria-controls="mobile-menu"
        >
          <Hamburger open={menuOpen} />
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={cn("lg:hidden fixed inset-0 z-[-1] transition-all duration-300", menuOpen ? "pointer-events-auto" : "pointer-events-none")} style={{ top: 0 }}>
        <button type="button"
          className={cn("absolute inset-0 bg-slate-900/20 backdrop-blur-sm cursor-pointer transition-opacity duration-300", menuOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMenuOpen(false)} aria-label="Close menu"
        />
        <div className={cn(
          "absolute top-0 right-0 h-full w-full max-w-sm bg-white border-l border-slate-200 shadow-xl flex flex-col transition-transform duration-300 ease-out",
          menuOpen ? "translate-x-0" : "translate-x-full",
        )} role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 shrink-0">
            <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <Target size={13} />
              </div>
              <span className="text-sm font-extrabold text-slate-900">Profile<span className="text-blue-600">Optimizer</span></span>
            </Link>
            <button type="button" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600" aria-label="Close menu">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {navItems.map((item) => {
              if (item.children) {
                return <MobileAccordion key={item.label} item={item} expanded={mobileExpanded} onToggle={setMobileExpanded} onClose={() => setMenuOpen(false)} />;
              }
              return (
                <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-all duration-200 border-b border-slate-100",
                    isActive(item.to) ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:text-blue-600 hover:bg-slate-50",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="shrink-0 px-5 py-4 border-t border-slate-100 space-y-3 bg-white">
            <Link to="/scan" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.97]"
            >
              <Scan size={15} /> Get Your Free ATS Report <ArrowRight size={14} />
            </Link>
            <Link to="/login" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}