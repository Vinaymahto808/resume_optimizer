/* "Improve your resume" panel shown on scan results: fix the issues, match a job, edit inline, re-check instantly. */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { career, apiError, saveBlob } from "../../api";
import { usePlan } from "../../contexts/PlanContext";
import { Cost, ErrorNote, Field, Loading, Note, Pill, Spinner, Tabs } from "./ui";
import Editor from "./ResumeForm";
import TailorReview from "./TailorReview";

const LOW_SCORE = 70;
const tone = (n) => (n >= 80 ? "green" : n >= 60 ? "amber" : "red");
const color = (n) => (n >= 80 ? "#059669" : n >= 60 ? "var(--warning)" : "var(--danger)");

function ScoreTile({ label, value, suffix = "", delta }) {
  return (
    <div className="cp-stat" style={{ textAlign: "center" }}>
      <div className="cp-stat-value" style={{ color: color(value), fontSize: 24 }}>
        {value}{suffix}
        {delta ? <span style={{ fontSize: 13, marginLeft: 6, color: delta > 0 ? "#059669" : "var(--danger)" }}>{delta > 0 ? `+${delta}` : delta}</span> : null}
      </div>
      <div className="cp-stat-label">{label}</div>
    </div>
  );
}

/**
 * @param {number} initialScore  score from the uploaded scan (same scorer as the re-check)
 * @param {string} rawText       text extracted from the uploaded file (seeds the editor if it's empty)
 * @param {string[]} initialIssues suggestions from the scan, shown until the first re-check
 */
