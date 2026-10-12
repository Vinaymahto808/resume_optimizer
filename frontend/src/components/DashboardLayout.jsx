import { useState, useRef, useEffect } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../contexts/PlanContext";
import { career } from "../api";
import "./fx/fx.css";

const NAV_ITEMS = [
  { icon: "⊞", label: "Dashboard", path: "/dashboard" },
  { icon: "⬆", label: "Scan Resume", path: "/scan" },
  { icon: "✎", label: "Resume Editor", path: "/resume-editor" },
  { icon: "◉", label: "Job Match", path: "/jobs" },
  { icon: "☰", label: "Tracker", path: "/tracker" },
  { icon: "⚡", label: "Agent", path: "/agent" },
  { icon: "✦", label: "Sage Coach", path: "/coach" },
  { icon: "◈", label: "Templates", path: "/templates" },
  { icon: "◎", label: "Profile", path: "/profile-analyzer" },
  { icon: "▲", label: "AI Analysis", path: "/ai-analysis" },
  { icon: "↗", label: "Career Map", path: "/career-roadmap" },
  { icon: "◇", label: "Analytics", path: "/dashboard-analytics" },
];
const EMPLOYER_ITEMS = [{ icon: "⌂", label: "For Employers", path: "/recruiter" }];
const ADMIN_ITEMS = [{ icon: "⚙", label: "Admin", path: "/admin" }];

const BREADCRUMB_MAP = {
  "/dashboard": ["Dashboard"],
  "/scan": ["Dashboard", "Scan Resume"],
  "/ai-analysis": ["Dashboard", "AI Analysis"],
  "/templates": ["Dashboard", "Templates"],
  "/job-recommender": ["Dashboard", "Job Match"],
  "/profile-analyzer": ["Dashboard", "Profile Analyzer"],
  "/career-roadmap": ["Dashboard", "Career Roadmap"],
  "/dashboard-analytics": ["Dashboard", "Analytics"],
  "/resume-editor": ["Dashboard", "Resume Editor"],
  "/jobs": ["Dashboard", "AI Job Match"],
  "/tracker": ["Dashboard", "Application Tracker"],
  "/agent": ["Dashboard", "Background Agent"],
  "/coach": ["Dashboard", "Sage AI Coach"],
  "/recruiter": ["Dashboard", "For Employers"],
  "/admin": ["Dashboard", "Admin"],
  "/portfolio-generator": ["Dashboard", "Portfolio Generator"],
  "/student-resume": ["Dashboard", "Student Resume"],
  "/account": ["Dashboard", "Account Settings"],
};

