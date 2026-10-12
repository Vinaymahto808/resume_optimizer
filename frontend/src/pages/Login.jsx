import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { nextPath } from "../lib/nextPath";
import { useAuth } from "../contexts/AuthContext";
import { authError } from "../api";
import AuthShell from "../components/AuthShell";
import { AuthCard, AuthNote, PasswordField } from "../components/auth/AuthParts";
import SEO from "../components/SEO";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const after = nextPath(search);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(after, { replace: true });
  }, [user, navigate, after]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(after);
    } catch (err) {
      setError(authError(err, "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <SEO
        title="Log In"
        description="Sign in to your ProfileOptimizer account to access your resume scans, AI analysis, and career tools."
        canonical="https://www.profileotimizer.online/login"
      />
      <AuthCard
        title="Welcome back"
        subtitle="Sign in to your account to continue."
        footer={<>Don't have an account? <Link to={`/signup${search}`}>Create one for free</Link></>}
      >
        <AuthNote>{error}</AuthNote>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <PasswordField
            id="password"
            label="Password"
            value={form.password}
            onChange={(password) => setForm({ ...form, password })}
            autoComplete="current-password"
            placeholder="Your password"
            aside={<Link to="/forgot-password" className="auth-aside-link">Forgot password?</Link>}
          />
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
