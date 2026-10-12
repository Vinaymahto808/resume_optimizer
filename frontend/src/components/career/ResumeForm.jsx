/* Structured resume form (contact, summary, experience bullets, skills, education). Used by the Resume
   Editor page and the "Improve your resume" panel on scan results. */
import { Field } from "./ui";

const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const blankRole = () => ({ id: uid("exp"), role: "", company: "", location: "", startDate: "", endDate: "", bullets: [] });
const blankBullet = () => ({ id: uid("b"), original: "", optimized: "", isOptimized: false, keywords: [], impactScore: 0 });

function Section({ title, action, children }) {
  return (
    <div className="cp-card cp-stack">
      <div className="cp-between"><div className="cp-eyebrow">{title}</div>{action}</div>
      {children}
    </div>
  );
}

export default function Editor({ r, set }) {
  const setExp = (i, patch) => set({ experience: r.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  const setBullet = (i, j, text) =>
    setExp(i, {
      bullets: r.experience[i].bullets.map((b, idx) =>
        // The visible text is what ships: edit the optimized copy if one is active, otherwise the original.
        idx === j ? (b.isOptimized ? { ...b, optimized: text } : { ...b, original: text, optimized: text }) : b),
    });
  const input = (key, label, max = 300, placeholder = "") => (
    <Field label={label}><input value={r[key] || ""} maxLength={max} placeholder={placeholder} onChange={(e) => set({ [key]: e.target.value })} /></Field>
  );

  return (
    <div className="cp-stack">
      <Section title="Contact">
        <div className="cp-grid-2">
          {input("fullName", "Full name", 200)}
          {input("title", "Headline", 300, "Senior Data Engineer")}
          {input("email", "Email", 200)}
          {input("phone", "Phone", 50)}
          {input("location", "Location", 200)}
          {input("linkedin", "LinkedIn", 500)}
          {input("github", "GitHub", 500)}
          {input("portfolio", "Portfolio", 500)}
        </div>
      </Section>

      <Section title="Summary">
        <textarea className="sr-textarea" rows={4} maxLength={3000} value={r.summary} onChange={(e) => set({ summary: e.target.value })}
          placeholder="2–3 sentences on what you do and the impact you've had." />
      </Section>

      <Section title="Experience" action={<button className="cp-link" onClick={() => set({ experience: [...r.experience, blankRole()] })}>+ Add role</button>}>
        {r.experience.length === 0 && <span className="cp-muted">No roles yet.</span>}
        {r.experience.map((exp, i) => (
          <div key={exp.id} className="cp-card cp-card-tight cp-stack" style={{ background: "var(--bg)" }}>
            <div className="cp-grid-2">
              <Field label="Title"><input maxLength={300} value={exp.role} onChange={(e) => setExp(i, { role: e.target.value })} /></Field>
              <Field label="Company"><input maxLength={300} value={exp.company} onChange={(e) => setExp(i, { company: e.target.value })} /></Field>
              <Field label="Start"><input maxLength={40} value={exp.startDate} placeholder="Jan 2021" onChange={(e) => setExp(i, { startDate: e.target.value })} /></Field>
              <Field label="End"><input maxLength={40} value={exp.endDate} placeholder="Present" onChange={(e) => setExp(i, { endDate: e.target.value })} /></Field>
            </div>
            <Field label="Location"><input maxLength={300} value={exp.location} onChange={(e) => setExp(i, { location: e.target.value })} /></Field>
            {exp.bullets.map((b, j) => (
              <div key={b.id} className="cp-row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                <textarea className="sr-textarea" rows={2} maxLength={1000} value={b.isOptimized ? b.optimized : b.original}
                  onChange={(e) => setBullet(i, j, e.target.value)} style={{ flex: 1 }} aria-label={`Bullet ${j + 1}`} />
                {b.isOptimized && b.original !== b.optimized && (
                  <button className="btn-secondary cp-btn-sm" title={`Original: ${b.original}`}
                    onClick={() => setExp(i, { bullets: exp.bullets.map((x, k) => (k === j ? { ...x, isOptimized: false } : x)) })}>Undo AI</button>
                )}
                <button className="btn-secondary cp-btn-sm cp-btn-danger" aria-label="Remove bullet"
                  onClick={() => setExp(i, { bullets: exp.bullets.filter((_, k) => k !== j) })}>×</button>
              </div>
            ))}
            <div className="cp-between">
              <button className="cp-link" onClick={() => setExp(i, { bullets: [...exp.bullets, blankBullet()] })}>+ Add bullet</button>
              <button className="cp-link cp-btn-danger" onClick={() => set({ experience: r.experience.filter((_, k) => k !== i) })}>Remove role</button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Skills" action={<button className="cp-link" onClick={() => set({ skills: [...r.skills, { category: "Skills", items: [] }] })}>+ Add group</button>}>
        {r.skills.map((g, i) => (
          <div key={i} className="cp-row" style={{ alignItems: "flex-end", flexWrap: "nowrap" }}>
            <div style={{ width: 140, flexShrink: 0 }}>
              <Field label="Group"><input maxLength={100} value={g.category}
                onChange={(e) => set({ skills: r.skills.map((s, k) => (k === i ? { ...s, category: e.target.value } : s)) })} /></Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Skills (comma-separated)"><input maxLength={2000} value={g.items.join(", ")}
                onChange={(e) => set({ skills: r.skills.map((s, k) => (k === i ? { ...s, items: e.target.value.split(",").map((x) => x.trimStart()) } : s)) })} /></Field>
            </div>
            <button className="btn-secondary cp-btn-sm cp-btn-danger" aria-label="Remove group" onClick={() => set({ skills: r.skills.filter((_, k) => k !== i) })}>×</button>
          </div>
        ))}
      </Section>

      <Section title="Education" action={<button className="cp-link" onClick={() => set({ education: [...r.education, { degree: "", school: "", year: "" }] })}>+ Add</button>}>
        {r.education.map((ed, i) => {
          const setEd = (patch) => set({ education: r.education.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
          return (
            <div key={i} className="cp-row" style={{ alignItems: "flex-end" }}>
              <div style={{ flex: 2, minWidth: 140 }}><Field label="Degree"><input maxLength={300} value={ed.degree} onChange={(e) => setEd({ degree: e.target.value })} /></Field></div>
              <div style={{ flex: 2, minWidth: 140 }}><Field label="School"><input maxLength={300} value={ed.school} onChange={(e) => setEd({ school: e.target.value })} /></Field></div>
              <div style={{ width: 90 }}><Field label="Year"><input maxLength={40} value={ed.year} onChange={(e) => setEd({ year: e.target.value })} /></Field></div>
              <button className="btn-secondary cp-btn-sm cp-btn-danger" aria-label="Remove education" onClick={() => set({ education: r.education.filter((_, k) => k !== i) })}>×</button>
            </div>
          );
        })}
      </Section>
    </div>
  );
}
