import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { career, apiError, saveBlob } from "../api";
import { usePlan } from "../contexts/PlanContext";
import { useResume } from "../contexts/ResumeContext";
import { Cost, ErrorNote, Field, Loading, Note, Spinner, Tabs } from "../components/career/ui";
import TailorReview from "../components/career/TailorReview";
import Editor from "../components/career/ResumeForm";

function TailorTab({ onSaved }) {
  const [apps, setApps] = useState(null);
  const [jobId, setJobId] = useState("");
  const [jd, setJd] = useState({ title: "", company: "", job_description: "" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    career.applications().then((r) => {
      const saved = r.applications.filter((a) => a.job_id);
      setApps(saved);
      if (saved[0]) setJobId(saved[0].job_id);
    }).catch(() => setApps([]));
  }, []);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await career.tailor(jobId ? { job_id: jobId } : jd));
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!apps) return <Loading />;
  return (
    <div className="cp-stack">
      <div className="cp-card cp-stack">
        <Field label="Tailor to">
          <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
            {apps.map((a) => <option key={a.id} value={a.job_id}>{a.role} · {a.company}</option>)}
            <option value="">Paste a job description</option>
          </select>
        </Field>
        {!jobId && (
          <>
            <div className="cp-grid-2">
              <Field label="Job title"><input maxLength={300} value={jd.title} onChange={(e) => setJd({ ...jd, title: e.target.value })} /></Field>
              <Field label="Company"><input maxLength={200} value={jd.company} onChange={(e) => setJd({ ...jd, company: e.target.value })} /></Field>
            </div>
            <Field label="Job description"><textarea className="sr-textarea" rows={8} maxLength={50000} value={jd.job_description}
              onChange={(e) => setJd({ ...jd, job_description: e.target.value })} /></Field>
          </>
        )}
        <p className="cp-muted" style={{ margin: 0 }}>Rewrites use only experience already on your resume. You accept or reject every change.</p>
        <ErrorNote message={error} />
        <button className="btn-primary" onClick={run} style={{ alignSelf: "flex-start" }}
          disabled={busy || (!jobId && jd.job_description.trim().length < 30)}>{busy ? <Spinner /> : <>Tailor my resume<Cost /></>}</button>
      </div>
      {result && <TailorReview key={result.tailored_resume} result={result} onSaved={onSaved} />}
    </div>
  );
}

export default function ResumeEditor() {
  const { refreshCareer } = usePlan();
  const { updateResumeText } = useResume();
  const [resume, setResume] = useState(null);
  const [source, setSource] = useState("");
  const [tab, setTab] = useState("edit");
  const [saveState, setSaveState] = useState("idle");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(null);
  const saved = useRef(null);
  const fileRef = useRef(null);

  const load = (r) => {
    saved.current = r.source === "saved" ? JSON.stringify(r.resume) : "";
    setSource(r.source);
    setResume(r.resume);
  };

  useEffect(() => {
    career.structuredResume().then(load).catch((e) => setError(apiError(e)));
  }, []);

  // Debounced autosave; each save also becomes the resume used for job matching.
  useEffect(() => {
    if (!resume || saved.current === null) return;
    const json = JSON.stringify(resume);
    if (json === saved.current) return;
    const timer = setTimeout(() => {
      setSaveState("saving");
      career.saveStructuredResume(resume)
        .then(() => {
          saved.current = json;
          setSaveState("saved");
          setSource("saved");
          refreshCareer();
        })
        .catch(() => setSaveState("error"));
    }, 1200);
    return () => clearTimeout(timer);
  }, [resume, refreshCareer]);

  const set = (patch) => setResume((r) => ({ ...r, ...patch }));

  const importFile = async (file) => {
    if (resume?.experience?.length && !window.confirm("Replace your current resume with the imported one?")) return;
    setBusy("import");
    setError(null);
    try {
      const r = await career.parseResume({ file }, true);
      load(r);
      refreshCareer();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportAs = async (format) => {
    setBusy(format);
    setError(null);
    try {
      const res = await career.exportResume(format);
      saveBlob(res, `resume.${format}`);
      if (format === "txt") updateResumeText(await res.data.text());
    } catch (e) {
      const detail = e?.response?.data instanceof Blob ? JSON.parse(await e.response.data.text()).detail : null;
      setError(detail || apiError(e));
    } finally {
      setBusy("");
    }
  };

  if (!resume) return <div className="cp-page">{error ? <ErrorNote message={error} /> : <Loading />}</div>;

  return (
    <div className="cp-page">
      <SEO title="Resume Editor" description="Edit your resume, tailor it to a job, and export an ATS-safe PDF or DOCX." />
      <div className="cp-page-head">
        <div>
          <div className="cp-eyebrow">Resume editor</div>
          <h1 className="cp-title">Your resume</h1>
          <p className="cp-sub" aria-live="polite">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved · used for job matching"
              : saveState === "error" ? "Couldn't save. Check your connection." : source === "parsed" ? "Parsed from your last scan. Edits save automatically."
                : "Edits save automatically and power your job matches."}
          </p>
        </div>
        <div className="cp-row">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          <button className="btn-secondary" disabled={busy !== ""} onClick={() => fileRef.current?.click()}>{busy === "import" ? <Spinner /> : "Import resume"}</button>
          <button className="btn-secondary" disabled={busy !== ""} onClick={() => exportAs("txt")}>{busy === "txt" ? <Spinner /> : "ATS text"}</button>
          <button className="btn-secondary" disabled={busy !== ""} onClick={() => exportAs("docx")}>{busy === "docx" ? <Spinner /> : "DOCX"}</button>
          <button className="btn-primary" disabled={busy !== ""} onClick={() => exportAs("pdf")}>{busy === "pdf" ? <Spinner /> : "Download PDF"}</button>
        </div>
      </div>
      {source === "empty" && (
        <Note tone="info">Start by importing your resume, <Link to="/scan">scanning one</Link>, or filling in the sections below.</Note>
      )}
      <ErrorNote message={error} />
      <Tabs tabs={[{ id: "edit", label: "Edit" }, { id: "tailor", label: "Tailor to a job" }]} value={tab} onChange={setTab} />
      {tab === "edit" ? <Editor r={resume} set={set} /> : (
        <TailorTab onSaved={(r) => { saved.current = JSON.stringify(r); setResume(r); setSaveState("saved"); refreshCareer(); }} />
      )}
    </div>
  );
}
