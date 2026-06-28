import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { auth } from "../api";
import AuthShell from "../components/AuthShell";

function getError(err) {
  if (err?.response?.data?.detail) return err.response.data.detail;
  if (err?.message?.includes("Network Error")) return "Server unreachable. Make sure the backend is running.";
  return "Something went wrong. Please try again.";
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devLink, setDevLink] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await auth.forgotPassword(email);
      setSent(true);
      if (res.dev_link) setDevLink(res.dev_link);
      startCooldown();
    } catch (err) {
      setError(getError(err));
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await auth.forgotPassword(email);
      if (res.dev_link) setDevLink(res.dev_link);
      startCooldown();
    } catch (err) {
      setError(getError(err));
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <AuthShell
        eyebrow="Email sent"
        title="Check your inbox."
        subtitle={`If an account with ${email || "that email"} exists, you'll receive a reset link shortly.`}
        metrics={[
          { value: "60s", label: "cooldown" },
          { value: "Secure", label: "link" },
          { value: "Email", label: "delivery" },
        ]}
        bullets={[
          "Look for a reset email, then follow the link to set a new password.",
          "If you don’t see it, check spam or promotions before trying again.",
          "We only send a link when the email matches an existing account.",
        ]}
      >
        <div className="ui-card" style={styles.card}>
          <Link to="/" style={styles.logo}>
            <span style={{ color: "var(--text)" }}>Profile</span>
            <span style={styles.logoAccent}>Optimizer</span>
          </Link>
          <h2 style={styles.title}>Reset link sent</h2>
          <p style={styles.subtitle}>
            If an account with <strong>{email}</strong> exists, you'll receive a reset link shortly.
          </p>
          {devLink ? (
            <p style={styles.devLink}>
              No email service configured. Use this link instead:<br />
              <a href={devLink} style={styles.devLinkAnchor}>{devLink}</a>
            </p>
          ) : (
            <p style={styles.spamHint}>Don't see it? Check your spam folder.</p>
          )}
          {cooldown > 0 ? (
            <p style={styles.cooldown}>Resend in {cooldown}s</p>
          ) : (
            <button
              className="btn-primary"
              style={{ ...styles.btn, marginTop: 12 }}
              onClick={handleResend}
              disabled={loading}
            >
              {loading ? "Sending..." : "Resend email"}
            </button>
          )}
          {error && <p style={styles.error}>{error}</p>}
          <Link to="/login" style={styles.footerLink}>Back to login</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password."
      subtitle="Enter the email tied to your account and we’ll send a secure reset link."
      metrics={[
        { value: "Secure", label: "reset" },
        { value: "1", label: "email" },
        { value: "0", label: "guesswork" },
      ]}
      bullets={[
        "This keeps access simple without interrupting your scan history.",
        "You can request a new link if the first one expires.",
        "The reset is fast, private, and tied to your account email.",
      ]}
    >
      <form onSubmit={handleSubmit} className="ui-card" style={styles.card}>
        <Link to="/" style={styles.logo}>
          <span style={{ color: "var(--text)" }}>Profile</span>
          <span style={styles.logoAccent}>Optimizer</span>
        </Link>
        <h2 style={styles.title}>Reset password</h2>
        <p style={styles.subtitle}>Enter your email to receive a reset link</p>

        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button className="btn-primary" style={styles.btn} type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        <Link to="/login" style={styles.footerLink}>Back to login</Link>
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
  footerLink: {
    display: "inline-block",
    marginTop: 20,
    fontSize: 14,
    color: "var(--accent)",
    fontWeight: 600,
    textDecoration: "none",
  },
  spamHint: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 8,
  },
  cooldown: {
    fontSize: 13,
    color: "var(--text-muted)",
    marginTop: 12,
    fontWeight: 500,
  },
  devLink: {
    fontSize: 12,
    color: "var(--text-secondary)",
    marginTop: 12,
    padding: "8px 10px",
    background: "rgba(16,185,129,0.08)",
    borderRadius: "var(--radius-sm)",
    lineHeight: 1.6,
    wordBreak: "break-all",
  },
  devLinkAnchor: {
    color: "var(--accent)",
    fontWeight: 500,
    textDecoration: "underline",
  },
};
