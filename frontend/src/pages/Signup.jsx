import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { nextPath } from "../lib/nextPath";
import { useAuth } from "../contexts/AuthContext";
import { authError } from "../api";
import AuthShell from "../components/AuthShell";
import { AuthCard, AuthNote, PasswordField, PasswordRules } from "../components/auth/AuthParts";
import { passwordProblems } from "../lib/passwordRules";
import SEO from "../components/SEO";

export default function Signup() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const after = nextPath(search);

  useEffect(() => {
    if (user) navigate(after, { replace: true });
  }, [user, navigate, after]);

  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const issues = passwordProblems(form.password);
    if (issues.length) {
      setError("Password needs: " + issues.join(", ") + ".");
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name.trim());
      navigate(after);
    } catch (err) {
      setError(authError(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <SEO
        title="Create a Free Account"
        description="Sign up for free to scan your resume, get AI-powered suggestions, and unlock career opportunities."
        canonical="https://www.profileotimizer.online/signup"
      />
      <AuthCard
        title="Create account"
        subtitle="Set up your profile in a minute or two."
        footer={<>Already have an account? <Link to={`/login${search}`}>Sign in</Link></>}
      >
        <AuthNote>{error}</AuthNote>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              className="auth-input"
              autoComplete="name"
              placeholder="Jane Smith"
              maxLength={120}
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
            autoComplete="new-password"
            placeholder="Create a password"
          />
          <PasswordRules password={form.password} />
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
