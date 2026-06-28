import { useState, useEffect, useRef, useCallback } from "react";
import { ai } from "../api";
import ProgressStepper from "../components/ProgressStepper";
import { useResume } from "../contexts/ResumeContext";

const PLACEHOLDER_LINES = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '  <meta charset="UTF-8" />',
  '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '  <title>Portfolio</title>',
  '  <script src="https://cdn.tailwindcss.com"></script>',
  '</head>',
  '  <body class="bg-[#020617] text-slate-100">',
  '  <nav class="fixed w-full backdrop-blur-xl bg-slate-950/80 border-b border-white/10">',
  '    <div class="max-w-6xl mx-auto flex justify-between p-4 items-center">',
  '      <span class="text-xl font-bold tracking-tight text-white">Portfolio</span>',
  '      <div class="space-x-6 text-sm text-slate-300">',
  '        <a href="#about" class="hover:text-emerald-400 transition-colors">About</a>',
  '        <a href="#projects" class="hover:text-emerald-400 transition-colors">Projects</a>',
  '        <a href="#contact" class="hover:text-emerald-400 transition-colors">Contact</a>',
  '      </div>',
  '    </div>',
  '  </nav>',
  '  <section class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950">',
  '    <div class="text-center px-4">',
  '      <p class="text-xs uppercase tracking-[0.35em] text-emerald-400 mb-4">Featured Portfolio</p>',
  '      <h1 class="text-5xl sm:text-6xl font-bold tracking-tight mb-4 text-white">Hello, World!</h1>',
  '      <p class="text-lg sm:text-xl text-slate-300">Building something amazing...</p>',
  '    </div>',
  '  </section>',
  '  <section id="about" class="py-20 bg-white/5 border-y border-white/10">',
  '    <div class="max-w-4xl mx-auto px-4">',
  '      <h2 class="text-3xl font-bold mb-8 text-white">About</h2>',
  '      <p class="text-slate-300 leading-relaxed">Passionate developer creating</p>',
  '      <p class="text-slate-300 leading-relaxed">impactful digital experiences.</p>',
  '    </div>',
  '  </section>',
  '  <section id="projects" class="py-20">',
  '    <div class="max-w-6xl mx-auto px-4">',
  '      <h2 class="text-3xl font-bold mb-8 text-white">Projects</h2>',
  '      <div class="grid md:grid-cols-3 gap-6">',
  '        <div class="p-6 rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/20 backdrop-blur">',
  '          <h3 class="text-xl font-semibold mb-2 text-white">Project 1</h3>',
  '          <p class="text-slate-300">A full-stack application</p>',
  '        </div>',
  '        <div class="p-6 rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/20 backdrop-blur">',
  '          <h3 class="text-xl font-semibold mb-2 text-white">Project 2</h3>',
  '          <p class="text-slate-300">Mobile-first design system</p>',
  '        </div>',
  '        <div class="p-6 rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/20 backdrop-blur">',
  '          <h3 class="text-xl font-semibold mb-2 text-white">Project 3</h3>',
  '          <p class="text-slate-300">Cloud-native architecture</p>',
  '        </div>',
  '      </div>',
  '    </div>',
  '  </section>',
  '  <footer class="py-8 text-center text-slate-400">',
  '    <p>Built with passion &hearts;</p>',
  '  </footer>',
  '</body>',
  '</html>',
];

const TYPING_SPEED = 60;

