import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { careerAdmin, apiError } from "../api";
import AuthShell from "../components/AuthShell";
import { AuthCard, AuthNote, PasswordField } from "../components/auth/AuthParts";
import SEO from "../components/SEO";
import { getAdminToken, setAdminToken } from "../lib/adminSession";

/** Admin console sign-in: its own username and password (backend ADMIN_USERNAME / ADMIN_PASSWORD_HASH),
 *  separate from user accounts. The returned session token lasts 12 hours. */
export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadySignedIn] = useState(() => Boolean(getAdminToken()));

  if (alreadySignedIn) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await careerAdmin.login(form.username.trim(), form.password);
      setAdminToken(token);
      navigate("/admin", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      setError(status === 401 ? "Wrong username or password."
        : status === 429 || status === 503 ? apiError(err)
          : apiError(err, "Couldn't sign in. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <SEO title="Admin sign in" description="Admin console sign in" />
      <AuthCard title="Admin sign in" subtitle="For the site owner. User accounts can't open the admin console."
        footer={<Link to="/">Back to the site</Link>}>
        <AuthNote>{error}</AuthNote>
        <form onSubmit={submit}>
          <div className="auth-field">
            <label className="auth-label" htmlFor="admin-username">Username</label>
            <input id="admin-username" className="auth-input" autoComplete="username" autoCapitalize="none"
              spellCheck={false} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <PasswordField id="admin-password" label="Password" value={form.password}
            onChange={(password) => setForm({ ...form, password })} autoComplete="current-password" placeholder="Admin password" />
          <button className="auth-btn" type="submit" disabled={loading || !form.username.trim() || !form.password}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </AuthCard>
    </AuthShell>
  );
}
