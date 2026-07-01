import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, X, ChevronDown, ChevronRight, FileText, Wand2, Search, Shuffle, BookOpen, Grid, Pen, File, Layout, Mail, HelpCircle, Building2, DollarSign } from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Resume",
    icon: FileText,
    href: "#",
    children: [
      { label: "Create Resume", icon: Wand2, href: "#" },
      { label: "AI Resume Builder", icon: SparklesIcon, href: "#" },
      { label: "ATS Resume Checker", icon: Search, href: "#" },
      { label: "One-click Resume Tailor", icon: Shuffle, href: "#" },
      { label: "Resume Examples", icon: BookOpen, href: "#" },
      { label: "Resume Templates", icon: Grid, href: "#" },
    ],
  },
  {
    label: "Cover Letter",
    icon: File,
    href: "#",
    children: [
      { label: "Cover Letter Generator", icon: Wand2, href: "#" },
      { label: "Cover Letter Examples", icon: BookOpen, href: "#" },
      { label: "Cover Letter Templates", icon: Grid, href: "#" },
      { label: "Cover Letter Format", icon: Layout, href: "#" },
    ],
  },
  { label: "Blog", icon: Pen, href: "#", children: null },
  { label: "For Organizations", icon: Building2, href: "#", children: null },
  { label: "Pricing", icon: DollarSign, href: "#", children: null },
];

const SECONDARY_LINKS = [
  { label: "About us", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Help", href: "#" },
  { label: "Contact Us", href: "#" },
];

function SparklesIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z" />
      <path d="M18 14l.7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7z" />
    </svg>
  );
}

