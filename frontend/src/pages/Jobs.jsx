import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SEO from "../components/SEO";
import { career, apiError } from "../api";
import { usePlan } from "../contexts/PlanContext";
import { EmptyState, ErrorNote, Loading, MatchRing, Note, Pill, Spinner, Tabs } from "../components/career/ui";
import { ago, scoreTone } from "../components/career/format";
import JobDrawer from "../components/career/JobDrawer";
import { AdInFeed } from "../components/AdBanner";

const PAGE_SIZE = 40;

// Match-strength filters; thresholds mirror match_label() in backend/app/career/matching.py.
const TIERS = [
  { min: 0, label: "All" },
  { min: 75, label: "Strong", keys: ["strong"] },
  { min: 60, label: "Good+", keys: ["strong", "good"] },
  { min: 45, label: "Fair+", keys: ["strong", "good", "fair"] },
];

const FILTERS = [
  ["remote_only", "Remote"],
  ["h1b_only", "H-1B sponsors"],
  ["verified_only", "Verified only"],
];

function JobCard({ job, onOpen }) {
  const skills = job.match?.matched_skills || [];
  return (
    <button type="button" className="cp-card cp-card-click cp-job-card cp-jcard" onClick={() => onOpen(job.id)}>
      {job.match ? <MatchRing score={job.match.score} size={48} /> : <div className="cp-jcard-ring-ph" />}
      <div className="cp-jcard-body">
        <div className="cp-jcard-top">
          <p className="cp-job-title cp-jcard-title">{job.title}</p>
          {job.posted_at && <span className="cp-jcard-age">{ago(job.posted_at)}</span>}
        </div>
        <p className="cp-job-meta cp-jcard-meta">{job.company} · {job.location || "Remote"}</p>
        <div className="cp-jcard-pills">
          {job.match && <Pill tone={scoreTone(job.match.score)}>{job.match.label}</Pill>}
          {job.remote && <Pill tone="accent">Remote</Pill>}
          {job.h1b_sponsor && <Pill tone="purple">H-1B</Pill>}
          {job.seniority && <Pill>{job.seniority[0].toUpperCase() + job.seniority.slice(1)}</Pill>}
          {!job.verified && <Pill tone="red">Unverified</Pill>}
          {skills.slice(0, 3).map((s) => <Pill key={s} tone="green">{s}</Pill>)}
          {skills.length > 3 && <span className="cp-muted">+{skills.length - 3} skills</span>}
        </div>
      </div>
      <span className="cp-jcard-chev" aria-hidden="true">›</span>
    </button>
  );
}

