import { useState, useRef, useEffect } from "react";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NAV_ITEMS = [
  { icon: "⊞", label: "Dashboard", path: "/dashboard" },
  { icon: "⬆", label: "Scan Resume", path: "/scan" },
  { icon: "✦", label: "AI Analysis", path: "/ai-analysis" },
  { icon: "◈", label: "Templates", path: "/templates" },
  { icon: "◉", label: "Job Match", path: "/job-recommender" },
  { icon: "◎", label: "Profile", path: "/profile-analyzer" },
  { icon: "↗", label: "Career Map", path: "/career-roadmap" },
  { icon: "◇", label: "Analytics", path: "/dashboard-analytics" },
];

const BREADCRUMB_MAP = {
  "/dashboard": ["Dashboard"],
  "/scan": ["Dashboard", "Scan Resume"],
  "/ai-analysis": ["Dashboard", "AI Analysis"],
  "/templates": ["Dashboard", "Templates"],
  "/job-recommender": ["Dashboard", "Job Match"],
  "/profile-analyzer": ["Dashboard", "Profile Analyzer"],
  "/career-roadmap": ["Dashboard", "Career Roadmap"],
  "/dashboard-analytics": ["Dashboard", "Analytics"],
  "/portfolio-generator": ["Dashboard", "Portfolio Generator"],
  "/student-resume": ["Dashboard", "Student Resume"],
  "/account": ["Dashboard", "Account Settings"],
};

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const location = useLocation();
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) return (
    <div style={s.loadingScreen}>
      <div style={s.spinner} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  const crumbs = BREADCRUMB_MAP[location.pathname] || ["Dashboard"];
  const initials = user.email ? user.email.slice(0, 2).toUpperCase() : "U";

  return (
    <div style={s.shell} data-theme="dark">
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div className="dash-mobile-backdrop nm" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`dash-sidebar ${mobileSidebarOpen ? "dash-sidebar--open" : ""}`}
        style={{
          ...s.sidebar,
          width: collapsed ? 64 : 220,
        }}
      >
        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandLogo}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="6" fill="#2563EB" />
              <path d="M6 11h10M11 6v10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          {!collapsed && <span style={s.brandName}>ResumeAI</span>}
        </div>

        {/* Collapse toggle */}
        <button style={s.collapseBtn} onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d={collapsed ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Nav */}
        <nav style={s.nav}>
          {!collapsed && <div style={s.navSection}>MAIN MENU</div>}
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...s.navItem,
                  ...(active ? s.navItemActive : {}),
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                title={collapsed ? item.label : undefined}
              >
                <span style={{ ...s.navIcon, ...(active ? s.navIconActive : {}) }}>{item.icon}</span>
                {!collapsed && <span style={s.navLabel}>{item.label}</span>}
                {!collapsed && active && <span style={s.navDot} />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        {!collapsed && (
          <div style={s.sidebarFooter}>
            <div style={s.sidebarPlan}>
              <span style={s.planBadge}>FREE</span>
              <span style={s.planText}>Upgrade to Pro</span>
            </div>
            <Link to="/pricing" style={s.upgradeBtn}>Upgrade →</Link>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div style={{ ...s.main, marginLeft: collapsed ? 64 : 220 }}>
        {/* Top bar */}
        <header className="dash-topbar" style={s.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="nm dash-mobile-toggle"
              onClick={() => setMobileSidebarOpen(true)}
              style={s.mobileToggle}
              type="button"
              aria-label="Open sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
            <nav style={s.breadcrumbs} aria-label="breadcrumb">
            {crumbs.map((crumb, i) => (
              <span key={i} style={s.breadcrumbWrap}>
                {i > 0 && <span style={s.breadcrumbSep}>/</span>}
                <span style={{ ...s.breadcrumb, ...(i === crumbs.length - 1 ? s.breadcrumbActive : {}) }}>
                  {crumb}
                </span>
            </span>
              ))}
            </nav>
          </div>

          <div style={s.topbarRight}>
            {/* Search */}
            <div className="dash-search-wrap" style={s.searchWrap}>
              <svg style={s.searchIcon} width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input style={s.searchInput} placeholder="Search resumes, jobs…" />
              <span style={s.searchShortcut}>⌘K</span>
            </div>

            {/* Notifications */}
            <div style={s.iconBtnWrap} ref={notifRef}>
              <button style={s.iconBtn} onClick={() => setNotifOpen(!notifOpen)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1a5 5 0 00-5 5v2l-1.5 2.5h13L13 8V6a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span style={s.notifDot} />
              </button>
              {notifOpen && (
                <div style={s.dropdown}>
                  <div style={s.dropdownHeader}>Notifications</div>
                  {[
                    { icon: "✦", text: "AI analysis complete on SWE_Resume.pdf", time: "2m ago", accent: "#2563EB" },
                    { icon: "⬆", text: "Resume scored 87/100 — great work!", time: "1h ago", accent: "#22c55e" },
                    { icon: "◉", text: "3 new job matches found for your profile", time: "3h ago", accent: "#f59e0b" },
                  ].map((n, i) => (
                    <div key={i} style={s.notifItem}>
                      <span style={{ ...s.notifItemIcon, background: n.accent + "22", color: n.accent }}>{n.icon}</span>
                      <div style={s.notifItemBody}>
                        <div style={s.notifItemText}>{n.text}</div>
                        <div style={s.notifItemTime}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                  <div style={s.dropdownFooter}>View all notifications</div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div style={s.iconBtnWrap} ref={profileRef}>
              <button style={s.avatarBtn} onClick={() => setProfileOpen(!profileOpen)}>
                <span style={s.avatar}>{initials}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d={profileOpen ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {profileOpen && (
                <div style={{ ...s.dropdown, right: 0, minWidth: 200 }}>
                  <div style={s.profileInfo}>
                    <div style={s.profileAvatar}>{initials}</div>
                    <div>
                      <div style={s.profileName}>{user.email?.split("@")[0]}</div>
                      <div style={s.profileEmail}>{user.email}</div>
                    </div>
                  </div>
                  <div style={s.dropdownDivider} />
                  {[
                    { icon: "◎", label: "My Account", path: "/account" },
                    { icon: "◇", label: "Billing", path: "/pricing" },
                  ].map((item) => (
                    <Link key={item.label} to={item.path} style={s.dropdownItem}>
                      <span style={s.dropdownItemIcon}>{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                  <div style={s.dropdownDivider} />
                  <button
                    style={{ ...s.dropdownItem, color: "var(--danger)" }}
                    onClick={() => { logout && logout(); showToast("Signed out", "info"); }}
                  >
                    <span style={s.dropdownItemIcon}>↩</span>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={s.content}>
          {children}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          ...s.toast,
          background: toast.type === "success" ? "rgba(34,197,94,0.18)" : "rgba(56,189,248,0.18)",
          borderColor: toast.type === "success" ? "rgba(34,197,94,0.3)" : "rgba(56,189,248,0.3)",
        }}>
          <span style={{ color: toast.type === "success" ? "#22c55e" : "#38bdf8" }}>
            {toast.type === "success" ? "✓" : "ℹ"}
          </span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const TRANSITION = "all 0.2s cubic-bezier(0.4,0,0.2,1)";

const s = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    background: "var(--bg)",
    fontFamily: "var(--font-sans)",
  },
  loadingScreen: {
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "100vh", background: "var(--bg)",
  },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid rgba(148,163,184,0.15)",
    borderTopColor: "#2563EB",
    animation: "spin 0.7s linear infinite",
  },

  // Sidebar
  sidebar: {
    position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
    display: "flex", flexDirection: "column",
    background: "rgba(8, 12, 22, 0.98)",
    borderRight: "1px solid rgba(148,163,184,0.1)",
    backdropFilter: "blur(20px)",
    transition: TRANSITION,
    overflow: "hidden",
  },
  brand: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "20px 16px 16px",
    borderBottom: "1px solid rgba(148,163,184,0.08)",
    flexShrink: 0,
  },
  brandLogo: {
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  brandName: {
    fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em",
    color: "var(--text)", whiteSpace: "nowrap",
  },
  collapseBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 28, height: 28, borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(148,163,184,0.06)",
    color: "var(--text-muted)",
    cursor: "pointer",
    margin: "8px auto",
    flexShrink: 0,
    transition: TRANSITION,
  },
  nav: {
    flex: 1, overflowY: "auto", padding: "4px 8px",
    display: "flex", flexDirection: "column", gap: 2,
  },
  navSection: {
    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
    color: "var(--text-muted)", textTransform: "uppercase",
    padding: "8px 8px 4px", marginTop: 4,
  },
  navItem: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 10px", borderRadius: 9,
    color: "var(--text-muted)", fontSize: 13, fontWeight: 500,
    textDecoration: "none", transition: TRANSITION, position: "relative",
    whiteSpace: "nowrap",
  },
  navItemActive: {
    background: "rgba(37,99,235,0.14)",
    color: "#93c5fd",
  },
  navIcon: { fontSize: 14, flexShrink: 0, width: 18, textAlign: "center" },
  navIconActive: { color: "#3b82f6" },
  navLabel: { flex: 1 },
  navDot: {
    width: 5, height: 5, borderRadius: "50%",
    background: "#3b82f6", flexShrink: 0,
  },
  sidebarFooter: {
    padding: "12px 12px 20px",
    borderTop: "1px solid rgba(148,163,184,0.08)",
    flexShrink: 0,
  },
  sidebarPlan: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 8,
    background: "rgba(148,163,184,0.06)",
    border: "1px solid rgba(148,163,184,0.1)",
    marginBottom: 8,
  },
  planBadge: {
    fontSize: 9, fontWeight: 800, padding: "2px 6px",
    borderRadius: 4, background: "rgba(148,163,184,0.14)",
    color: "var(--text-muted)", letterSpacing: "0.08em",
  },
  planText: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 },
  upgradeBtn: {
    display: "block", width: "100%", padding: "8px",
    borderRadius: 8, textAlign: "center", fontSize: 12, fontWeight: 700,
    background: "linear-gradient(135deg,#2563EB,#7c3aed)",
    color: "#fff", textDecoration: "none",
    transition: TRANSITION,
  },

  // Main area
  main: {
    flex: 1, display: "flex", flexDirection: "column",
    minHeight: "100vh", transition: TRANSITION,
  },

  // Topbar
  topbar: {
    position: "sticky", top: 0, zIndex: 40,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 28px", height: 60, flexShrink: 0,
    background: "rgba(5,8,22,0.88)",
    borderBottom: "1px solid rgba(148,163,184,0.08)",
    backdropFilter: "blur(20px)",
    gap: 16,
  },
  breadcrumbs: { display: "flex", alignItems: "center", gap: 0 },
  breadcrumbWrap: { display: "flex", alignItems: "center" },
  breadcrumbSep: { margin: "0 6px", color: "var(--text-muted)", fontSize: 13 },
  breadcrumb: { fontSize: 13, color: "var(--text-muted)", fontWeight: 500 },
  breadcrumbActive: { color: "var(--text)", fontWeight: 600 },

  topbarRight: { display: "flex", alignItems: "center", gap: 8 },
  searchWrap: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "7px 12px", borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(148,163,184,0.06)",
    width: 240,
  },
  searchIcon: { color: "var(--text-muted)", flexShrink: 0 },
  searchInput: {
    flex: 1, background: "transparent", border: "none",
    color: "var(--text)", fontSize: 13, outline: "none",
    padding: 0, width: "100%",
  },
  searchShortcut: {
    fontSize: 10, fontWeight: 600, padding: "2px 6px",
    borderRadius: 4, background: "rgba(148,163,184,0.1)",
    color: "var(--text-muted)", whiteSpace: "nowrap",
  },

  iconBtnWrap: { position: "relative" },
  iconBtn: {
    position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
    width: 36, height: 36, borderRadius: 9,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(148,163,184,0.06)",
    color: "var(--text-secondary)", cursor: "pointer",
    transition: TRANSITION,
  },
  notifDot: {
    position: "absolute", top: 7, right: 8,
    width: 7, height: 7, borderRadius: "50%",
    background: "#ef4444",
    border: "1.5px solid #050816",
  },
  mobileToggle: {
    display: "none",
    alignItems: "center", justifyContent: "center",
    width: 34, height: 34, borderRadius: 8,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(148,163,184,0.06)",
    color: "var(--text-secondary)", cursor: "pointer",
    flexShrink: 0,
  },
  avatarBtn: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "5px 10px 5px 5px", borderRadius: 9,
    border: "1px solid rgba(148,163,184,0.12)",
    background: "rgba(148,163,184,0.06)",
    color: "var(--text-secondary)", cursor: "pointer",
    transition: TRANSITION,
  },
  avatar: {
    width: 28, height: 28, borderRadius: 8,
    background: "linear-gradient(135deg,#2563EB,#7c3aed)",
    color: "#fff", fontSize: 11, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  // Dropdown
  dropdown: {
    position: "absolute", top: "calc(100% + 8px)",
    right: 0, minWidth: 240, zIndex: 200,
    background: "rgba(10,15,28,0.98)",
    border: "1px solid rgba(148,163,184,0.14)",
    borderRadius: 12,
    boxShadow: "0 24px 64px rgba(2,6,23,0.5)",
    backdropFilter: "blur(20px)",
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "12px 14px 8px",
    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "var(--text-muted)",
  },
  dropdownFooter: {
    padding: "10px 14px",
    fontSize: 12, color: "#3b82f6", fontWeight: 600,
    borderTop: "1px solid rgba(148,163,184,0.08)",
    cursor: "pointer",
    textAlign: "center",
  },
  dropdownItem: {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "9px 14px",
    background: "transparent", border: "none",
    color: "var(--text-secondary)", fontSize: 13, fontWeight: 500,
    cursor: "pointer", textAlign: "left",
    transition: TRANSITION,
  },
  dropdownItemIcon: { fontSize: 14, width: 18, textAlign: "center" },
  dropdownDivider: { height: 1, background: "rgba(148,163,184,0.08)", margin: "4px 0" },
  profileInfo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px",
  },
  profileAvatar: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: "linear-gradient(135deg,#2563EB,#7c3aed)",
    color: "#fff", fontSize: 13, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  profileName: { fontSize: 14, fontWeight: 700, color: "var(--text)" },
  profileEmail: { fontSize: 11, color: "var(--text-muted)", marginTop: 1 },
  notifItem: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "8px 14px", cursor: "pointer",
    transition: TRANSITION,
  },
  notifItemIcon: {
    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700,
  },
  notifItemBody: { flex: 1 },
  notifItemText: { fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 },
  notifItemTime: { fontSize: 11, color: "var(--text-muted)", marginTop: 2 },

  content: {
    flex: 1, padding: "28px 28px 48px",
    maxWidth: 1360, width: "100%", margin: "0 auto",
    boxSizing: "border-box",
  },

  // Toast
  toast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 9999,
    display: "flex", alignItems: "center", gap: 8,
    padding: "12px 18px", borderRadius: 10,
    border: "1px solid",
    backdropFilter: "blur(16px)",
    fontSize: 13, fontWeight: 500, color: "var(--text)",
    boxShadow: "0 8px 24px rgba(2,6,23,0.3)",
    animation: "slideUp 0.3s ease",
  },
};
