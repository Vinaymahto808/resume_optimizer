import { useState } from "react";
import { career, apiError } from "../../api";
import { ErrorNote, Note, Pill, Spinner } from "./ui";
import { applyTailoring } from "./format";


/** Review a tailoring result: accept/reject each rewritten bullet, then save into the structured resume. */
export default function TailorReview({ result, onSaved }) {
  const changed = result.bullets.map((b) => b.optimized !== b.original);
  const [accepted, setAccepted] = useState(changed);
  const [useSummary, setUseSummary] = useState(!!result.summary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { resume } = await career.structuredResume();
      const updated = applyTailoring(resume, result, accepted, useSummary);
      const r = await career.saveStructuredResume(updated);
      setSaved(true);
      onSaved?.(r.resume);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cp-stack">
      <div className="cp-row">
        <Pill tone="accent">Keyword coverage {result.match_before}% → {result.match_after}%</Pill>
        <Pill>{result.engine === "rules" ? "Rule-based rewrite" : "AI rewrite"}</Pill>
      </div>
      {result.missing_keywords?.length > 0 && (
        <Note tone="warn">
          Missing keywords: {result.missing_keywords.slice(0, 12).join(", ")}. Add them only if you've really used them.
        </Note>
      )}
      {result.summary && (
        <label className="cp-card cp-card-tight cp-check" style={{ alignItems: "flex-start" }}>
          <input type="checkbox" checked={useSummary} onChange={(e) => setUseSummary(e.target.checked)} />
          <span><strong>Summary</strong><br /><span className="cp-small">{result.summary}</span></span>
        </label>
      )}
      {result.bullets.map((b, i) => (
        <div key={i} className="cp-card cp-card-tight cp-stack" style={{ gap: 8, opacity: changed[i] ? 1 : 0.6 }}>
          <div className="cp-small" style={{ textDecoration: accepted[i] ? "line-through" : "none" }}>{b.original}</div>
          {changed[i] ? (
            <>
              <div style={{ fontSize: 14, color: "var(--text-heading)" }}>{b.optimized}</div>
              <div className="cp-between">
                <div className="cp-row">{(b.keywords || []).map((k) => <Pill key={k} tone="accent">{k}</Pill>)}</div>
                <div className="cp-row">
                  <button type="button" className={accepted[i] ? "btn-primary cp-btn-sm" : "btn-secondary cp-btn-sm"}
                    onClick={() => setAccepted((a) => a.map((v, j) => (j === i ? true : v)))}>Accept</button>
                  <button type="button" className={!accepted[i] ? "btn-primary cp-btn-sm" : "btn-secondary cp-btn-sm"}
                    onClick={() => setAccepted((a) => a.map((v, j) => (j === i ? false : v)))}>Reject</button>
                </div>
              </div>
            </>
          ) : <span className="cp-muted">Already strong, no change suggested.</span>}
        </div>
      ))}
      {result.notes?.length > 0 && <ul className="cp-small" style={{ margin: 0, paddingLeft: 18 }}>{result.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      <ErrorNote message={error} />
      {saved ? (
        <Note tone="info">Saved to your resume. It's now the version used for job matching.</Note>
      ) : (
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? <Spinner /> : `Save ${accepted.filter(Boolean).length} accepted change(s) to my resume`}
        </button>
      )}
    </div>
  );
}
