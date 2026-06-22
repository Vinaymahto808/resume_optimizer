import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthShell from "../components/AuthShell";

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Returning user"
      title="Welcome back to the resume desk."
      subtitle="Pick up where you left off: scan history, job matches, and AI suggestions all stay in one workspace."
      metrics={[
        { value: "19", label: "ATS checks" },
        { value: "1", label: "Workspace" },
        { value: "0", label: "Extra clutter" },
      ]}
      bullets={[
        "Saved scans and recommendations are tied to your account.",
        "Resume edits, job matches, and profile analysis stay in sync.",
        "You can jump back into scans without rebuilding anything.",
      ]}
    >
      <form onSubmit={handleSubmit} className="ui-card" style={styles.card}>
        <Link to="/" style={styles.logo}>
          <span style={styles.logoText}>Profile</span>
          <span style={styles.logoAccent}>Optimizer</span>
        </Link>
        <h2 style={styles.title}>Sign in</h2>
        <p style={styles.subtitle}>Use your email and password to continue.</p>

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
        <button className="btn-primary" style={styles.btn} type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
        <p style={styles.forgotLink}>
          <Link to="/forgot-password" style={styles.link}>
            Forgot password?
          </Link>
        </p>
        <p style={styles.footer}>
          Don't have an account?{" "}
          <Link to="/signup" style={styles.link}>
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

const styles = {
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 460,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: 22,
    padding: "36px 34px",
    textAlign: "left",
  },
  logo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 20,
    textDecoration: "none",
    fontFamily: "var(--font-display)",
  },
  logoAccent: { color: "var(--accent)" },
  logoText: { color: "var(--text)" },
  title: { fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700, marginBottom: 6, lineHeight: 1.05 },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.7 },
  error: {
    color: "var(--danger)",
    fontSize: 13,
    marginBottom: 16,
    padding: "8px 12px",
    background: "rgba(248,113,113,0.1)",
    borderRadius: "var(--radius-sm)",
  },
  input: { marginBottom: 14 },
  btn: { width: "100%", marginTop: 6 },
  forgotLink: { fontSize: 13, marginTop: 12, marginBottom: 0 },
  footer: { fontSize: 13, color: "var(--text-secondary)", marginTop: 20 },
  link: { color: "var(--accent)", fontWeight: 500 },
};
