/* Formatting helpers for the career pages. */

export function scoreTone(score) {
  if (score >= 75) return "green";
  if (score >= 60) return "accent";
  if (score >= 45) return "amber";
  return "slate";
}

export function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const money = (n) => `$${Number(n).toFixed(2).replace(/\.00$/, "")}`;
export const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
export const fmtDate = (iso) => (iso ? new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`).toLocaleDateString() : "");
/** Short relative age for a posting: "Today", "3d ago", "2w ago", then the date. */
export function ago(iso) {
  if (!iso) return "";
  const then = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;
  return then.toLocaleDateString();
}
export const fmtDateTime =(iso) => (iso ? new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`).toLocaleString() : "");

const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

/** Copy accepted rewrites into a structured resume (bullets matched by their current text). */
export function applyTailoring(resume, result, accepted, useSummary) {
  const byText = new Map(result.bullets.filter((_, i) => accepted[i]).map((b) => [norm(b.original), b]));
  return {
    ...resume,
    summary: useSummary && result.summary ? result.summary : resume.summary,
    experience: resume.experience.map((exp) => ({
      ...exp,
      bullets: exp.bullets.map((bullet) => {
        const current = bullet.isOptimized ? bullet.optimized : bullet.original;
        const hit = byText.get(norm(current)) || byText.get(norm(bullet.original));
        return hit ? { ...bullet, optimized: hit.optimized, isOptimized: true, keywords: hit.keywords || bullet.keywords } : bullet;
      }),
    })),
  };
}
