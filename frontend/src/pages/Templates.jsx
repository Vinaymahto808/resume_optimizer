import { useState, useEffect } from "react";
import { latex } from "../api";

export default function Templates() {
  const [latexTemplates, setLatexTemplates] = useState([]);
  const [latexLoading, setLatexLoading] = useState(true);
  const [compilingId, setCompilingId] = useState(null);

  useEffect(() => {
    latex.list()
      .then((res) => setLatexTemplates(res.data || []))
      .catch(() => {})
      .finally(() => setLatexLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(24px, 4vw, 48px) clamp(16px, 3vw, 24px) clamp(60px, 8vw, 80px)" }}>
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[color:var(--text)] mb-2">
          LaTeX Templates
        </h1>
        <p className="text-[color:var(--text-secondary)] text-sm sm:text-base max-w-xl mx-auto">
          Professionally typeset PDFs compiled with LaTeX. Browse, preview, and download the source or compiled PDF.
        </p>
      </div>

      {latexLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="ui-card rounded-2xl border border-[color:var(--border)] overflow-hidden animate-pulse">
              <div className="aspect-[1/1.414] bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/5 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {latexTemplates.map((t) => (
            <div
              key={t.id}
              className="group ui-card rounded-2xl border border-[color:var(--border)] overflow-hidden transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:-translate-y-1.5 hover-card"
            >
              <div className="relative p-3 sm:p-4">
                {t.has_preview ? (
                  <object
                    data={latex.previewUrl(t.id)}
                    type="application/pdf"
                    className="w-full aspect-[1/1.414] rounded-lg bg-[#fafafa]"
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="w-full h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
                      Preview not available
                    </div>
                  </object>
                ) : (
                  <div className="w-full aspect-[1/1.414] rounded-lg bg-[rgba(148,163,184,0.05)] flex items-center justify-center text-sm text-[var(--text-muted)] border border-[var(--border)]">
                    No preview
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex items-end justify-center pb-6 gap-2">
                  <a
                    href={latex.downloadUrl(t.id)}
                    download
                    className="bg-[rgba(8,15,28,0.92)] text-[#dcfce7] font-semibold text-xs px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 cursor-pointer border border-[rgba(34,197,94,0.24)] no-underline"
                  >
                    Download .tex
                  </a>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setCompilingId(t.id);
                      try {
                        const blob = await latex.compile(t.id, {});
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${t.id}-resume.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch {
                        alert("Compilation failed. Check server logs.");
                      } finally {
                        setCompilingId(null);
                      }
                    }}
                    disabled={compilingId === t.id}
                    className="bg-[rgba(8,15,28,0.92)] text-[#dcfce7] font-semibold text-xs px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 cursor-pointer border border-[rgba(34,197,94,0.24)] disabled:opacity-50"
                  >
                    {compilingId === t.id ? "Compiling…" : "Compile PDF"}
                  </button>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {t.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-[rgba(99,102,241,0.12)] text-[#c7d2fe]">
                      {tag}
                    </span>
                  ))}
                  <span className="ml-auto text-[10px] text-[color:var(--text-muted)] font-medium">LaTeX</span>
                </div>
                <h3 className="text-base font-semibold text-[color:var(--text)]">{t.name}</h3>
                <p className="text-xs text-[color:var(--text-secondary)] mt-1 line-clamp-2">{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
