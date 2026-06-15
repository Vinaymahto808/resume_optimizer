import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <form onSubmit={handleSubmit} style={styles.card}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoIcon}>{">"}_</span>
          <span>ats</span>
          <span style={styles.logoAccent}>.check</span>
        </Link>
        <h2 style={styles.title}>Welcome back</h2>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button className="btn-primary" style={styles.btn} type="submit">
          Sign In
        </button>
        <p style={styles.footer}>
          Don't have an account?{" "}
          <Link to="/signup" style={styles.link}>
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 64px)",
    padding: "24px",
    position: "relative",
  },
  bgGlow: {
    position: "absolute",
    top: "30%",
    left: "50%",
    width: 400,
    height: 400,
    background:
      "radial-gradient(circle, rgba(79,125,255,0.08) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 400,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "40px 32px",
    textAlign: "center",
  },
  logo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 24,
    textDecoration: "none",
  },
  logoIcon: { color: "var(--accent)", fontFamily: "monospace" },
  logoAccent: { color: "var(--accent)" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 28 },
  error: {
    color: "var(--danger)",
    fontSize: 13,
    marginBottom: 16,
    padding: "8px 12px",
    background: "rgba(248,113,113,0.1)",
    borderRadius: "var(--radius-sm)",
  },
  input: { marginBottom: 14 },
  btn: { width: "100%", marginTop: 4 },
  footer: { fontSize: 13, color: "var(--text-secondary)", marginTop: 20 },
  link: { color: "var(--accent)", fontWeight: 500 },
};
