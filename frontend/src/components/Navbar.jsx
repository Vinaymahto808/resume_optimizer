import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoIcon}>{">"}_</span>
          <span style={styles.logoText}>Profile</span>
          <span style={styles.logoAccent}>Optimizer</span>
        </Link>
        <div style={styles.links}>
          <Link to="/pricing" style={styles.link}>Pricing</Link>
          <Link to="/templates" style={styles.link}>Templates</Link>
          {user ? (
            <>
              <Link to="/profile-analyzer" style={styles.link}>Analyzer</Link>
              <Link to="/job-recommender" style={styles.link}>Jobs</Link>
              <Link to="/ai-analysis" style={styles.link}>AI</Link>
              <Link to="/dashboard" style={styles.link}>Dashboard</Link>
              <Link to="/scan" className="btn-primary" style={styles.scanBtn}>Scan Resume</Link>
              <button onClick={handleLogout} className="btn-secondary" style={styles.logoutBtn}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.link}>Sign In</Link>
              <Link to="/signup" className="btn-primary" style={styles.signupBtn}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(10, 10, 26, 0.8)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: 64,
    padding: "0 24px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    textDecoration: "none",
  },
  logoIcon: {
    color: "var(--accent)",
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "monospace",
  },
  logoText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: 700,
  },
  logoAccent: {
    color: "var(--accent)",
    fontSize: 20,
    fontWeight: 700,
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },
  link: {
    color: "var(--text-secondary)",
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
    transition: "color 0.15s",
  },
  scanBtn: {
    fontSize: 13,
    padding: "8px 18px",
  },
  logoutBtn: {
    fontSize: 13,
    padding: "8px 16px",
  },
  signupBtn: {
    fontSize: 13,
    padding: "8px 18px",
  },
};
