import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { auth, authError } from "../api";
import AuthShell from "../components/AuthShell";
import { AuthCard, AuthNote, PasswordField, PasswordRules } from "../components/auth/AuthParts";
import { passwordProblems } from "../lib/passwordRules";
import SEO from "../components/SEO";

const REDIRECT_SECONDS = 3;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => navigate("/login"), REDIRECT_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [success, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const issues = passwordProblems(password);
    if (issues.length) {
      setError("Password needs: " + issues.join(", ") + ".");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(authError(err, "This reset link is invalid or has expired. Request a new one."));
    } finally {
      setLoading(false);
    }
  };

  let card;
  if (!token) {
    card = (
      <AuthCard title="Reset link not valid" subtitle="This link is missing its reset code. Links can also expire, so request a fresh one."
        footer={<Link to="/login">Back to sign in</Link>}>
        <Link to="/forgot-password" className="auth-btn auth-btn--link">Request a new link</Link>
      </AuthCard>
    );
  } else if (success) {
    card = (
      <AuthCard title="Password updated" subtitle="You can now sign in with your new password.">
        <AuthNote tone="success">Taking you to sign in in {REDIRECT_SECONDS} seconds…</AuthNote>
        <Link to="/login" className="auth-btn auth-btn--link">Sign in now</Link>
      </AuthCard>
    );
  } else {
    const mismatch = confirm.length > 0 && confirm !== password;
    card = (
      <AuthCard title="Set a new password" subtitle="Choose a password you haven't used on other sites."
        footer={<Link to="/login">Back to sign in</Link>}>
        <AuthNote>{error}</AuthNote>
        {error && /expired|invalid/i.test(error) && (
          <p className="auth-inline-help"><Link to="/forgot-password">Request a new reset link</Link></p>
        )}
        <form onSubmit={handleSubmit}>
          <PasswordField id="new-password" label="New password" value={password} onChange={setPassword}
            autoComplete="new-password" placeholder="Create a password" />
          <PasswordRules password={password} />
          <PasswordField id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm}
            autoComplete="new-password" placeholder="Type it again" invalid={mismatch} />
          {mismatch && <p className="auth-field-error">Passwords don't match yet.</p>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save new password"}
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthShell>
      <SEO title="Set New Password" description="Choose a new password for your ProfileOptimizer account." canonical="https://www.profileotimizer.online/reset-password" />
      {card}
    </AuthShell>
  );
}
