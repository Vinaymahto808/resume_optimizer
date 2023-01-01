import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronDown, Scan, UserCheck, Briefcase, Brain, GraduationCap,
  Compass, Palette, BarChart3, Layout, CreditCard, Home, Info,
  Shield, FileText, Sparkles, ArrowRight, X, Grid3X3, LineChart,
  BookOpen, MessageSquare, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", to: "/", icon: Home },
  {
    label: "Tools",
    icon: Grid3X3,
    children: [
      [
        { label: "Resume Scanner", to: "/scan", icon: Scan, desc: "Instant ATS score & 19-point audit", badge: "Popular" },
        { label: "Profile Analyzer", to: "/profile-analyzer", icon: UserCheck, desc: "LinkedIn & profile optimization" },
        { label: "Job Recommender", to: "/job-recommender", icon: Briefcase, desc: "Smart job matching engine" },
      ],
      [
        { label: "AI Deep Analysis", to: "/ai-analysis", icon: Brain, desc: "Advanced AI-powered insights" },
        { label: "Student Resume", to: "/student-resume", icon: GraduationCap, desc: "Resume builder for students" },
        { label: "Career Roadmap", to: "/career-roadmap", icon: Compass, desc: "Personalized career path" },
      ],
    ],
  },
  {
    label: "Roadmap",
    icon: LineChart,
    children: [
      [
        { label: "Career Roadmap", to: "/career-roadmap", icon: Compass, desc: "Personalized career path planning" },
        { label: "Portfolio Generator", to: "/portfolio-generator", icon: Palette, desc: "Build a stunning portfolio" },
        { label: "Analytics Dashboard", to: "/dashboard-analytics", icon: BarChart3, desc: "Track application metrics" },
      ],
      [
        { label: "Dashboard", to: "/dashboard", icon: Layout, desc: "Your personal control center" },
        { label: "Resume Templates", to: "/templates", icon: BookOpen, desc: "Professional resume templates" },
        { label: "Pricing Plans", to: "/pricing", icon: CreditCard, desc: "Choose the right plan" },
      ],
    ],
  },
  {
    label: "About",
    icon: Info,
    children: [
      [
        { label: "About Us", to: "/about", icon: Info, desc: "Our mission & team" },
        { label: "Contact", to: "/contact", icon: MessageSquare, desc: "Get in touch with us" },
      ],
      [
        { label: "Privacy Policy", to: "/privacy", icon: Shield, desc: "How we handle your data" },
        { label: "Terms of Service", to: "/terms", icon: FileText, desc: "Terms & conditions" },
      ],
    ],
  },
];

function cn(...classes) { return classes.filter(Boolean).join(" "); }

