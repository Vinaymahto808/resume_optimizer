import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { auth } from "../api";
import AuthShell from "../components/AuthShell";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await auth.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired reset link");
    }
  };

  if (!token) {
    return (
      <AuthShell
        eyebrow="Reset link"
        title="This link looks invalid."
        subtitle="The reset token is missing or expired. Request a fresh link and try again."
        metrics={[
          { value: "Expired", label: "link" },
          { value: "New", label: "request" },
          { value: "Secure", label: "flow" },
        ]}
        bullets={[
          "Reset links expire for safety, so requesting a new one is the fastest fix.",
          "You can keep using the same account email when you ask again.",
          "Once the link lands, you’ll be able to set a new password right away.",
        ]}
      >
        <div className="ui-card" style={styles.card}>
          <h2 style={styles.title}>Invalid link</h2>
          <p style={styles.subtitle}>This reset link is missing or invalid.</p>
          <Link to="/forgot-password" style={styles.link}>Request a new one</Link>
        </div>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Password updated"
        title="All set."
        subtitle="Your password has been changed. We’re taking you back to sign in now."
        metrics={[
          { value: "Done", label: "update" },
          { value: "Next", label: "login" },
          { value: "Safe", label: "account" },
        ]}
        bullets={[
          "You can sign in again using the new password you just created.",
          "If you get locked out later, the recovery flow is still available.",
          "Your scan history and saved work stay tied to the same account.",
        ]}
      >
        <div className="ui-card" style={styles.card}>
          <h2 style={styles.title}>Password reset!</h2>
          <p style={styles.subtitle}>Redirecting you to login...</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Choose a new password"
      title="Set a fresh password."
      subtitle="Use a strong password you’ll remember, then return to your resume workspace."
      metrics={[
        { value: "12+", label: "chars" },
        { value: "One", label: "reset" },
        { value: "Secure", label: "flow" },
      ]}
      bullets={[
        "Pick something unique that you haven’t reused on other sites.",
        "Once you save it, you’ll be sent back to sign in.",
        "Your account data remains untouched during the reset.",
      ]}
    >
      <form onSubmit={handleSubmit} className="ui-card" style={styles.card}>
        <h2 style={styles.title}>Set new password</h2>
        <p style={styles.subtitle}>Enter your new password below</p>

        {error && <p style={styles.error}>{error}</p>}

        <input
          style={styles.input}
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={12}
        />
        <button className="btn-primary" style={styles.btn} type="submit">
          Reset Password
        </button>
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
  link: { color: "var(--accent)", fontWeight: 500 },
};