export default function ImproveResume({ initialScore, rawText, initialIssues = [] }) {
  const { refreshCareer } = usePlan();
  const low = initialScore < LOW_SCORE;
  const [open, setOpen] = useState(low);
  const [resume, setResume] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [job, setJob] = useState({ title: "", description: "" });
  const [check, setCheck] = useState(null);       // latest re-check result
  const [tailor, setTailor] = useState(null);
  const [tab, setTab] = useState("fix");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);

  // Load the structured resume; if the scan's copy hasn't reached the builder yet, parse it now.
  useEffect(() => {
    if (!open || resume) return;
    let cancelled = false;
    career.structuredResume()
      .then((r) => (r.source === "empty" && rawText?.trim().length > 50 ? career.parseResume({ text: rawText }, true) : r))
      .then((r) => !cancelled && setResume(r.resume))
      .catch((e) => !cancelled && setError(apiError(e)));
    return () => { cancelled = true; };
  }, [open, resume, rawText]);

  const set = (patch) => { setResume((r) => ({ ...r, ...patch })); setDirty(true); };
  const jobBody = () => (job.description.trim().length >= 30 ? { job_title: job.title.trim(), job_description: job.description.trim() } : {});

  const run = async (name, fn) => {
    setBusy(name);
    setError(null);
    try { await fn(); } catch (e) { setError(apiError(e)); } finally { setBusy(""); }
  };

  const saveAndRecheck = () => run("recheck", async () => {
    if (dirty) {
      const r = await career.saveStructuredResume(resume);
      setResume(r.resume);
      setDirty(false);
      refreshCareer();
    }
    setCheck(await career.recheck(jobBody()));
  });

  const addSkill = (skill) => {
    const groups = resume.skills.length ? resume.skills : [{ category: "Skills", items: [] }];
    if (groups.some((g) => g.items.some((i) => i.toLowerCase() === skill.toLowerCase()))) return;
    set({ skills: groups.map((g, i) => (i === 0 ? { ...g, items: [...g.items, skill] } : g)) });
  };

  const rewrite = () => run("tailor", async () => {
    if (dirty) { await career.saveStructuredResume(resume); setDirty(false); }
    const body = jobBody();
    setTailor(await career.tailor(body.job_description
      ? { job_description: body.job_description, title: body.job_title || "the role" }
      // No job given: rewrite against the resume's own headline + skills so bullets get stronger verbs and impact.
      : { job_description: `${resume.title || "Professional"}\n${resume.skills.flatMap((g) => g.items).join(", ")}\n${resume.summary}`, title: resume.title || "the role" }));
  });

  const score = check?.ats_score ?? initialScore;
  const delta = check ? check.ats_score - initialScore : 0;
  const issues = check ? check.issues : initialIssues.map((d, i) => ({ id: `s${i}`, label: d, detail: "" }));
  const match = check?.job_match;

  if (!open) {
    return (
      <div className="cp-card cp-between" style={{ marginBottom: 20 }}>
        <div>
          <div className="cp-eyebrow">Improve your resume</div>
          <p className="cp-small" style={{ margin: "4px 0 0" }}>Good score. Tailor it to a job to improve your match, or fine-tune it and re-check instantly.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>Improve & tailor</button>
      </div>
    );
  }

  return (
    <section className="cp-stack" style={{ marginBottom: 24 }} aria-label="Improve your resume">
      <div className="cp-card cp-stack" style={{ borderColor: low && !check ? "rgba(239,68,68,0.35)" : undefined }}>
        <div className="cp-between">
          <div>
            <div className="cp-eyebrow">Improve your resume</div>
            <h2 className="cp-title" style={{ fontSize: 19 }}>
              {check ? (delta > 0 ? `Score up ${delta} points` : "Re-checked") : low ? `Your ATS score is ${initialScore}. Let's fix it now.` : "Fine-tune and tailor"}
            </h2>
            <p className="cp-sub">Edit your resume right here, then re-check: you'll see the new score straight away.</p>
          </div>
          <div className="cp-row">
            {match && <ScoreTile label="Job match" value={match.score} suffix="%" />}
            <ScoreTile label={check ? "New ATS score" : "ATS score"} value={score} delta={delta} />
          </div>
        </div>
        <ErrorNote message={error} />
        <div className="cp-row">
          <button className="btn-primary" onClick={saveAndRecheck} disabled={busy !== "" || !resume}>
            {busy === "recheck" ? <Spinner /> : dirty ? "Save & re-check ATS" : "Re-check ATS"}
          </button>
          <button className="btn-secondary" disabled={busy !== "" || dirty}
            onClick={() => run("pdf", async () => saveBlob(await career.exportResume("pdf"), "resume.pdf"))}
            title={dirty ? "Save your changes first" : undefined}>
            {busy === "pdf" ? <Spinner /> : "Download PDF"}
          </button>
          <Link className="btn-secondary" to="/resume-editor">Open full editor</Link>
          {!low && <button className="cp-link" onClick={() => setOpen(false)}>Hide</button>}
        </div>
        {dirty && <span className="cp-muted">You have unsaved edits. Re-check saves them as the resume used for job matching.</span>}
      </div>

      <div className="cp-card cp-stack">
        <div className="cp-eyebrow">Check against a job (optional)</div>
        <div className="cp-grid-2">
          <Field label="Job title"><input maxLength={300} value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} placeholder="Data Analyst" /></Field>
          <div />
        </div>
        <Field label="Job description" hint="Paste the posting to see which skills it asks for that your resume doesn't show.">
          <textarea className="sr-textarea" rows={5} maxLength={50000} value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} />
        </Field>
        <button className="btn-secondary" style={{ alignSelf: "flex-start" }} disabled={busy !== "" || job.description.trim().length < 30 || !resume}
          onClick={saveAndRecheck}>{busy === "recheck" ? <Spinner /> : "Check match"}</button>
        {match && (
          <div className="cp-stack" style={{ gap: 10 }}>
            <div className="cp-row">
              <Pill tone={tone(match.score)}>{match.score}% match</Pill>
              <span className="cp-small">{match.matched.length} of {match.keywords_found} skills from this job are on your resume.</span>
            </div>
            {match.matched.length > 0 && <div className="cp-row">{match.matched.map((s) => <Pill key={s} tone="green">{s}</Pill>)}</div>}
            {match.missing.length > 0 && (
              <div className="cp-stack" style={{ gap: 6 }}>
                <span className="cp-label">Missing skills: add the ones you really have</span>
                <div className="cp-row">
                  {match.missing.map((s) => (
                    <button key={s} type="button" className="cp-pill cp-pill--amber" style={{ cursor: "pointer" }} onClick={() => addSkill(s)}
                      title="Adds it to your Skills section. Only add skills you've actually used.">+ {s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Tabs tabs={[{ id: "fix", label: `Fix issues${issues.length ? ` (${issues.length})` : ""}` }, { id: "edit", label: "Edit resume" }, { id: "ai", label: "AI rewrite" }]}
        value={tab} onChange={setTab} />

      {tab === "fix" && (
        <div className="cp-card cp-stack">
          {issues.length === 0 ? <Note tone="info">No issues left. Nice work.</Note> : issues.map((it) => (
            <div key={it.id} className="cp-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: "var(--text-heading)", fontSize: 14 }}>{it.label}</strong>
                {it.detail && <div className="cp-small">{it.detail}</div>}
              </div>
              <button className="btn-secondary cp-btn-sm" onClick={() => setTab("edit")}>Fix in editor</button>
            </div>
          ))}
          {check?.keywords_missing?.length > 0 && (
            <div className="cp-small">Common keywords for your field that aren't on your resume: {check.keywords_missing.join(", ")}.</div>
          )}
        </div>
      )}

      {tab === "edit" && (!resume ? <Loading /> : <Editor r={resume} set={set} />)}

      {tab === "ai" && (
        <div className="cp-stack">
          <div className="cp-card cp-stack">
            <p className="cp-small" style={{ margin: 0 }}>
              Rewrites your bullets with stronger verbs and clearer impact{job.description.trim().length >= 30 ? ", targeted at the job above" : ""}.
              It only uses experience already on your resume, and you accept or reject every change.
            </p>
            <button className="btn-primary" style={{ alignSelf: "flex-start" }} onClick={rewrite} disabled={busy !== "" || !resume}>
              {busy === "tailor" ? <Spinner /> : <>Rewrite my bullets<Cost /></>}
            </button>
          </div>
          {tailor && (
            <TailorReview key={tailor.tailored_resume} result={tailor}
              onSaved={(r) => { setResume(r); setDirty(false); refreshCareer(); career.recheck(jobBody()).then(setCheck).catch(() => {}); }} />
          )}
        </div>
      )}
    </section>
  );
}