export default function Jobs() {
  const { careerProfile } = usePlan();
  const [mode, setMode] = useState("list");
  // Links from the landing page / feature pages pre-set filters: ?query=&location=&remote=1&h1b=1&level=
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    query: searchParams.get("query") || "",
    location: searchParams.get("location") || undefined,
    seniority: searchParams.get("level") || undefined,
    remote_only: searchParams.get("remote") === "1",
    h1b_only: searchParams.get("h1b") === "1",
    verified_only: true,
    posted_within_days: undefined,
  }));
  const [queryDraft, setQueryDraft] = useState(() => searchParams.get("query") || "");
  const [sort, setSort] = useState("match");
  const [minMatch, setMinMatch] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [hits, setHits] = useState([]);
  const [crawling, setCrawling] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [deciding, setDeciding] = useState(false);

  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const list = mode === "list";
    career.jobs({ ...filters, feed: !list, limit: list ? PAGE_SIZE : 20, ...(list ? { sort, min_match: minMatch || undefined } : {}) })
      .then((res) => {
        if (cancelled) return;
        setJobs(res.jobs);
        setTotal(res.total);
        setMeta({ scanned: res.scanned, capped: res.capped, tiers: res.tiers });
      })
      .catch((e) => !cancelled && setError(apiError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [filters, mode, sort, minMatch, reloadTick]);

  // Any change that refetches shows the spinner first.
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadTick((t) => t + 1);
  }, []);
  const changeFilters = (fn) => {
    setLoading(true);
    setError(null);
    setFilters(fn);
  };
  const changeSort = (v) => {
    if (v === sort) return;
    setLoading(true);
    setSort(v);
  };
  const changeMinMatch = (v) => {
    if (v === minMatch) return;
    setLoading(true);
    setMinMatch(v);
  };
  const changeMode = (m) => {
    if (m === mode) return;
    setLoading(true);
    setMode(m);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await career.jobs({ ...filters, limit: PAGE_SIZE, offset: jobs.length, sort, min_match: minMatch || undefined });
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        return [...prev, ...res.jobs.filter((j) => !seen.has(j.id))];
      });
      setTotal(res.total);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    career.jobStats().then(setStats).catch(() => {});
    career.alertHits().then((r) => setHits(r.hits.filter((h) => !h.seen))).catch(() => {});
  }, []);

  const refresh = async () => {
    setCrawling(true);
    setError(null);
    try {
      await career.ingest();
      for (let i = 0; i < 40; i += 1) {
        await new Promise((r) => setTimeout(r, 3000));
        const s = await career.ingestStatus();
        if (!s.running) break;
      }
      setStats(await career.jobStats());
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setCrawling(false);
    }
  };

  const decide = async (decision) => {
    const top = jobs[0];
    if (!top) return;
    setDeciding(true);
    try {
      await career.decide(top.id, decision);
      setJobs((js) => js.slice(1));
      if (jobs.length <= 3) load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDeciding(false);
    }
  };

  const top = jobs[0];
  const tiers = meta?.tiers;
  // The backend scans only the newest postings; "+" says there are more than it counted.
  const plus = meta?.capped && minMatch === 0 ? "+" : "";
  const tierCount = (t) => (t.keys ? t.keys.reduce((n, k) => n + (tiers?.[k] || 0), 0) : meta?.scanned || 0);

  return (
    <div className="cp-page">
      <SEO title="AI Job Match" description="Jobs matched to your resume from company career pages and public job boards." />
      <div className="cp-page-head">
        <div>
          <div className="cp-eyebrow">AI Job Match</div>
          <h1 className="cp-title">Jobs that fit your resume</h1>
          <p className="cp-sub">
            {stats ? `${stats.jobs_indexed.toLocaleString()} jobs indexed · ${stats.new_today} new today` : "Matched on skills, experience, title and your preferences."}
          </p>
        </div>
        <div className="cp-row">
          <Tabs tabs={[{ id: "list", label: "List" }, { id: "swipe", label: "Swipe" }]} value={mode} onChange={changeMode} />
          <button className="btn-secondary" onClick={refresh} disabled={crawling}>{crawling ? <><Spinner />&nbsp;Crawling…</> : "Refresh jobs"}</button>
        </div>
      </div>

      {hits.length > 0 && (
        <Note tone="info">
          <div className="cp-between">
            <span><strong>{hits.length} new job{hits.length > 1 ? "s" : ""}</strong> from your alerts, e.g. {hits[0].job.title} at {hits[0].job.company} ({hits[0].match_score}% match).</span>
            <span className="cp-row">
              <button className="cp-link" onClick={() => setOpenId(hits[0].job.id)}>Open</button>
              <button className="cp-link" onClick={() => { career.markHitsSeen(); setHits([]); }}>Dismiss</button>
            </span>
          </div>
        </Note>
      )}
      {careerProfile && !careerProfile.has_resume && (
        <Note tone="warn">Add your resume in the <Link to="/resume-editor">Resume editor</Link> (or <Link to="/scan">scan one</Link>) to get match scores.</Note>
      )}

      <div className="cp-card cp-card-tight cp-stack">
        <form className="cp-row" onSubmit={(e) => { e.preventDefault(); changeFilters((f) => ({ ...f, query: queryDraft.trim() })); }}>
          <input value={queryDraft} onChange={(e) => setQueryDraft(e.target.value)} placeholder="Search title, company or skill" style={{ flex: 1, minWidth: 180 }} />
          <button className="btn-primary" type="submit">Search</button>
        </form>
        <div className="cp-row">
          {FILTERS.map(([key, label]) => (
            <label key={key} className="cp-check">
              <input type="checkbox" checked={!!filters[key]} onChange={() => changeFilters((f) => ({ ...f, [key]: !f[key] }))} />{label}
            </label>
          ))}
          <label className="cp-check">
            <input type="checkbox" checked={!!filters.posted_within_days}
              onChange={() => changeFilters((f) => ({ ...f, posted_within_days: f.posted_within_days ? undefined : 3 }))} />
            Posted in the last 3 days
          </label>
          {[["location", "Location"], ["seniority", "Level"]].map(([key, label]) => filters[key] && (
            <button key={key} type="button" className="cp-pill cp-pill--accent" style={{ cursor: "pointer", border: 0 }}
              onClick={() => changeFilters((f) => ({ ...f, [key]: undefined }))} aria-label={`Clear ${label.toLowerCase()} filter`}>
              {label}: {filters[key]} ×
            </button>
          ))}
        </div>
      </div>

      {mode === "list" && meta && (
        <div className="cp-results-bar">
          <div className="cp-results-summary">
            <span className="cp-results-count">{total.toLocaleString()}{plus} jobs</span>
            <span className="cp-muted">
              {meta.capped && stats
                ? `Newest ${meta.scanned.toLocaleString()} of ${stats.jobs_indexed.toLocaleString()} postings scanned`
                : `${meta.scanned.toLocaleString()} postings scanned`}
            </span>
          </div>
          <div className="cp-results-controls">
            {tiers && (
              <div className="cp-tier-chips" role="group" aria-label="Filter by match strength">
                {TIERS.map((t) => {
                  const n = tierCount(t);
                  const active = minMatch === t.min;
                  return (
                    <button key={t.min} type="button" className={`cp-tier-chip${active ? " cp-tier-chip--active" : ""}`}
                      aria-pressed={active} disabled={!active && n === 0} onClick={() => changeMinMatch(t.min)}>
                      {t.label}<span className="cp-tier-count">{n.toLocaleString()}{t.min === 0 ? plus : ""}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <label className="cp-sort">
              <span className="cp-muted">Sort</span>
              <select value={sort} onChange={(e) => changeSort(e.target.value)} aria-label="Sort jobs">
                <option value="match">Best match</option>
                <option value="recent">Newest</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <ErrorNote message={error} />

      {loading ? <Loading label="Matching jobs to your resume…" /> : mode === "list" ? (
        jobs.length === 0 ? (
          <EmptyState title="No jobs match these filters"
            action={minMatch > 0
              ? <button className="btn-secondary" onClick={() => changeMinMatch(0)}>Show all match levels</button>
              : <button className="btn-secondary" onClick={refresh}>Refresh jobs</button>}>
            Try fewer filters or a broader search.
          </EmptyState>
        ) : (
          <div className="cp-stack cp-job-list">
            {jobs.map((j, i) => (
              <Fragment key={j.id}>
                <JobCard job={j} onOpen={setOpenId} />
                {/* Free plan: one ad after the 6th job, then one every 12 (renders nothing for paid users). */}
                {(i === 5 || (i > 5 && (i - 5) % 12 === 0)) && <AdInFeed />}
              </Fragment>
            ))}
            <div className="cp-list-foot">
              <span className="cp-muted">Showing {jobs.length.toLocaleString()} of {total.toLocaleString()}{plus} jobs</span>
              <div className="cp-bar cp-list-progress"><span style={{ width: `${Math.min(100, (jobs.length / Math.max(total, 1)) * 100)}%` }} /></div>
              {jobs.length < total ? (
                <button className="btn-secondary" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? <><Spinner />&nbsp;Loading…</> : `Load ${Math.min(PAGE_SIZE, total - jobs.length)} more`}
                </button>
              ) : <span className="cp-muted">You&apos;ve reached the end of the list.</span>}
              {jobs.length > PAGE_SIZE && (
                <button className="cp-link" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="cp-swipe">
          {!top ? (
            <EmptyState title="You've seen every job in your feed"
              action={<button className="btn-secondary" onClick={async () => { await career.resetFeed(); load(); }}>Show passed jobs again</button>}>
              Refresh jobs or change your filters to find more.
            </EmptyState>
          ) : (
            <>
              <div className="cp-card cp-stack">
                <div className="cp-job-card">
                  {top.match && <MatchRing score={top.match.score} size={72} label={top.match.label} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="cp-job-title" style={{ fontSize: 18 }}>{top.title}</p>
                    <p className="cp-job-meta">{top.company} · {top.location || "Remote"}</p>
                    <div className="cp-row" style={{ marginTop: 8 }}>
                      {top.remote && <Pill tone="accent">Remote</Pill>}
                      {top.h1b_sponsor && <Pill tone="purple">H-1B</Pill>}
                      {top.verified && <Pill tone="green">Verified</Pill>}
                    </div>
                  </div>
                </div>
                {top.match?.reasons?.length > 0 && <ul className="cp-small" style={{ margin: 0, paddingLeft: 18 }}>{top.match.reasons.slice(0, 3).map((r) => <li key={r}>{r}</li>)}</ul>}
                <p className="cp-small" style={{ margin: 0 }}>{top.snippet}…</p>
                <button className="cp-link" style={{ alignSelf: "flex-start" }} onClick={() => setOpenId(top.id)}>See details and AI actions →</button>
              </div>
              <div className="cp-swipe-actions">
                <button className="cp-round-btn cp-round-btn--pass" onClick={() => decide("pass")} disabled={deciding} aria-label="Pass">✕</button>
                <button className="cp-round-btn cp-round-btn--like" onClick={() => decide("like")} disabled={deciding} aria-label="Save to tracker">♥</button>
              </div>
              <p className="cp-muted" style={{ textAlign: "center" }}>♥ saves to your tracker · ✕ hides it from your feed</p>
            </>
          )}
        </div>
      )}

      {openId && <JobDrawer jobId={openId} onClose={() => setOpenId(null)} onChanged={() => mode === "swipe" && load()} />}
    </div>
  );
}
