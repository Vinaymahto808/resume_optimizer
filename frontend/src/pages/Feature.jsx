/* Public feature pages: /features (catalog) and /features/:slug (one feature, how it works, related tools). */
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import SEO from "../components/SEO";
import { ALL_FEATURES, EMPLOYER_FEATURES, FEATURES, featureBySlug } from "../data/features";
import { Reveal, Tilt } from "../components/fx/fx";
import { FeatureMock } from "../components/landing/Mocks";
import useGatedTo from "../lib/useGatedTo";
import { AdHorizontal } from "../components/AdBanner";
import "../components/landing/landing.css";

function FeatureCard({ f }) {
  const Icon = f.icon;
  return (
    <Tilt max={8}>
      <Link to={`/features/${f.slug}`} className="jr-tool" style={{ "--tintc": f.color }}>
        <div className="jr-tool-icon"><Icon size={19} /></div>
        <b>{f.name}</b>
        <span>{f.short}</span>
        <em><ArrowUpRight size={16} /></em>
      </Link>
    </Tilt>
  );
}

export function FeaturesIndex() {
  const groups = [...new Set(FEATURES.map((f) => f.group))];
  return (
    <div className="landing">
      <SEO title="Features: AI job search copilot" description="AI job matching, tailored resumes, 1-click autofill, insider referrals, apply agent, the Sage AI coach and hiring tools." />
      <section className="jr-section" style={{ paddingTop: 72 }}>
        <div className="jr-wrap">
          <Reveal className="jr-center">
            <span className="jr-eyebrow">All features</span>
            <h1 className="jr-title">Every tool for your <span className="fx-shine-text">job search</span></h1>
            <p className="jr-sub">Find the right jobs, apply faster, get referred and land the offer.</p>
          </Reveal>
          {groups.map((g) => (
            <div key={g} style={{ marginTop: 44 }}>
              <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{g}</h2>
              <Reveal className="jr-tools" stagger={0.05} style={{ marginTop: 14 }}>
                {FEATURES.filter((f) => f.group === g).map((f) => <FeatureCard key={f.slug} f={f} />)}
              </Reveal>
            </div>
          ))}
          <div style={{ marginTop: 44 }}>
            <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>For employers</h2>
            <Reveal className="jr-tools" stagger={0.05} style={{ marginTop: 14 }}>
              {EMPLOYER_FEATURES.map((f) => <FeatureCard key={f.slug} f={f} />)}
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Feature() {
  const { slug } = useParams();
  const gated = useGatedTo();
  const f = featureBySlug(slug);
  if (!f) return <Navigate to="/features" replace />;
  if (f.slug !== slug) return <Navigate to={`/features/${f.slug}`} replace />;
  const Icon = f.icon;
  const related = ALL_FEATURES.filter((x) => x.group === f.group && x.slug !== f.slug).slice(0, 4);
  const more = related.length >= 2 ? related : ALL_FEATURES.filter((x) => x.slug !== f.slug).slice(0, 4);

  return (
    <div className="landing" style={{ "--tintc": f.color, "--tint": f.color }}>
      <SEO title={`${f.name}: ${f.short}`} description={f.tagline} />

      <section className="jr-section" style={{ paddingTop: 72 }}>
        <div className="jr-wrap">
          <div className="jr-row" style={{ "--tint": f.color, "--tintc": f.color, padding: 40 }}>
            <Reveal className="jr-row-copy">
              <Link to="/features" className="jr-link" style={{ fontSize: 13, color: "var(--text-muted)" }}>← All features</Link>
              <div className="jr-row-icon" style={{ marginTop: 18 }}><Icon size={22} /></div>
              <div className="jr-row-num" style={{ marginTop: 16 }}>{f.group.toUpperCase()}</div>
              <h1 style={{ fontSize: "clamp(30px,4vw,48px)", fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.08, color: "var(--text-heading)", marginTop: 8 }}>{f.headline}</h1>
              <p>{f.tagline}</p>
              <div className="jr-cta-row">
                <Link to={gated(f.cta.to)} className="jr-btn">{f.cta.label} <ArrowRight size={16} /></Link>
                <Link to="/pricing" className="jr-link">See pricing <ArrowUpRight size={15} /></Link>
              </div>
            </Reveal>
            <Reveal delay={0.15} className="jr-row-visual">
              <Tilt max={10}><FeatureMock kind={f.mock} /></Tilt>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="jr-wrap" style={{ padding: "0 24px" }}>
        <AdHorizontal />
      </div>

      <section className="jr-section" style={{ paddingTop: 24 }}>
        <div className="jr-wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          <Reveal>
            <div className="jr-stat" style={{ padding: 30 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-heading)" }}>What you get</h2>
              <ul style={{ marginTop: 16, display: "grid", gap: 12, listStyle: "none", padding: 0 }}>
                {f.bullets.map((b) => (
                  <li key={b} style={{ display: "flex", gap: 10, fontSize: 15, lineHeight: 1.5 }}>
                    <CheckCircle2 size={18} color={f.color} style={{ flexShrink: 0, marginTop: 2 }} />{b}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="jr-stat" style={{ padding: 30 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-heading)" }}>How it works</h2>
              <ol style={{ marginTop: 16, display: "grid", gap: 14, listStyle: "none", padding: 0 }}>
                {f.steps.map((s, i) => (
                  <li key={s} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 15 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", background: f.color, color: "#fff", fontWeight: 800, flexShrink: 0, boxShadow: `0 10px 20px -10px ${f.color}` }}>{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="jr-section" style={{ paddingTop: 24 }}>
        <div className="jr-wrap">
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--text-heading)" }}>Related tools</h2>
          <Reveal className="jr-tools" stagger={0.06} style={{ marginTop: 18 }}>
            {more.map((x) => <FeatureCard key={x.slug} f={x} />)}
          </Reveal>
        </div>
      </section>
    </div>
  );
}