function CodeStream({ onComplete }) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (visibleLines < PLACEHOLDER_LINES.length) {
      const timer = setTimeout(() => setVisibleLines((v) => v + 1), TYPING_SPEED);
      return () => clearTimeout(timer);
    } else if (!done) {
      setDone(true);
      onComplete?.();
    }
  }, [visibleLines, done, onComplete]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <div style={styles.streamWrap}>
      <div style={styles.streamBar}>
        <span style={styles.streamDot} />
        <span style={{ ...styles.streamDot, background: "#f59e0b" }} />
        <span style={{ ...styles.streamDot, background: "#22c55e" }} />
        <span style={styles.streamLabel}>portfolio.html</span>
      </div>
      <div ref={scrollRef} style={styles.streamBody}>
        <div style={styles.streamCursor}>
          <span style={styles.streamPrompt}>$</span> generate-portfolio --profile "resume"
        </div>
        {PLACEHOLDER_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={styles.streamLine}>
            <span style={styles.streamNum}>{String(i + 1).padStart(3, " ")}</span>
            <span style={{ color: line.startsWith("<") ? "#22c55e" : "#94a3b8" }}>{line}</span>
          </div>
        ))}
        {visibleLines < PLACEHOLDER_LINES.length && (
          <span style={styles.streamBlink}>█</span>
        )}
        {done && (
          <div style={styles.streamDone}>
            <span style={{ color: "#22c55e" }}>✓ Build complete</span> — {PLACEHOLDER_LINES.length} lines · {PLACEHOLDER_LINES.length * 1.2}s
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortfolioGenerator() {
  const { latestText } = useResume();
  const [text, setText] = useState(latestText || "");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("preview");
  const [autoFired, setAutoFired] = useState(false);
  const streamDoneRef = useRef(false);

  useEffect(() => {
    if (latestText && !autoFired && !loading && !result) {
      setAutoFired(true);
      const timer = setTimeout(() => {
        setText(latestText);
        handleGenerate(latestText);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [latestText]);

  const onStreamComplete = useCallback(() => {
    streamDoneRef.current = true;
  }, []);

  const handleGenerate = async (overrideText) => {
    const t = overrideText ?? text;
    if (!t.trim()) return;
    setLoading(true);
    setStreaming(true);
    streamDoneRef.current = false;
    setError("");
    try {
      const data = await ai.portfolio(t);
      setResult(data.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Portfolio generation failed. Make sure GROQ_API_KEY is set."
      );
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.bgGlow} />
      <h2 style={styles.title}>Portfolio Website Generator</h2>
      <p style={styles.subtitle}>
        Paste your resume content and get a complete, ready-to-use portfolio HTML page with Tailwind CSS.
      </p>

      <div className="ui-card" style={styles.card}>
        <textarea
          style={styles.textarea}
          rows={6}
          placeholder="Paste your resume text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button
          className="btn-primary"
          onClick={() => handleGenerate()}
          disabled={loading || !text.trim()}
          style={{ marginTop: 12 }}
        >
          {loading ? "Generating..." : "Generate Portfolio"}
        </button>
      </div>

      {streaming && !result && (
        <div style={{ marginTop: 24 }}>
          <ProgressStepper
            active={true}
            currentStep={0}
            estimatedSeconds={PLACEHOLDER_LINES.length * TYPING_SPEED / 1000 + 2}
          />
          <CodeStream onComplete={onStreamComplete} />
        </div>
      )}

      {result?.html && (
        <div style={styles.output}>
          <div style={styles.outputHeader}>
            <div style={styles.outputTabs}>
              <button
                style={{ ...styles.tabBtn, ...(viewMode === "preview" ? styles.tabActive : {}) }}
                onClick={() => setViewMode("preview")}
              >
                Preview
              </button>
              <button
                style={{ ...styles.tabBtn, ...(viewMode === "code" ? styles.tabActive : {}) }}
                onClick={() => setViewMode("code")}
              >
                Code
              </button>
            </div>
            <button
              style={styles.copyBtn}
              onClick={() => {
                navigator.clipboard.writeText(result.html);
                alert("HTML copied to clipboard!");
              }}
            >
              Copy HTML
            </button>
          </div>

          {viewMode === "preview" ? (
            <div style={styles.iframeWrap}>
              <iframe
                title="Portfolio Preview"
                srcDoc={result.html}
                style={styles.iframe}
                sandbox="allow-scripts"
              />
            </div>
          ) : (
            <pre style={styles.codeBlock}>{result.html}</pre>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 900, margin: "0 auto", padding: "40px 24px", position: "relative" },
  bgGlow: {
    position: "absolute", top: "20%", left: "50%", width: 500, height: 500,
    background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)",
    transform: "translate(-50%, -50%)", pointerEvents: "none",
  },
  title: { fontSize: 28, fontWeight: 700, marginBottom: 4, position: "relative" },
  subtitle: { fontSize: 14, color: "var(--text-secondary)", marginBottom: 24, position: "relative" },
  card: {
    background: "var(--bg-card)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 20, marginBottom: 16, position: "relative",
  },
  textarea: {
    width: "100%", padding: "12px 14px", background: "rgba(15,23,42,0.72)",
    border: "1px solid rgba(148,163,184,0.14)", borderRadius: "var(--radius-sm)",
    color: "var(--text)", fontSize: 14, fontFamily: "inherit",
    resize: "vertical", lineHeight: 1.7, outline: "none", boxSizing: "border-box",
  },
  error: {
    color: "var(--danger)", fontSize: 13, padding: "8px 12px",
    background: "rgba(248,113,113,0.1)", borderRadius: "var(--radius-sm)", marginTop: 12,
  },
  output: { marginTop: 24 },
  outputHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12, gap: 12,
  },
  outputTabs: { display: "flex", gap: 4, background: "rgba(148,163,184,0.08)", borderRadius: 8, padding: 3, border: "1px solid rgba(148,163,184,0.08)" },
  tabBtn: {
    padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 600, background: "transparent", color: "var(--text-secondary)",
  },
  tabActive: { background: "rgba(34,197,94,0.14)", color: "#dcfce7", boxShadow: "0 1px 3px rgba(2,6,23,0.25)" },
  copyBtn: {
    padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)",
    cursor: "pointer", fontSize: 13, fontWeight: 600,
    background: "rgba(148,163,184,0.08)", color: "var(--accent)",
  },
  iframeWrap: {
    borderRadius: "var(--radius)", overflow: "hidden",
    border: "1px solid rgba(148,163,184,0.14)", background: "rgba(10,15,28,0.82)",
  },
  iframe: { width: "100%", height: 600, border: "none" },
  codeBlock: {
    padding: 16, borderRadius: "var(--radius-sm)", overflow: "auto", maxHeight: 500,
    background: "var(--bg-card)", color: "var(--text)", fontSize: 12, lineHeight: 1.6,
    border: "1px solid var(--border)", whiteSpace: "pre-wrap", wordBreak: "break-all",
  },

  streamWrap: {
    borderRadius: "var(--radius)", overflow: "hidden",
    border: "1px solid var(--border)",
    background: "var(--bg-card)",
  },
  streamBar: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "8px 14px",
    background: "var(--bg-soft)",
    borderBottom: "1px solid var(--border)",
  },
  streamDot: {
    width: 10, height: 10, borderRadius: "50%",
    background: "#ef4444",
  },
  streamLabel: {
    marginLeft: "auto",
    fontSize: 12, color: "var(--text-muted)",
    fontFamily: "monospace",
  },
  streamBody: {
    padding: 14,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
    fontSize: 12,
    lineHeight: 1.7,
    maxHeight: 400,
    overflow: "auto",
    color: "var(--text)",
  },
  streamCursor: {
    color: "var(--text-muted)",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: "1px solid var(--border)",
  },
  streamPrompt: {
    color: "var(--success)",
    marginRight: 8,
  },
  streamLine: {
    display: "flex",
    gap: 12,
    whiteSpace: "pre",
  },
  streamNum: {
    color: "var(--text-muted)",
    opacity: 0.3,
    minWidth: 32,
    textAlign: "right",
    userSelect: "none",
  },
  streamBlink: {
    animation: "blink 1s step-end infinite",
    color: "var(--success)",
  },
  streamDone: {
    marginTop: 12,
    paddingTop: 8,
    borderTop: "1px solid var(--border)",
    color: "var(--text-muted)",
    fontSize: 11,
  },
};