export default function DashboardLayout({ children }) {
  const { user, loading, logout } = useAuth();
  const { plan, isPaid, isTurbo, careerPlan, openPaywall } = usePlan();
  const [notifs, setNotifs] = useState(null);
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

  // Close the mobile sidebar on navigation (adjust state during render instead of in an effect).
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setMobileSidebarOpen(false);
  }

  const loadNotifications = () => {
    Promise.allSettled([career.alertHits(), career.agentTasks("today")]).then(([hits, tasks]) => {
      const items = [];
      (hits.value?.hits || []).filter((h) => !h.seen).slice(0, 5).forEach((h) => items.push({
        icon: "◉", accent: "#0EA5E9", path: "/jobs",
        text: `New match: ${h.job.title} at ${h.job.company} (${h.match_score}%)`, time: h.created_at,
      }));
      (tasks.value?.tasks || []).filter((t) => t.status === "needs_review").slice(0, 5).forEach((t) => items.push({
        icon: "⚡", accent: "#f59e0b", path: "/agent",
        text: `Ready for review: ${t.job?.title || "application"} at ${t.job?.company || ""}`, time: t.updated_at,
      }));
      setNotifs(items);
    });
  };

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
    <div style={s.shell}>
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
              <rect width="22" height="22" rx="6" fill="var(--accent)" />
              <path d="M6 11h10M11 6v10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          {!collapsed && <span style={s.brandName}>ProfileOptimizer</span>}
        </div>

        {/* Collapse toggle */}
        <button className="dash-collapse-btn" style={s.collapseBtn} onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d={collapsed ? "M6 3l5 5-5 5" : "M10 3L5 8l5 5"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Nav */}
        <nav style={s.nav}>
          {!collapsed && <div style={s.navSection}>MAIN MENU</div>}
          {[...NAV_ITEMS, ...EMPLOYER_ITEMS, ...(user.is_admin ? ADMIN_ITEMS : [])].map((item) => {
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
              <span style={{
                ...s.planBadge,
                background: isPaid ? "rgba(13,148,136,0.12)" : "var(--border)",
                color: isPaid ? "var(--accent)" : "var(--text-muted)",
              }}>{isTurbo ? "TURBO" : plan.toUpperCase()}</span>
              <span style={s.planText}>
                {isTurbo ? "Unlimited AI" : careerPlan?.credits_limit != null
                  ? `${careerPlan.credits_remaining}/${careerPlan.credits_limit} AI credits today` : isPaid ? "Active" : "Upgrade to Turbo"}
              </span>
            </div>
            {!isPaid && <button type="button" onClick={() => openPaywall(null)} style={{ ...s.upgradeBtn, border: 0, cursor: "pointer", width: "100%" }}>Upgrade &rarr;</button>}
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="dash-main" style={{ ...s.main, marginLeft: collapsed ? 64 : 220 }}>
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
            <nav className="dash-breadcrumbs" style={s.breadcrumbs} aria-label="breadcrumb">
            {crumbs.map((crumb, i) => (
              <span key={i} className="dash-crumb" style={s.breadcrumbWrap}>
                {i > 0 && <span className="dash-crumb-sep" style={s.breadcrumbSep}>/</span>}
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
              <input style={s.searchInput} placeholder="Search resumes, jobs&hellip;" />
              <span style={s.searchShortcut}>&#8984;K</span>
            </div>

            {/* Notifications */}
            <div style={s.iconBtnWrap} ref={notifRef}>
              <button style={s.iconBtn} aria-label="Notifications" onClick={() => { if (!notifOpen) loadNotifications(); setNotifOpen(!notifOpen); }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1a5 5 0 00-5 5v2l-1.5 2.5h13L13 8V6a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6.5 13.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {notifs?.length > 0 && <span style={s.notifDot} />}
              </button>
              {notifOpen && (
                <div className="dash-dropdown" style={s.dropdown}>
                  <div style={s.dropdownHeader}>Notifications</div>
                  {notifs === null && <div style={s.notifItem}><div style={s.notifItemText}>Loading…</div></div>}
                  {notifs?.length === 0 && <div style={s.notifItem}><div style={s.notifItemText}>You're all caught up.</div></div>}
                  {(notifs || []).map((n, i) => (
                    <Link key={i} to={n.path} style={{ ...s.notifItem, textDecoration: "none" }} onClick={() => setNotifOpen(false)}>
                      <span style={{ ...s.notifItemIcon, background: n.accent + "16", color: n.accent }}>{n.icon}</span>
                      <div style={s.notifItemBody}>
                        <div style={s.notifItemText}>{n.text}</div>
                        <div style={s.notifItemTime}>{n.time ? new Date(n.time.endsWith("Z") ? n.time : `${n.time}Z`).toLocaleString() : ""}</div>
                      </div>
                    </Link>
                  ))}
                  <Link to="/agent" style={{ ...s.dropdownFooter, display: "block", textDecoration: "none" }} onClick={() => setNotifOpen(false)}>Open agent queue</Link>
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
                <div className="dash-dropdown" style={{ ...s.dropdown, right: 0, minWidth: 200 }}>
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
                    { icon: "◇", label: "Plan & billing", path: "/pricing" },
                    ...(user.is_admin ? [{ icon: "⚙", label: "Admin", path: "/admin" }] : []),
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
                    <span style={s.dropdownItemIcon}>&#8617;</span>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="dash-content" style={s.content}>
          {/* Keyed on the path so every page plays the entrance animation */}
          <div key={location.pathname} className="fx-page">{children}</div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          ...s.toast,
          background: toast.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(79,70,229,0.12)",
          borderColor: toast.type === "success" ? "rgba(16,185,129,0.2)" : "rgba(79,70,229,0.2)",
        }}>
          <span style={{ color: toast.type === "success" ? "var(--success)" : "var(--accent)" }}>
            {toast.type === "success" ? "&#10003;" : "&#8505;"}
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
    border: "3px solid var(--border)",
    borderTopColor: "var(--accent)",
    animation: "spin 0.7s linear infinite",
  },

  // Sidebar
  sidebar: {
    position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
    display: "flex", flexDirection: "column",
    background: "var(--bg-card)",
    borderRight: "1px solid var(--border)",
    transition: TRANSITION,
    overflow: "hidden",
  },
  brand: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "20px 16px 16px",
    borderBottom: "1px solid var(--border)",
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
    border: "1px solid var(--border)",
    background: "var(--bg-soft)",
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
    background: "var(--accent-soft)",
    color: "var(--accent)",
  },
  navIcon: { fontSize: 14, flexShrink: 0, width: 18, textAlign: "center" },
  navIconActive: { color: "var(--accent)" },
  navLabel: { flex: 1 },
  navDot: {
    width: 5, height: 5, borderRadius: "50%",
    background: "var(--accent)", flexShrink: 0,
  },
  sidebarFooter: {
    padding: "12px 12px 20px",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
  },
  sidebarPlan: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 10px", borderRadius: 8,
    background: "var(--bg-soft)",
    border: "1px solid var(--border)",
    marginBottom: 8,
  },
  planBadge: {
    fontSize: 9, fontWeight: 800, padding: "2px 6px",
    borderRadius: 4, background: "var(--border)",
    color: "var(--text-muted)", letterSpacing: "0.08em",
  },
  planText: { fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 },
  upgradeBtn: {
    display: "block", width: "100%", padding: "8px",
    borderRadius: 8, textAlign: "center", fontSize: 12, fontWeight: 700,
    background: "var(--accent-gradient)",
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
    background: "rgba(255,255,255,0.88)",
    borderBottom: "1px solid var(--border)",
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
    border: "1px solid var(--border)",
    background: "var(--bg-soft)",
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
    borderRadius: 4, background: "var(--bg-secondary)",
    color: "var(--text-muted)", whiteSpace: "nowrap",
  },

  iconBtnWrap: { position: "relative" },
  iconBtn: {
    position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
    width: 36, height: 36, borderRadius: 9,
    border: "1px solid var(--border)",
    background: "var(--bg-soft)",
    color: "var(--text-secondary)", cursor: "pointer",
    transition: TRANSITION,
  },
  notifDot: {
    position: "absolute", top: 7, right: 8,
    width: 7, height: 7, borderRadius: "50%",
    background: "#ef4444",
    border: "1.5px solid #fff",
  },
  mobileToggle: {
    display: "none",
    alignItems: "center", justifyContent: "center",
    width: 34, height: 34, borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg-soft)",
    color: "var(--text-secondary)", cursor: "pointer",
    flexShrink: 0,
  },
  avatarBtn: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "5px 10px 5px 5px", borderRadius: 9,
    border: "1px solid var(--border)",
    background: "var(--bg-soft)",
    color: "var(--text-secondary)", cursor: "pointer",
    transition: TRANSITION,
  },
  avatar: {
    width: 28, height: 28, borderRadius: 8,
    background: "var(--accent-gradient)",
    color: "#fff", fontSize: 11, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  // Dropdown
  dropdown: {
    position: "absolute", top: "calc(100% + 8px)",
    right: 0, minWidth: 240, zIndex: 200,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "var(--shadow-md)",
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "12px 14px 8px",
    fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
    textTransform: "uppercase", color: "var(--text-muted)",
  },
  dropdownFooter: {
    padding: "10px 14px",
    fontSize: 12, color: "var(--accent)", fontWeight: 600,
    borderTop: "1px solid var(--border)",
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
  dropdownDivider: { height: 1, background: "var(--border)", margin: "4px 0" },
  profileInfo: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px",
  },
  profileAvatar: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
    background: "var(--accent-gradient)",
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
    boxShadow: "var(--shadow-md)",
    animation: "slideUp 0.3s ease",
  },
};