function useScrollListener() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function useBodyLock(locked) {
  useEffect(() => {
    if (!locked) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [locked]);
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

// ── Desktop Nav Link ──
function DesktopNavLink({ item, activeDropdown, setActiveDropdown }) {
  const hasChildren = !!item.children;
  const isActive = activeDropdown === item.label;

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setActiveDropdown(isActive ? null : item.label);
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => hasChildren && setActiveDropdown(item.label)}
      onMouseLeave={() => hasChildren && setActiveDropdown(null)}
    >
      <a
        href={item.href}
        onClick={handleClick}
        className={cn(
          "group flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200",
          isActive
            ? "text-emerald-600"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        <span className="relative inline-block">
          {item.label}
          <span
            className={cn(
              "absolute -bottom-0.5 left-0 h-[2px] bg-emerald-500 transition-all duration-300 ease-out",
              isActive ? "w-full" : "w-0 group-hover:w-full"
            )}
          />
        </span>
        {hasChildren && (
          <ChevronDown
            size={14}
            className={cn(
              "transition-all duration-250 ease-out",
              isActive ? "rotate-180 text-emerald-500" : "text-slate-400 group-hover:text-slate-600"
            )}
          />
        )}
      </a>

      {/* Dropdown panel */}
      {hasChildren && (
        <div
          className={cn(
            "absolute left-0 top-full mt-1.5 w-[440px] origin-top-left transition-all duration-200 ease-out",
            isActive
              ? "visible opacity-100 scale-100 translate-y-0"
              : "invisible opacity-0 scale-95 -translate-y-2 pointer-events-none"
          )}
        >
          <div className="relative rounded-2xl border border-slate-100 bg-white p-3 shadow-lg ring-1 ring-black/5 overflow-hidden">
            <div className="absolute -top-1 left-6 h-3 w-3 rotate-45 border-l border-t border-slate-100 bg-white" />
            <div className={item.children.length > 4 ? "grid grid-cols-2 gap-1" : "space-y-0.5"}>
              {item.children.map((child) => {
                const Icon = child.icon;
                return (
                  <a
                    key={child.label}
                    href={child.href}
                    onClick={(e) => e.preventDefault()}
                    className="group/child flex items-center gap-3 rounded-xl p-3 text-sm text-slate-600 transition-all duration-150 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-white hover:text-emerald-700"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all duration-150 group-hover/child:bg-emerald-100 group-hover/child:text-emerald-600">
                      <Icon size={16} />
                    </span>
                    <span className="font-medium">{child.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Desktop Nav ──
function DesktopNav({ activeDropdown, setActiveDropdown }) {
  return (
    <nav className="hidden md:flex items-center gap-0.5">
      {NAV_ITEMS.map((item) => (
        <DesktopNavLink
          key={item.label}
          item={item}
          activeDropdown={activeDropdown}
          setActiveDropdown={setActiveDropdown}
        />
      ))}
    </nav>
  );
}

// ── Mobile Accordion Item ──
function MobileAccordionItem({ item, isExpanded, onToggle }) {
  const Icon = item.icon;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium text-slate-800 transition-all duration-200 hover:bg-emerald-50/50"
      >
        <span className="flex items-center gap-3">
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Icon size={16} />
            </span>
          )}
          {item.label}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "text-slate-400 transition-all duration-250 ease-out",
            isExpanded && "rotate-180 text-emerald-500"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-96" : "max-h-0"
        )}
      >
        <div className="pb-3 pl-5">
          {item.children.map((child) => {
            const ChildIcon = child.icon;
            return (
              <a
                key={child.label}
                href={child.href}
                onClick={(e) => e.preventDefault()}
                className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-600 transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-700"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-all duration-150 group-hover:bg-emerald-100 group-hover:text-emerald-600">
                  <ChildIcon size={15} />
                </span>
                <span>{child.label}</span>
                <ChevronRight size={14} className="ml-auto text-slate-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-emerald-400" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Mobile Drawer ──
function MobileDrawer({ open, onClose }) {
  const [expanded, setExpanded] = useState(null);

  useBodyLock(open);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setExpanded(null), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const toggleAccordion = (label) => {
    setExpanded((prev) => (prev === label ? null : label));
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-white flex flex-col transition-transform duration-300 ease-in-out md:hidden",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 shrink-0">
        <a href="/" className="flex items-center gap-2.5 text-slate-800 no-underline">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white">
            P
          </div>
          <span className="text-base font-bold tracking-tight">ProfileOptimizer</span>
        </a>
        <button
          onClick={onClose}
          className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 transition-all duration-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable middle */}
      <div className="flex-1 overflow-y-auto">
        {/* Upper: Main links with accordion */}
        <div className="py-2">
          {NAV_ITEMS.map((item) =>
            item.children ? (
              <MobileAccordionItem
                key={item.label}
                item={item}
                isExpanded={expanded === item.label}
                onToggle={() => toggleAccordion(item.label)}
              />
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => e.preventDefault()}
                className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-slate-800 transition-all duration-200 hover:bg-emerald-50/50 border-b border-slate-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <item.icon size={16} />
                </span>
                {item.label}
              </a>
            )
          )}
        </div>

        {/* Lower: Secondary links */}
        <div className="bg-slate-50 px-5 py-6 mt-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">More</p>
          <div className="space-y-0.5">
            {SECONDARY_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => e.preventDefault()}
                className="block rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-all duration-150 hover:bg-white hover:text-slate-900 hover:shadow-sm"
              >
                {link.label}
              </a>
            ))}
          </div>
          <p className="mt-6 text-[11px] text-slate-400">&copy; 2026. All rights reserved.</p>
        </div>
      </div>

      {/* Fixed bottom dock */}
      <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
        <div className="flex gap-3">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-center text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]"
          >
            Sign in
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-emerald-200 active:scale-[0.97]"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Navbar ──
export default function NavbarV2() {
  const scrolled = useScrollListener();
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  useOutsideClick(navRef, useCallback(() => setActiveDropdown(null), []));

  return (
    <header
      ref={navRef}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          : "bg-white"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        {/* Logo */}
        <a href="/" className="group flex items-center gap-2.5 text-slate-800 no-underline">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white shadow-sm transition-all duration-200 group-hover:shadow-emerald-200 group-hover:shadow-md group-hover:scale-105">
            P
          </div>
          <span className="text-base font-bold tracking-tight transition-colors duration-200 group-hover:text-emerald-600">
            ProfileOptimizer
          </span>
        </a>

        {/* Desktop center nav */}
        <DesktopNav activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} />

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="group text-sm font-medium text-slate-500 transition-all duration-200 hover:text-emerald-600"
          >
            <span className="relative inline-block">
              Sign in
              <span className="absolute -bottom-0.5 left-0 h-[1.5px] w-0 bg-emerald-500 transition-all duration-300 group-hover:w-full" />
            </span>
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] transition-all duration-500 group-hover:translate-x-[100%]" />
            <span className="relative">Get Started</span>
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="flex md:hidden items-center justify-center h-9 w-9 rounded-lg text-slate-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600 active:bg-emerald-100 active:scale-90"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </header>
  );
}
