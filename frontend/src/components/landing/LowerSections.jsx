/* Lower landing sections: resume toolkit bento, testimonials, FAQ and the closing CTA (same visual system as the copilot sections). */
import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, FileText, Layout, Lock, MessageCircle, Plus, Scan, Sparkles, UserCheck } from "lucide-react";
import { COACH_NAME } from "../../data/features";
import useGatedTo from "../../lib/useGatedTo";
import { CountUp, Reveal, Tilt } from "../fx/fx";
import "./landing.css";
import "./lower.css";

/* ---------------------------------------------------------------- toolkit -- */

function ScoreRing({ score = 87, size = 132 }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="lt-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="lt-ring-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" /><stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth="10" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#lt-ring-g)" strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={c} className="lm-ring-arc" style={{ "--c": c, "--o": c * (1 - score / 100) }} />
      </svg>
      <div className="lt-ring-label"><b><CountUp value={score} /></b><small>/100</small></div>
    </div>
  );
}

const CHECKS = [["Formatting", 94], ["Keywords", 74], ["Content quality", 82], ["Sections", 100]];

export function ResumeToolkit() {
  const gated = useGatedTo();
  return (
    <section className="jr-section">
      <div className="jr-wrap">
        <Reveal className="jr-center">
          <span className="jr-eyebrow"><FileText size={13} /> Resume toolkit</span>
          <h2 className="jr-title">Make your resume <span className="fx-shine-text">hard to ignore</span></h2>
          <p className="jr-sub">Score it, fix it, restyle it and keep your LinkedIn in sync, before a recruiter ever sees it.</p>
        </Reveal>

        <Reveal className="lt-bento" stagger={0.07}>
          {/* ATS score */}
          <Tilt max={6} className="lt-span-2">
            <Link to={gated("/scan")} className="lt-card lt-card--score" style={{ "--tintc": "#0EA5E9" }}>
              <div>
                <span className="lt-tag">Free · most popular</span>
                <h3>Instant ATS score</h3>
                <p>Upload a PDF, Word file or image and get a score out of 100 across 19 checks, with the fixes that matter most first.</p>
                <span className="jr-link lt-more">Scan my resume <ArrowRight size={15} /></span>
              </div>
              <div className="lt-score">
                <ScoreRing />
                <div className="lt-checks">
                  {CHECKS.map(([label, v], i) => (
                    <div key={label}>
                      <span>{label}<b>{v}%</b></span>
                      <div className="lm-bar"><i style={{ "--w": `${v}%`, animationDelay: `${0.3 + i * 0.12}s` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          </Tilt>

          {/* AI rewrite */}
          <Tilt max={8}>
            <Link to={gated("/resume-editor")} className="lt-card" style={{ "--tintc": "#10B981" }}>
              <div className="jr-tool-icon"><Sparkles size={19} /></div>
              <h3>AI bullet rewrites</h3>
              <p>Turn vague duties into results-first achievements.</p>
              <div className="lt-rewrite">
                <s>Helped with the company website</s>
                <span>Rebuilt the checkout page, lifting conversion <mark>18%</mark></span>
              </div>
            </Link>
          </Tilt>

          {/* Templates */}
          <Tilt max={8}>
            <Link to="/templates" className="lt-card" style={{ "--tintc": "#F59E0B" }}>
              <div className="jr-tool-icon"><Layout size={19} /></div>
              <h3>ATS-friendly templates</h3>
              <p>Clean LaTeX designs with one-click PDF export.</p>
              <div className="lt-docs" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="lt-doc" style={{ "--i": i }}>
                    <i className="lt-doc-head" /><i /><i /><i className="short" /><i /><i className="short" />
                  </div>
                ))}
              </div>
            </Link>
          </Tilt>

          {/* LinkedIn */}
          <Tilt max={8}>
            <Link to={gated("/profile-analyzer")} className="lt-card" style={{ "--tintc": "#0A66C2" }}>
              <div className="jr-tool-icon"><UserCheck size={19} /></div>
              <h3>LinkedIn optimizer</h3>
              <p>A stronger headline and About section, matched to the roles you want.</p>
              <div className="lt-li">
                <span className="lt-li-avatar">J</span>
                <div><b>Senior Data Analyst</b><small>SQL · Python · Tableau · A/B testing</small></div>
              </div>
            </Link>
          </Tilt>

          {/* Privacy */}
          <Tilt max={8}>
            <div className="lt-card lt-card--dark">
              <div className="jr-tool-icon" style={{ "--tintc": "#34D399" }}><Lock size={19} /></div>
              <h3>Private by default</h3>
              <p>Your resume is used only to match you and prepare your applications.</p>
              <ul className="lt-privacy">
                <li><Check size={14} /> Never sold to anyone</li>
                <li><Check size={14} /> Hidden from employers unless you opt in</li>
                <li><Check size={14} /> Nothing submitted without your OK</li>
              </ul>
            </div>
          </Tilt>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- testimonials -- */

const TESTIMONIALS = [
  { name: "Jenica", role: "Solutions Engineer", initials: "JC", color: "#4F46E5",
    text: "ProfileOptimizer has changed my life: One week & four interviews later, I will be making 150% more doing the job I chose.", metric: "150% more" },
  { name: "David K.", role: "Product Manager", initials: "DK", color: "#10B981",
    text: "The AI suggestions improved my bullet points immensely. My resume scored 94 and I got 3 callbacks within a week.", metric: "3 callbacks" },
  { name: "Priya R.", role: "Data Analyst", initials: "PR", color: "#F59E0B",
    text: "I had no idea my resume was being filtered out by ATS. After optimizing with this tool, I'm finally getting responses.", metric: "finally getting responses" },
];

function Highlight({ text, phrase }) {
  const i = phrase ? text.indexOf(phrase) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark className="lt-mark">{phrase}</mark>{text.slice(i + phrase.length)}</>;
}

export function Testimonials() {
  return (
    <section className="jr-section" style={{ background: "var(--bg-card)" }}>
      <div className="jr-wrap">
        <Reveal className="jr-center">
          <span className="jr-eyebrow">Stories</span>
          <h2 className="jr-title">From applying to <span className="fx-shine-text">getting hired</span></h2>
          <p className="jr-sub">What job seekers say after switching their search to ProfileOptimizer.</p>
        </Reveal>
        <Reveal className="lt-quotes" stagger={0.1}>
          {TESTIMONIALS.map((t, i) => (
            <Tilt key={t.name} max={7}>
              <figure className={`lt-quote${i === 0 ? " lt-quote--feature" : ""}`} style={{ "--tintc": t.color }}>
                <span className="lt-quote-mark" aria-hidden="true">“</span>
                <blockquote><Highlight text={t.text} phrase={t.metric} /></blockquote>
                <figcaption>
                  <span className="lt-avatar">{t.initials}</span>
                  <span><b>{t.name}</b><small>{t.role}</small></span>
                </figcaption>
              </figure>
            </Tilt>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- FAQ -- */

function FaqRow({ q, a, open, onToggle, idx }) {
  return (
    <div className={`lt-faq-row${open ? " is-open" : ""}`}>
      <button type="button" onClick={onToggle} aria-expanded={open}>
        <span className="lt-faq-num">{String(idx + 1).padStart(2, "0")}</span>
        <span className="lt-faq-q">{q}</span>
        <span className="lt-faq-icon"><Plus size={16} /></span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: "hidden" }}>
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="jr-section" id="faq">
      <div className="jr-wrap lt-faq">
        <Reveal className="lt-faq-side">
          <span className="jr-eyebrow">FAQ</span>
          <h2 className="jr-title" style={{ fontSize: "clamp(28px,3.4vw,44px)" }}>Questions, answered</h2>
          <p className="jr-sub">Everything about matching, applying, pricing and your data.</p>
          <div className="lt-faq-help">
            <MessageCircle size={18} />
            <div><b>Still curious?</b><small>{COACH_NAME} can answer questions about your own search.</small></div>
          </div>
          <Link to="/features/ai-career-coach" className="jr-link" style={{ marginTop: 14 }}>Meet {COACH_NAME} <ArrowUpRight size={15} /></Link>
        </Reveal>
        <Reveal className="lt-faq-list" delay={0.1}>
          {items.map((f, i) => (
            <FaqRow key={f.q} idx={i} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- final CTA -- */

export function FinalCta() {
  const gated = useGatedTo();
  return (
    <section className="jr-section" style={{ paddingTop: 40 }}>
      <div className="jr-wrap">
        <Reveal>
          <div className="lt-cta">
            <div className="jr-hub-grid" aria-hidden="true" />
            <div className="lt-cta-copy">
              <span className="jr-live">Free to start</span>
              <h2>Your next offer <span>starts here.</span></h2>
              <p>Bring your resume. We'll handle the busywork so you can focus on interviews.</p>
              <div className="lt-cta-actions">
                <Link to={gated("/jobs")} className="lt-cta-btn">Start free <ArrowRight size={17} /></Link>
                <Link to="/scan" className="lt-cta-ghost"><Scan size={16} /> Score my resume</Link>
              </div>
              <div className="lt-cta-trust"><span>✓ Free plan</span><span>✓ No credit card</span><span>✓ Set up in minutes</span></div>
            </div>
            <div className="lt-cta-visual">
              <Tilt max={12}>
                <div className="lt-cta-card">
                  <small>Your ATS score</small>
                  <ScoreRing score={95} size={150} />
                  <span className="lt-cta-delta">+23 since your last scan</span>
                  {CHECKS.slice(0, 3).map(([label, v], i) => (
                    <div key={label} className="lt-cta-bar">
                      <span>{label}<b>{v}%</b></span>
                      <div className="lm-bar"><i style={{ "--w": `${v}%`, animationDelay: `${0.4 + i * 0.15}s` }} /></div>
                    </div>
                  ))}
                </div>
              </Tilt>
              <div className="lt-cta-chip lt-cta-chip--1">✦ 3 new matches</div>
              <div className="lt-cta-chip lt-cta-chip--2">⚡ Autofilled</div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
