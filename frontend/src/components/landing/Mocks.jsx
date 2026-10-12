/* Animated product mock-ups for the landing page and feature pages. Pure CSS motion (see landing.css). */
import { useRef } from "react";
import { BadgeCheck, Bot, Check, Globe2, Send, ShieldAlert, ShieldCheck, Sparkles, Zap } from "lucide-react";
import usePointerParallax from "../fx/usePointerParallax";
import { COACH_NAME } from "../../data/features";

function Ring({ score, size = 64, color = "#0EA5E9" }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="lm-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth="6" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round"
          strokeDasharray={c} style={{ "--c": c, "--o": c * (1 - score / 100) }} className="lm-ring-arc" />
      </svg>
      <span style={{ fontSize: size * 0.26 }}>{score}%</span>
    </div>
  );
}

export function MatchMock() {
  const jobs = [
    { t: "Senior ML Engineer", c: "Stripe", s: 94, tags: ["Python", "PyTorch"], h1b: true },
    { t: "Data Scientist", c: "Airbnb", s: 87, tags: ["SQL", "A/B testing"], h1b: true },
    { t: "AI Engineer", c: "Ramp", s: 78, tags: ["LLM", "RAG"] },
  ];
  return (
    <div className="lm-panel lm-match">
      <div className="lm-panel-head"><span className="lm-dot" /> Your matches <span className="lm-chip">Updated just now</span></div>
      {jobs.map((j, i) => (
        <div key={j.t} className="lm-job" style={{ animationDelay: `${i * 0.18}s` }}>
          <Ring score={j.s} size={46} color={j.s > 90 ? "#10B981" : "#0EA5E9"} />
          <div className="lm-job-body">
            <b>{j.t}</b>
            <small>{j.c} · Remote</small>
            <div className="lm-tags">
              {j.tags.map((t) => <i key={t}>{t}</i>)}
              {j.h1b && <i className="lm-tag-purple">H-1B</i>}
              <i className="lm-tag-green"><BadgeCheck size={10} /> Verified</i>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AutofillMock() {
  const fields = [["First name", "Jane"], ["Email", "jane@example.com"], ["LinkedIn", "linkedin.com/in/jane"], ["Need sponsorship?", "Yes"]];
  return (
    <div className="lm-panel lm-autofill">
      <div className="lm-browser"><span /><span /><span /><em>boards.greenhouse.io/apply</em></div>
      {fields.map(([label, value], i) => (
        <label key={label} className="lm-field">
          <small>{label}</small>
          <span className="lm-input"><span className="lm-typed" style={{ "--d": `${0.5 + i * 0.7}s`, "--n": value.length }}>{value}</span></span>
        </label>
      ))}
      <div className="lm-autofill-foot">
        <span className="lm-btn-glow"><Zap size={12} /> Autofilled 4 of 4</span>
        <span className="lm-muted">You review &amp; submit</span>
      </div>
    </div>
  );
}

export function ResumeMock() {
  return (
    <div className="lm-panel lm-resume">
      <div className="lm-panel-head"><Sparkles size={13} /> Tailoring for <b>&nbsp;ML Engineer · Stripe</b></div>
      <div className="lm-cover">
        <span>Keyword coverage</span>
        <div className="lm-bar"><i style={{ "--w": "92%" }} /></div>
        <b className="lm-cover-num">54% → 92%</b>
      </div>
      <div className="lm-bullet">
        <s>Responsible for building data pipelines for the ML team</s>
        <p>Built <mark>Python</mark> &amp; <mark>Spark</mark> pipelines feeding 12 production models, cutting training time 40%.</p>
      </div>
      <div className="lm-bullet" style={{ animationDelay: "0.4s" }}>
        <s>Worked on model deployment</s>
        <p>Deployed <mark>PyTorch</mark> models on <mark>Kubernetes</mark> serving 2M daily predictions.</p>
      </div>
      <div className="lm-ats"><Check size={12} /> ATS-safe · ready in seconds</div>
    </div>
  );
}

export function ReferralMock() {
  const people = [["Sam Lee", "Staff Engineer", "Alumni"], ["Priya N.", "Eng Manager", "Ex-colleague"], ["Chris W.", "Recruiter", "Connection"]];
  return (
    <div className="lm-panel lm-referral">
      <div className="lm-panel-head">You know <b>&nbsp;3 people&nbsp;</b> at Stripe</div>
      {people.map(([n, r, rel], i) => (
        <div key={n} className="lm-person" style={{ animationDelay: `${i * 0.15}s` }}>
          <span className="lm-avatar" style={{ background: ["#A855F7", "#0EA5E9", "#10B981"][i] }}>{n[0]}</span>
          <div><b>{n}</b><small>{r}</small></div>
          <i>{rel}</i>
        </div>
      ))}
      <div className="lm-msg"><Send size={12} /> Hi Sam! I'm applying for the ML Engineer role. Would you be open to a quick chat?</div>
    </div>
  );
}

export function CoachMock() {
  return (
    <div className="lm-panel lm-coach">
      <div className="lm-panel-head"><span className="lm-bot"><Bot size={13} /></span> {COACH_NAME}</div>
      <div className="lm-chat lm-chat-me">Find remote ML roles that sponsor H-1B</div>
      <div className="lm-chat lm-chat-bot">
        I found <b>12 jobs</b>. Top pick: <b>Senior ML Engineer at Stripe</b>, 94% match, sponsors H-1B.
        <div className="lm-chat-card"><Ring score={94} size={34} color="#10B981" /><span>Senior ML Engineer<small>Stripe · Remote</small></span></div>
      </div>
      <div className="lm-chat lm-chat-me" style={{ animationDelay: "1.6s" }}>How should I negotiate?</div>
      <div className="lm-typing" style={{ animationDelay: "2.2s" }}><i /><i /><i /></div>
    </div>
  );
}

export function AgentMock() {
  const steps = [["Match check", "94% match"], ["Tailor resume", "Coverage 54% → 92%"], ["Cover letter", "212 words"], ["Autofill packet", "Ready for review"]];
  return (
    <div className="lm-panel lm-agent">
      <div className="lm-panel-head"><Zap size={13} /> Agent run · 06:00 <span className="lm-chip lm-chip-green">Running</span></div>
      {steps.map(([s, d], i) => (
        <div key={s} className="lm-step" style={{ "--d": `${i * 0.6}s` }}>
          <span className="lm-step-dot"><Check size={11} /></span><b>{s}</b><small>{d}</small>
        </div>
      ))}
    </div>
  );
}

export function TrackerMock() {
  const cols = [["Wishlist", ["Figma", "Notion"]], ["Applied", ["Stripe", "Ramp"]], ["Interview", ["Airbnb"]], ["Offer", ["Linear"]]];
  return (
    <div className="lm-panel lm-tracker">
      {cols.map(([name, cards], ci) => (
        <div key={name} className="lm-col">
          <small>{name}</small>
          {cards.map((c, i) => <div key={c} className={`lm-kcard${name === "Offer" ? " lm-kcard-win" : ""}`} style={{ animationDelay: `${ci * 0.15 + i * 0.1}s` }}>{c}</div>)}
        </div>
      ))}
    </div>
  );
}

export function RecruiterMock() {
  const cands = [["Ana Gomez", 91, "verified"], ["Rahul S.", 84, "verified"], ["J. Smith", 23, "high_risk"]];
  return (
    <div className="lm-panel lm-recruiter">
      <div className="lm-panel-head">Senior ML Engineer · 48 candidates</div>
      {cands.map(([n, s, v], i) => (
        <div key={n} className="lm-cand" style={{ animationDelay: `${i * 0.15}s` }}>
          <Ring score={s} size={36} color={v === "verified" ? "#10B981" : "#94A3B8"} />
          <b>{n}</b>
          {v === "verified"
            ? <i className="lm-tag-green"><ShieldCheck size={11} /> Verified</i>
            : <i className="lm-tag-red"><ShieldAlert size={11} /> Disposable email · timeline gap</i>}
        </div>
      ))}
    </div>
  );
}

const MOCKS = {
  match: MatchMock, autofill: AutofillMock, resume: ResumeMock, referral: ReferralMock, coach: CoachMock,
  agent: AgentMock, tracker: TrackerMock, recruiter: RecruiterMock,
};

export function FeatureMock({ kind }) {
  const Mock = MOCKS[kind] || MatchMock;
  return <Mock />;
}

/** Layered 3D hero: product cards floating at different depths, tilting with the pointer. */
export function HeroScene3D() {
  const ref = useRef(null);
  const { x, y } = usePointerParallax(ref);
  return (
    <div ref={ref} className="hs-wrap" aria-hidden="true">
      <div className="hs-glow" />
      <div className="hs-orbit"><span /><span /><span /></div>
      <div className="hs-stage" style={{ transform: `rotateX(${8 - y * 8}deg) rotateY(${-14 + x * 14}deg)` }}>
        <div className="hs-layer hs-main" style={{ "--z": "40px" }}><MatchMock /></div>
        <div className="hs-layer hs-resume" style={{ "--z": "110px" }}><ResumeMock /></div>
        <div className="hs-layer hs-coach" style={{ "--z": "160px" }}><CoachMock /></div>
        <div className="hs-badge hs-b1" style={{ "--z": "200px" }}><Globe2 size={13} /> H-1B sponsor</div>
        <div className="hs-badge hs-b2" style={{ "--z": "220px" }}><ShieldCheck size={13} /> Scam-checked jobs</div>
        <div className="hs-badge hs-b3" style={{ "--z": "180px" }}><Zap size={13} /> Autofilled in 1 click</div>
      </div>
    </div>
  );
}
