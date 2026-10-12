/* Landing sections: live job hub, job search bar, feature showcase, tools grid, employers band. */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CheckCircle2, Search, Sparkles } from "lucide-react";
import { career } from "../../api";
import useGatedTo from "../../lib/useGatedTo";
import { EMPLOYER_FEATURES, FEATURES, HERO_FEATURES } from "../../data/features";
import { CountUp, Reveal, Tilt } from "../fx/fx";
import { FeatureMock } from "./Mocks";
import "./landing.css";

export function JobSearchBar() {
  const navigate = useNavigate();
  const gated = useGatedTo();
  const [form, setForm] = useState({ query: "", model: "", location: "", level: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (form.query.trim()) params.set("query", form.query.trim());
    if (form.location.trim()) params.set("location", form.location.trim());
    if (form.model === "remote") params.set("remote", "1");
    if (form.level) params.set("level", form.level);
    const qs = params.toString();
    navigate(gated(`/jobs${qs ? `?${qs}` : ""}`));
  };

  return (
    <form className="jr-search" onSubmit={submit} role="search" aria-label="Search jobs">
      <input value={form.query} onChange={set("query")} placeholder="Job title, skill or company" aria-label="Job title" />
      <select value={form.model} onChange={set("model")} aria-label="Work model">
        <option value="">Any work model</option>
        <option value="remote">Remote</option>
        <option value="onsite">On-site / hybrid</option>
      </select>
      <input value={form.location} onChange={set("location")} placeholder="City or country" aria-label="Location" />
      <select value={form.level} onChange={set("level")} aria-label="Experience level">
        <option value="">Any level</option>
        <option value="intern">Internship</option>
        <option value="entry">Entry level</option>
        <option value="mid">Mid level</option>
        <option value="senior">Senior</option>
        <option value="lead">Lead / staff</option>
      </select>
      <button type="submit"><Search size={16} /> Find jobs</button>
    </form>
  );
}

/** Live numbers from the job index (never invented marketing figures). */
export function StatsHub() {
  const [sys, setSys] = useState(null);
  useEffect(() => {
    let alive = true;
    career.system().then((s) => alive && setSys(s)).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const stats = [
    { value: 6, suffix: " sec", label: "to tailor a resume to a job description" },
    { value: 1, prefix: "", suffix: "-click", label: "autofill on Greenhouse, Lever, Workday, Ashby and more" },
    { value: 13, suffix: "+", label: "AI tools in one place, from matching to negotiation" },
    { value: 2, suffix: " free", label: "AI credits every day, no card required" },
  ];

  return (
    <section className="jr-section" style={{ paddingTop: 72, paddingBottom: 72 }}>
      <div className="jr-wrap">
        <Reveal className="jr-center">
          <span className="jr-eyebrow"><Sparkles size={13} /> Why job seekers switch</span>
          <h2 className="jr-title">Less busywork. <span className="fx-shine-text">More interviews.</span></h2>
          <p className="jr-sub">The repetitive parts of job hunting, handled by AI, so your energy goes into the conversations that count.</p>
        </Reveal>
        <Reveal className="jr-stats" stagger={0.08}>
          {stats.map((s) => (
            <Tilt key={s.label} max={7}>
              <div className="jr-stat">
                <div className="jr-stat-num"><em><CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} /></em></div>
                <p>{s.label}</p>
              </div>
            </Tilt>
          ))}
        </Reveal>

        <Reveal>
          <div className="jr-hub">
            <div className="jr-hub-grid" aria-hidden="true" />
            <div style={{ position: "relative" }}>
              <span className="jr-live">Live job index</span>
              <h3>A job feed that <span>never goes stale</span></h3>
              <p>Collected from company hiring pages and public boards, cleaned of duplicates, screened for scams and refreshed throughout the day.</p>
            </div>
            <div className="jr-hub-nums" style={{ position: "relative" }}>
              <div className="jr-hub-num"><b>{sys ? <CountUp value={sys.jobs} /> : "…"}</b><small>Jobs indexed</small></div>
              <div className="jr-hub-num"><b>{sys ? <CountUp value={sys.jobs_new_today ?? 0} /> : "…"}</b><small>New today</small></div>
              <div className="jr-hub-num"><b>{sys ? <CountUp value={sys.jobs_h1b ?? 0} /> : "…"}</b><small>H-1B sponsor jobs</small></div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function FeatureShowcase() {
  const gated = useGatedTo();
  return (
    <section className="jr-section" id="features">
      <div className="jr-wrap">
        <Reveal className="jr-center">
          <span className="jr-eyebrow">How it works for you</span>
          <h2 className="jr-title">Five ways AI <span className="fx-shine-text">lands you the interview</span></h2>
          <p className="jr-sub">From finding the right job to getting referred, each step takes minutes instead of hours.</p>
        </Reveal>
        <div className="jr-showcase">
          {HERO_FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.slug} y={40}>
                <div className={`jr-row${i % 2 ? " jr-row--flip" : ""}`} style={{ "--tint": f.color, "--tintc": f.color }}>
                  <div className="jr-row-copy">
                    <div className="jr-row-icon"><Icon size={22} /></div>
                    <div className="jr-row-num" style={{ marginTop: 16 }}>0{i + 1} · {f.name.toUpperCase()}</div>
                    <h3>{f.headline}</h3>
                    <p>{f.tagline}</p>
                    <ul>{f.bullets.slice(0, 3).map((b) => <li key={b}><CheckCircle2 size={16} />{b}</li>)}</ul>
                    <div className="jr-cta-row">
                      <Link to={gated(f.cta.to)} className="jr-btn">{f.cta.label} <ArrowRight size={16} /></Link>
                      <Link to={`/features/${f.slug}`} className="jr-link">How it works <ArrowUpRight size={15} /></Link>
                    </div>
                  </div>
                  <div className="jr-row-visual">
                    <Tilt max={9}><FeatureMock kind={f.mock} /></Tilt>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ToolsGrid() {
  const tools = FEATURES.slice(5);
  return (
    <section className="jr-section" style={{ background: "var(--bg-card)" }}>
      <div className="jr-wrap">
        <Reveal className="jr-center">
          <span className="jr-eyebrow">Everything else you need</span>
          <h2 className="jr-title">More AI tools, one account</h2>
          <p className="jr-sub">From your first application to the offer negotiation.</p>
        </Reveal>
        <Reveal className="jr-tools" stagger={0.05}>
          {tools.map((f) => {
            const Icon = f.icon;
            return (
              <Tilt key={f.slug} max={8}>
                <Link to={`/features/${f.slug}`} className="jr-tool" style={{ "--tintc": f.color }}>
                  <div className="jr-tool-icon"><Icon size={19} /></div>
                  <b>{f.name}</b>
                  <span>{f.short}</span>
                  <em><ArrowUpRight size={16} /></em>
                </Link>
              </Tilt>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export function EmployersBand() {
  const gated = useGatedTo();
  const [recruiter, fraud] = EMPLOYER_FEATURES;
  return (
    <section className="jr-section">
      <div className="jr-wrap">
        <Reveal>
          <div className="jr-employers">
            <div>
              <span className="jr-eyebrow" style={{ color: "#4338CA", background: "rgba(99,102,241,0.1)", borderColor: "rgba(99,102,241,0.2)" }}>For employers</span>
              <h2 className="jr-title" style={{ fontSize: "clamp(26px,3.2vw,40px)" }}>Shortlists of real, verified candidates, minus the grind.</h2>
              <p className="jr-sub">{fraud.tagline}</p>
              <ul style={{ marginTop: 16, display: "grid", gap: 8, listStyle: "none", padding: 0 }}>
                {[...recruiter.bullets.slice(0, 2), ...fraud.bullets.slice(0, 2)].map((b) => (
                  <li key={b} style={{ display: "flex", gap: 8, fontSize: 14 }}><CheckCircle2 size={16} color="#4F46E5" style={{ flexShrink: 0, marginTop: 2 }} />{b}</li>
                ))}
              </ul>
              <div className="jr-cta-row" style={{ "--tintc": "#4F46E5" }}>
                <Link to={gated("/recruiter")} className="jr-btn">Start hiring <ArrowRight size={16} /></Link>
                <Link to="/features/fraud-detection" className="jr-link">Candidate verification <ArrowUpRight size={15} /></Link>
              </div>
            </div>
            <Tilt max={9}><FeatureMock kind="recruiter" /></Tilt>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
