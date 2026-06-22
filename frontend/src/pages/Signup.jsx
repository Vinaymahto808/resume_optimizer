import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AuthShell from "../components/AuthShell";

const MIN = 12;

function validatePassword(pw) {
  const checks = [];
  if (pw.length < MIN) checks.push(`at least ${MIN} characters`);
  if (!/[A-Z]/.test(pw)) checks.push("an uppercase letter");
  if (!/[a-z]/.test(pw)) checks.push("a lowercase letter");
  if (!/[0-9]/.test(pw)) checks.push("a number");
  if (!/[^A-Za-z0-9]/.test(pw)) checks.push("a special character");
  if (/\s/.test(pw)) checks.push("no spaces");
  return checks;
}

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const issues = validatePassword(form.password);
    if (issues.length) {
      setError("Password must include " + issues.join(", ") + ".");
      return;
    }
    try {
      await register(form.email, form.password, form.full_name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    }
  };

  return (
    <AuthShell
      eyebrow="New account"
      title="Create a workspace for better applications."
      subtitle="Start with a free scan, then move into keyword analysis, template matching, and AI-assisted rewrites."
      metrics={[
        { value: "Free", label: "first scan" },
        { value: "19", label: "checks" },
        { value: "1", label: "login" },
      ]}
      bullets={[
        "Resume scans, profile insights, and job recommendations live in one account.",
        "You’ll get cleaner ATS feedback without needing a separate tool for every step.",
        "Upgrade later only if you want AI rewrites and deeper analysis.",
      ]}
    >
      <form onSubmit={handleSubmit} className="ui-card" style={styles.card}>
        <Link to="/" style={styles.logo}>
          <span style={{ color: "var(--text)" }}>Profile</span>
          <span style={styles.logoAccent}>Optimizer</span>
        </Link>
        <h2 style={styles.title}>Create account</h2>
        <p style={styles.subtitle}>Set up your profile in a minute or two.</p>

        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          placeholder="Full name"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        />
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
          placeholder="Password (min 12 chars, upper+lower+number+special)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={MIN}
        />
        <button className="btn-primary" style={styles.btn} type="submit">
          Create Account
        </button>
        <p style={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Sign in
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
  footer: { fontSize: 13, color: "var(--text-secondary)", marginTop: 20 },
  link: { color: "var(--accent)", fontWeight: 500 },
};
