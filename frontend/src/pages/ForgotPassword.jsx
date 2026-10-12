import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { auth, authError } from "../api";
import AuthShell from "../components/AuthShell";
import { AuthCard, AuthNote } from "../components/auth/AuthParts";
import SEO from "../components/SEO";

const COOLDOWN = 60;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devLink, setDevLink] = useState("");
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const startCooldown = () => {
    clearInterval(timerRef.current);
    setCooldown(COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const send = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.forgotPassword(email.trim());
      setSent(true);
      setDevLink(res.dev_link || "");
      startCooldown();
    } catch (err) {
      setError(authError(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <SEO title="Reset Password" description="Reset your ProfileOptimizer account password." canonical="https://www.profileotimizer.online/forgot-password" />
      {sent ? (
        <AuthCard
          title="Check your inbox"
          subtitle={<>If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.</>}
          footer={<Link to="/login">Back to sign in</Link>}
        >
          {devLink ? (
            <AuthNote tone="info">
              No email service is configured on this server, so here is the link:{" "}
              <a href={devLink} className="auth-break">{devLink}</a>
            </AuthNote>
          ) : (
            <AuthNote tone="info">The link expires after a while. Don't see the email? Check spam or promotions.</AuthNote>
          )}
          <AuthNote>{error}</AuthNote>
          <button className="auth-btn auth-btn--ghost" type="button" onClick={() => send()} disabled={loading || cooldown > 0}>
            {loading ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
          </button>
          <button className="auth-text-btn" type="button" onClick={() => { setSent(false); setError(""); }}>
            Use a different email
          </button>
        </AuthCard>
      ) : (
        <AuthCard
          title="Forgot your password?"
          subtitle="Enter the email you signed up with and we'll send you a reset link."
          footer={<>Remembered it? <Link to="/login">Back to sign in</Link></>}
        >
          <AuthNote>{error}</AuthNote>
          <form onSubmit={send}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email address</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </AuthCard>
      )}
    </AuthShell>
  );
}
