import { useState, useEffect } from "react";
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
  const { user, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const issues = validatePassword(form.password);
    if (issues.length) {
      setError("Password must include " + issues.join(", ") + ".");
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="auth-card">
        <Link to="/" className="auth-brand" style={{ textDecoration: "none" }}>
          <div className="auth-brand-dot">P</div>
          <span className="auth-brand-name">ProfileOptimizer</span>
        </Link>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Set up your profile in a minute or two.</p>

        {error && (
          <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "var(--danger-soft)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              className="auth-input"
              placeholder="Jane Smith"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="auth-input"
              type="password"
              placeholder="Min 12 chars, upper + lower + number + special"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={MIN}
            />
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer-links">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
