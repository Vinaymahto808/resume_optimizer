import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Upload, Lock, FileText, CheckCircle, AlertCircle, BarChart3, Menu, X, File, Sparkles, ArrowUpRight } from "lucide-react";

const NAV_LINKS = [
  {
    label: "Resume",
    dropdown: true,
    items: ["Examples", "Templates", "Skills", "Checklist"],
  },
  {
    label: "Cover Letter",
    dropdown: true,
    items: ["Examples", "Templates", "Formats", "Guide"],
  },
  { label: "For Organizations", dropdown: false },
  { label: "Pricing", dropdown: false },
];

function HoverUnderline({ children, active }) {
  return (
    <span className="relative inline-block">
      {children}
      <span
        className={`absolute -bottom-0.5 left-0 h-[2px] bg-emerald-500 transition-all duration-300 ease-out ${
          active ? "w-full" : "w-0 group-hover:w-full"
        }`}
      />
    </span>
  );
}

function ArrowLink({ href, children }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 transition-all duration-200 hover:text-emerald-700"
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 h-[1.5px] w-0 bg-emerald-500 transition-all duration-300 group-hover:w-full" />
      </span>
      <ArrowUpRight size={14} className="transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </a>
  );
}

export default function HeroSection({ onUpload }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dropAnim, setDropAnim] = useState(false);

  const fileInputRef = useRef(null);
  const dropdownTimer = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (uploadedFile) {
      setDropAnim(true);
      const t = setTimeout(() => setDropAnim(false), 600);
      return () => clearTimeout(t);
    }
  }, [uploadedFile]);

  useEffect(() => {
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleDropdownEnter = useCallback((label) => {
    clearTimeout(dropdownTimer.current);
    setActiveDropdown(label);
  }, []);

  const handleDropdownLeave = useCallback(() => {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 120);
  }, []);

  const handleDropdownClick = useCallback((label) => {
    setActiveDropdown((prev) => (prev === label ? null : label));
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) { setUploadedFile(file); onUpload?.(file); }
  };
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { setUploadedFile(file); onUpload?.(file); }
  };

  const NavLink = ({ link }) => (
    <div
      className="relative"
      onMouseEnter={() => handleDropdownEnter(link.label)}
      onMouseLeave={handleDropdownLeave}
    >
      <button
        onClick={() => link.dropdown && handleDropdownClick(link.label)}
        className={`group flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
          activeDropdown === link.label
            ? "text-emerald-600"
            : "text-slate-600 hover:text-slate-900"
        }`}
      >
        <HoverUnderline active={activeDropdown === link.label}>
          {link.label}
        </HoverUnderline>
        {link.dropdown && (
          <ChevronDown
            size={14}
            className={`transition-all duration-250 ease-out ${
              activeDropdown === link.label ? "rotate-180 text-emerald-500" : "text-slate-400"
            }`}
          />
        )}
      </button>

      {link.dropdown && (
        <div
          className={`absolute left-0 top-full mt-1.5 w-56 origin-top-right transition-all duration-200 ease-out ${
            activeDropdown === link.label
              ? "visible opacity-100 scale-100 translate-y-0"
              : "invisible opacity-0 scale-95 -translate-y-1 pointer-events-none"
          }`}
        >
          <div className="rounded-xl border border-slate-100 bg-white p-1.5 shadow-lg ring-1 ring-black/5 overflow-hidden">
            <div className="absolute top-0 left-4 h-2 w-2 -translate-y-1/2 rotate-45 border-l border-t border-slate-100 bg-white" />
            {link.items.map((item, i) => (
              <a
                key={item}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="group/dd relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-slate-600 transition-all duration-150 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-white hover:text-emerald-700"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-400 transition-all duration-150 group-hover/dd:bg-emerald-100 group-hover/dd:text-emerald-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{link.label} {item}</span>
                <ArrowUpRight size={12} className="text-slate-300 transition-all duration-150 group-hover/dd:translate-x-0.5 group-hover/dd:-translate-y-0.5 group-hover/dd:text-emerald-400" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="font-sans bg-white text-slate-800 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* ============= NAVBAR ============= */}
      <header
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/85 backdrop-blur-lg shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
            : "bg-white"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Logo */}
          <a
            href="/"
            className="group relative flex items-center gap-2.5 text-slate-800 no-underline"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-xs font-bold text-white shadow-sm transition-all duration-300 group-hover:shadow-emerald-200 group-hover:shadow-md group-hover:scale-110 overflow-hidden">
              <span className="absolute inset-0 rounded-lg bg-white/0 transition-all duration-300 group-hover:bg-white/10" />
              P
            </div>
            <span className="text-base font-bold tracking-tight transition-colors duration-200 group-hover:text-emerald-600">ProfileOptimizer</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.label} link={link} />
            ))}
          </nav>

          {/* Desktop CTA + Mobile hamburger */}
          <div className="flex items-center gap-3">
            <a
              href="/signup"
              className="group relative hidden md:inline-flex items-center gap-2 overflow-hidden rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
            >
              <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] transition-all duration-500 group-hover:translate-x-[100%]" />
              <FileText size={15} className="relative" />
              <span className="relative">My Documents</span>
            </a>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex md:hidden items-center justify-center h-9 w-9 rounded-lg text-slate-600 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600 active:bg-emerald-100 active:scale-90"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ============= MOBILE OVERLAY ============= */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ============= MOBILE DRAWER ============= */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <span className="text-sm font-bold text-slate-800">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 transition-all duration-200 hover:bg-red-50 hover:text-red-500 active:scale-90"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="px-3 pt-3 pb-6 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {NAV_LINKS.map((link) => (
            <div key={link.label}>
              {link.dropdown ? (
                <>
                  <button
                    onClick={() =>
                      setMobileExpanded((v) => (v === link.label ? null : link.label))
                    }
                    className={`flex w-full items-center justify-between rounded-lg px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
                      mobileExpanded === link.label
                        ? "text-emerald-700 bg-gradient-to-r from-emerald-50 to-white"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                    <ChevronDown
                      size={15}
                      className={`transition-all duration-200 ${
                        mobileExpanded === link.label
                          ? "rotate-180 text-emerald-500"
                          : "text-slate-400"
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-250 ease-out ${
                      mobileExpanded === link.label ? "max-h-60" : "max-h-0"
                    }`}
                  >
                    <div className="ml-5 pl-3 pt-1 pb-2 space-y-0.5 border-l-2 border-emerald-100">
                      {link.items.map((item, i) => (
                        <a
                          key={item}
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setMobileOpen(false);
                          }}
                          className="group/mob relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm text-slate-600 transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-700 hover:pl-5"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-slate-400 transition-all duration-150 group-hover/mob:bg-emerald-100 group-hover/mob:text-emerald-600">
                            {i + 1}
                          </span>
                          {link.label} {item}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <a
                  href="#"
                  className="group relative flex items-center rounded-lg px-3.5 py-3 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-emerald-50 hover:text-emerald-700 hover:pl-5"
                >
                  <span className="absolute left-0 h-0 w-0.5 bg-emerald-500 transition-all duration-200 group-hover:h-full" />
                  {link.label}
                </a>
              )}
            </div>
          ))}
          <hr className="my-4 border-slate-100" />
          <a
            href="/signup"
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:shadow-md hover:shadow-emerald-200 active:scale-[0.97]"
          >
            <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] transition-all duration-500 group-hover:translate-x-[100%]" />
            <FileText size={16} className="relative" />
            <span className="relative">My Documents</span>
          </a>
        </nav>
      </div>

      {/* ============= HERO BODY ============= */}
      <section className="relative mx-auto max-w-7xl px-5 pt-28 pb-20 lg:px-8 lg:pt-36 lg:pb-28">
        <div
          className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #10B981 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* ===== LEFT COLUMN ===== */}
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit animate-in fade-in slide-in-from-left-4 duration-500 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-emerald-700 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Resume Checker
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.375rem] animate-in fade-in slide-in-from-left-4 duration-700">
              Is your resume{" "}
              <span className="text-emerald-600 relative inline-block">
                good enough
                <span className="absolute -bottom-1 left-0 right-0 h-3 bg-emerald-200/30 -skew-x-6 rounded" />
              </span>
              ?
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-slate-500 sm:text-lg animate-in fade-in slide-in-from-left-4 duration-700">
              A free and fast AI resume checker doing{" "}
              <span className="font-semibold text-slate-700 relative group">
                27 crucial checks
                <span className="absolute -bottom-0.5 left-0 h-[2px] w-0 bg-emerald-400 transition-all duration-300 group-hover:w-full" />
              </span>{" "}
              to ensure your resume is technically compatible with applicant tracking systems and gets you interview callbacks.
            </p>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group relative rounded-2xl border-2 border-dashed p-7 transition-all duration-300 ${
                dragOver
                  ? "border-emerald-400 bg-emerald-50/50 scale-[1.01]"
                  : uploadedFile
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-slate-200 bg-slate-50/60 hover:border-emerald-300 hover:bg-emerald-50/20 hover:shadow-sm"
              } ${dropAnim ? "animate-in fade-in zoom-in-95 duration-300" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileSelect}
              />

              {uploadedFile ? (
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <FileText size={22} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {(uploadedFile.size / 1024).toFixed(1)} KB &middot; Ready to check
                    </p>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-all duration-150 hover:bg-red-50 hover:text-red-600 hover:scale-105 active:scale-95"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 transition-all duration-300 group-hover:bg-emerald-100 group-hover:scale-110 group-hover:shadow-sm">
                    <Upload size={22} className="text-slate-400 transition-all duration-300 group-hover:text-emerald-500 group-hover:-translate-y-0.5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">Drop your resume here</span> or{" "}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="group/link relative inline-flex items-center gap-0.5 font-semibold text-emerald-600 transition-all duration-200 hover:text-emerald-700"
                      >
                        choose a file
                        <span className="absolute -bottom-0.5 left-0 h-[1.5px] w-0 bg-emerald-500 transition-all duration-300 group-hover/link:w-full" />
                      </button>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      PDF &amp; DOCX only. Max 2MB file size.
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="group/btn relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
                  >
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] transition-all duration-500 group-hover/btn:translate-x-[100%]" />
                    <Upload size={16} className="relative transition-transform duration-200 group-hover/btn:-translate-y-0.5" />
                    <span className="relative">Upload Your Resume</span>
                  </button>
                </div>
              )}
            </div>

            {/* Privacy guarantee */}
            <ArrowLink href="#">Privacy guaranteed &middot; Your data is never stored or shared</ArrowLink>

            {/* Social proof */}
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <div className="flex -space-x-1.5">
                {["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"].map((c, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 rounded-full border-2 border-white ring-1 ring-slate-200/50 transition-all duration-200 hover:scale-125 hover:z-10 hover:ring-emerald-300 hover:shadow-md"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-semibold text-slate-600">5,289+</span> happy customers
                <span className="text-slate-300">|</span>
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg
                      key={i}
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="#F59E0B"
                      stroke="#F59E0B"
                      strokeWidth="1"
                      className="transition-all duration-150 hover:scale-125 hover:drop-shadow-sm"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ))}
                </span>
                <span className="text-slate-300">4.5</span>
              </div>
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div className="relative flex items-center justify-center">
            <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="group/card overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-200/20 hover:-translate-y-1">
                <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 transition-colors duration-200 group-hover/card:bg-emerald-200">
                        <BarChart3 size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Resume Score Report</p>
                        <p className="text-[11px] text-slate-400">AI-powered analysis</p>
                      </div>
                    </div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 transition-transform duration-200 group-hover/card:scale-110">
                      <CheckCircle size={14} className="text-emerald-500" />
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mx-auto mb-6 flex w-28 flex-col items-center">
                    <div className="relative flex h-28 w-28 items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="#F1F5F9" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="52"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(87 / 100) * 327} 327`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute text-2xl font-bold text-slate-800">87</span>
                    </div>
                    <span className="mt-1.5 text-[11px] font-medium text-slate-400">Overall Score</span>
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      <CheckCircle size={10} />
                      ATS Ready
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: "Content Quality", pct: 82, color: "bg-emerald-500" },
                      { label: "Keyword Match", pct: 74, color: "bg-emerald-500" },
                      { label: "Formatting", pct: 94, color: "bg-emerald-500" },
                      { label: "Section Completeness", pct: 100, color: "bg-emerald-500" },
                    ].map((item) => (
                      <div key={item.label} className="group/bar">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600 transition-colors duration-150 group-hover/bar:text-slate-800">
                            {item.label}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{item.pct}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out group-hover/bar:brightness-110 ${item.color}`}
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl bg-slate-50 p-4 transition-all duration-200 hover:bg-slate-100/80 hover:shadow-inner">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <AlertCircle size="13" className="text-amber-500" />
                      4 issues found
                    </div>
                    <ul className="mt-2.5 space-y-1.5">
                      {[
                        "Missing quantifiable achievements",
                        "Low keyword density for target roles",
                        "Bullet point length inconsistency",
                        "Weak action verbs in experience",
                      ].map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] text-slate-500 transition-colors duration-150 hover:text-slate-700 cursor-default">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-slate-300 transition-colors duration-150 group-hover:bg-emerald-400" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button className="group/btn relative mt-5 w-full overflow-hidden rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:shadow-md hover:shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]">
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] transition-all duration-500 group-hover/btn:translate-x-[100%]" />
                    <span className="relative">View Full Report</span>
                  </button>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-3 -right-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3.5 py-2 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:-translate-x-0.5 cursor-default group">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 transition-transform duration-200 group-hover:scale-110">
                  <Sparkles size={12} className="text-emerald-600" />
                </div>
                <span className="text-xs font-semibold text-slate-700">AI Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