function Hamburger({ open }) {
  return (
    <div className="relative h-3.5 w-[16px]">
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
          "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
          isOpen ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50",
        )}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <item.icon size={14} className={cn("transition-all duration-200", isOpen ? "text-indigo-500" : "text-slate-400 group-hover:text-indigo-500")} />
        {item.label}
        <ChevronDown size={11} className={cn("transition-all duration-250 ease-out", isOpen ? "rotate-180 text-indigo-500" : "text-slate-400")} />
      </button>

      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 top-full pt-2 transition-all duration-200 ease-out",
        isOpen ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-2 pointer-events-none",
      )}>
        <div className="relative rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/40 overflow-hidden">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 border-l border-t border-slate-200 bg-white" />
          <div className="flex gap-0">
            {item.children.map((col, ci) => (
              <div key={ci} className={cn("p-2", ci > 0 && "border-l border-slate-100")}>
                <div className="space-y-0.5 min-w-[200px]">
                  {col.map((child) => {
                    const Icon = child.icon;
                    return (
                      <Link key={child.label} to={child.to} onClick={() => onClose(null)}
                        className="group/child flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-150 hover:bg-slate-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all duration-150 group-hover/child:bg-indigo-50 group-hover/child:text-indigo-600">
                          <Icon size={15} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700 group-hover/child:text-indigo-700 transition-colors duration-150">{child.label}</span>
                            {child.badge && <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{child.badge}</span>}
                          </div>
                          <span className="block text-xs text-slate-400 group-hover/child:text-indigo-400 transition-colors duration-150">{child.desc}</span>
                        </div>
                        <ChevronRight size={13} className="shrink-0 text-slate-300 transition-all duration-150 group-hover/child:translate-x-1 group-hover/child:text-indigo-400" />
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
          "flex w-full items-center justify-between px-5 py-3 text-sm font-medium transition-all duration-200 border-b border-slate-100",
          isExpanded ? "text-indigo-600 bg-indigo-50" : "text-slate-700 hover:bg-slate-50",
        )}
      >
        <span className="flex items-center gap-3">
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200", isExpanded ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500")}>
            <item.icon size={14} />
          </span>
          {item.label}
        </span>
        <ChevronDown size={13} className={cn("transition-all duration-250 ease-out", isExpanded ? "rotate-180 text-indigo-500" : "text-slate-400")} />
      </button>
      <div className="overflow-hidden transition-[max-height] duration-300 ease-in-out" style={{ maxHeight: isExpanded ? 800 : 0 }}>
        <div className="pb-2 px-5 space-y-0.5">
          {item.children.flat().map((child) => {
            const Icon = child.icon;
            return (
              <Link key={child.label} to={child.to} onClick={onClose}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-all duration-150 hover:bg-slate-50 hover:text-slate-900"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                  <Icon size={13} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{child.label}</span>
                    {child.badge && <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{child.badge}</span>}
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
  const navRef = useRef(null);
  const leaveTimer = useRef(null);

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
  const handleLeave = useCallback(() => { leaveTimer.current = setTimeout(() => setActiveDropdown(null), 120); }, []);

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <header ref={navRef} className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled
        ? "bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        : "bg-white/90 border-b border-transparent",
    )}>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 lg:px-8">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5 shrink-0" aria-label="Home">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-[10px] font-bold text-white transition-all duration-200 group-hover:shadow-md group-hover:shadow-indigo-200/50 group-hover:scale-105">
            <Sparkles size={12} />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-800 transition-colors duration-200 group-hover:text-indigo-600">
            ProfileOptimizer
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center justify-center flex-1 gap-0.5">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <FlyoutDropdown key={item.label} item={item} activeDropdown={activeDropdown} onEnter={() => handleEnter(item.label)} onLeave={handleLeave} onClose={setActiveDropdown} />
            ) : (
              <Link key={item.to} to={item.to}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
                  isActive(item.to) ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50",
                )}
              >
                <item.icon size={14} className={cn("transition-all duration-200", isActive(item.to) ? "text-indigo-500" : "text-slate-400")} />
                {item.label}
              </Link>
            ),
          )}
        </div>

        {/* Desktop Right */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          <Link to="/login" className="text-sm font-medium text-slate-500 transition-colors duration-200 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 rounded-lg px-3 py-2">
            Sign in
          </Link>
          <Link to="/signup" className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-500 hover:shadow-md active:scale-[0.97]">
            Get Started
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button type="button" onClick={() => setMenuOpen((v) => !v)}
          className="flex lg:hidden items-center justify-center h-9 w-9 rounded-lg text-slate-500 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen} aria-controls="mobile-menu"
        >
          <Hamburger open={menuOpen} />
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={cn("lg:hidden fixed inset-0 z-[-1] transition-all duration-300", menuOpen ? "pointer-events-auto" : "pointer-events-none")} style={{ top: 0 }}>
        <button type="button"
          className={cn("absolute inset-0 bg-black/15 backdrop-blur-sm cursor-pointer transition-opacity duration-300", menuOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setMenuOpen(false)} aria-label="Close menu"
        />
        <div className={cn(
          "absolute top-0 right-0 h-full w-full max-w-sm bg-white border-l border-slate-200 shadow-xl flex flex-col transition-transform duration-300 ease-out",
          menuOpen ? "translate-x-0" : "translate-x-full",
        )} role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <div className="flex items-center justify-between h-14 px-5 border-b border-slate-100 shrink-0">
            <span className="text-sm font-bold text-slate-800">Navigation</span>
            <button type="button" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600" aria-label="Close menu">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {NAV_ITEMS.map((item) => {
              if (item.children) {
                return <MobileAccordion key={item.label} item={item} expanded={mobileExpanded} onToggle={setMobileExpanded} onClose={() => setMenuOpen(false)} />;
              }
              return (
                <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all duration-200 border-b border-slate-100",
                    isActive(item.to) ? "text-indigo-600 bg-indigo-50" : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600",
                  )}
                >
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200", isActive(item.to) ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-500")}>
                    <item.icon size={14} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="shrink-0 px-5 py-4 border-t border-slate-100 space-y-2.5 bg-white">
            <Link to="/signup" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-500 active:scale-[0.97]"
            >
              Get Started <ArrowRight size={13} />
            </Link>
            <Link to="/login" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
