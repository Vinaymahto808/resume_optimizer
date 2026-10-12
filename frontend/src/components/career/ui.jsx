/* Shared building blocks for the career copilot pages, styled with the app's design tokens. */
import { Fragment, useEffect, useState } from "react";
import "./career.css";

export function Spinner({ large = false }) {
  return <span className={`cp-spinner${large ? " cp-spinner--lg" : ""}`} role="status" aria-label="Loading" />;
}

export function Loading({ label }) {
  return (
    <div className="cp-center" style={{ flexDirection: "column", gap: 10 }}>
      <Spinner large />
      {label && <span className="cp-muted">{label}</span>}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return <div className="cp-note cp-note--error" role="alert">{message}</div>;
}

export function Note({ tone = "info", children }) {
  return <div className={`cp-note cp-note--${tone}`}>{children}</div>;
}

export function Pill({ tone = "slate", children, title }) {
  return <span className={`cp-pill cp-pill--${tone}`} title={title}>{children}</span>;
}

/** Shows what an AI action costs on the Free plan (Turbo is unlimited). */
export function Cost({ credits = 1 }) {
  return <span className="cp-cost" title="AI credits used on the Free plan">⚡{credits}</span>;
}


export function MatchRing({ score = 0, size = 56, label }) {
  const stroke = size > 60 ? 6 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "#059669" : score >= 60 ? "var(--accent)" : score >= 45 ? "var(--warning)" : "var(--text-muted)";
  return (
    <div className="cp-ring" style={{ width: size, height: size, marginBottom: label ? 16 : 0 }} aria-label={`${score}% match`}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-soft)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * Math.max(0, Math.min(100, score))) / 100} />
      </svg>
      <div className="cp-ring-label">
        <span style={{ fontSize: size > 60 ? 18 : 13 }}>{score}%</span>
      </div>
      {label && (
        <div style={{ position: "absolute", top: size + 4, left: -12, right: -12, textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
          {label}
        </div>
      )}
    </div>
  );
}

export function Bar({ label, value }) {
  return (
    <div>
      <div className="cp-between" style={{ fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <strong style={{ color: "var(--text-heading)" }}>{Math.round(value)}%</strong>
      </div>
      <div className="cp-bar"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
    </div>
  );
}

export function Modal({ title, onClose, wide = false, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="cp-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`cp-modal${wide ? " cp-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="cp-modal-head">
          <h3 className="cp-modal-title">{title}</h3>
          <button className="cp-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="cp-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="cp-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cp-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="cp-modal-head">
          <h3 className="cp-modal-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</h3>
          <button className="cp-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="cp-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="cp-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`cp-tab${value === t.id ? " cp-tab--active" : ""}`}
          onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-secondary cp-btn-sm"
      onClick={() => navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}>
      {done ? "Copied" : label}
    </button>
  );
}


export function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block" }}>
      <span className="cp-label">{label}</span>
      {children}
      {hint && <span className="cp-muted" style={{ display: "block", marginTop: 3 }}>{hint}</span>}
    </label>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="cp-card" style={{ textAlign: "center", padding: "36px 20px" }}>
      <p style={{ fontWeight: 700, color: "var(--text-heading)", margin: "0 0 6px" }}>{title}</p>
      {children && <p className="cp-small" style={{ margin: "0 0 14px" }}>{children}</p>}
      {action}
    </div>
  );
}

const ITEM = /^\s*([-*•]|\d+\.)\s+/;

function inline(text, key) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <Fragment key={key}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong>
          : p.startsWith("`") && p.endsWith("`") ? <code key={i}>{p.slice(1, -1)}</code>
            : <Fragment key={i}>{p}</Fragment>)}
    </Fragment>
  );
}

/** Minimal, safe markdown (bold, code, lists, paragraphs) for Sage coach replies. No HTML is injected. */
export function Markdown({ text = "" }) {
  return (
    <div className="cp-md">
      {text.split(/\n{2,}/).map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => ITEM.test(l))) {
          const Tag = /^\s*\d+\./.test(lines[0]) ? "ol" : "ul";
          return <Tag key={bi}>{lines.map((l, li) => <li key={li}>{inline(l.replace(ITEM, ""), li)}</li>)}</Tag>;
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {ITEM.test(l) ? <>• {inline(l.replace(ITEM, ""), li)}</> : inline(l, li)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
