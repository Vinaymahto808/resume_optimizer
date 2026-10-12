import { useState } from "react";
import { Link } from "react-router-dom";
import { PASSWORD_RULES } from "../../lib/passwordRules";

/** The card every auth page uses: brand, heading, optional subtitle, then the page's content. */
export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-card">
      <Link to="/" className="auth-brand" style={{ textDecoration: "none" }}>
        <div className="auth-brand-dot">P</div>
        <span className="auth-brand-name">ProfileOptimizer</span>
      </Link>
      <h1 className="auth-title">{title}</h1>
      {subtitle && <p className="auth-subtitle">{subtitle}</p>}
      {children}
      {footer && <p className="auth-footer-links">{footer}</p>}
    </div>
  );
}

export function AuthNote({ tone = "error", children }) {
  if (!children) return null;
  return <div className={`auth-note auth-note--${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder, aside, invalid }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="auth-field">
      <div className="auth-label-row">
        <label className="auth-label" htmlFor={id}>{label}</label>
        {aside}
      </div>
      <div className="auth-password">
        <input
          id={id}
          className="auth-input"
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          required
        />
        <button type="button" className="auth-reveal" onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}>
          {shown ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

/** Live checklist under a new-password field. */
export function PasswordRules({ password }) {
  return (
    <ul className="auth-rules" aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = password.length > 0 && r.test(password);
        return <li key={r.id} className={ok ? "is-ok" : ""}>{ok ? "✓" : "•"} {r.label}</li>;
      })}
    </ul>
  );
}
