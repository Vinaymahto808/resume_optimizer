import { useState } from "react";
import { v1 } from "../api";

export default function ProfileAnalyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await v1.analyze(text.trim());
      if (res.success) setResult(res.data);
      else setError(res.error || "Analysis failed.");
    } catch (err) {
      setError(err.response?.data?.detail || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const kwCount = result?.keywords?.length || 0;
  const sgCount = result?.suggestions?.length || 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-card)" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            LinkedIn Profile Analyzer
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.03em" }}>
            Optimize Your Profile
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 520, marginTop: 6, lineHeight: 1.6 }}>
            Paste your LinkedIn profile or resume text to get actionable suggestions and optimized content.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr 500px", gap: 24, alignItems: "start" }}>
          {/* Left: Input */}
          <div>
            <div className="ui-card" style={{ padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>
                Profile Text
              </div>
              <textarea
                className="sr-input"
                rows={12}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your LinkedIn profile text, resume, or career summary..."
                style={{ width: "100%", resize: "vertical", fontSize: 14, lineHeight: 1.6, minHeight: 280, marginBottom: 14 }}
              />
              <button className="btn-primary" onClick={handleSubmit} disabled={loading || !text.trim()}
                style={{ width: "100%", fontSize: 13, padding: "10px 0" }}>
                {loading ? "Analyzing..." : "Analyze Profile"}
              </button>
            </div>
          </div>

          {/* Right: Results */}
          <div>
            {error && (
              <div style={{
                background: "var(--danger-soft)", color: "var(--danger)",
                padding: "12px 18px", borderRadius: "var(--radius-sm)",
                fontSize: 13, marginBottom: 16, border: "1px solid rgba(239,68,68,0.2)",
              }}>{error}</div>
            )}

            {loading && (
              <div className="ui-card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>Analyzing your profile...</div>
              </div>
            )}

            {result && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Summary pills */}
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{
                    background: "var(--accent-soft)", color: "var(--accent)",
                    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 16 }}>🔑</span>
                    {kwCount} keywords
                  </div>
                  <div style={{
                    background: "var(--warning-soft)", color: "var(--warning)",
                    padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <span style={{ fontSize: 16 }}>💡</span>
                    {sgCount} suggestions
                  </div>
                </div>

                {/* Keywords */}
                {result.keywords?.length > 0 && (
                  <div className="ui-card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Keywords Detected
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {result.keywords.map((kw, i) => (
                        <span key={i} style={{
                          padding: "5px 12px", borderRadius: 6,
                          fontSize: 12, fontWeight: 500,
                          background: "var(--accent-soft)", color: "var(--accent)",
                          border: "1px solid rgba(79,70,229,0.15)",
                        }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimized Headline */}
                {result.optimized_headline && (
                  <div className="ui-card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Optimized Headline
                    </div>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: "var(--accent)",
                      lineHeight: 1.6, background: "var(--accent-soft)",
                      borderRadius: "var(--radius-sm)", padding: 12,
                      border: "1px solid rgba(79,70,229,0.1)",
                    }}>
                      {result.optimized_headline}
                    </div>
                  </div>
                )}

                {/* Optimized About */}
                {result.optimized_about && (
                  <div className="ui-card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Optimized About Section
                    </div>
                    <div style={{
                      fontSize: 13, color: "var(--text-secondary)",
                      lineHeight: 1.7,
                      background: "var(--bg-soft)",
                      borderRadius: "var(--radius-sm)", padding: 12,
                      border: "1px solid var(--border)",
                    }}>
                      {result.optimized_about}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {result.suggestions?.length > 0 && (
                  <div className="ui-card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Suggestions
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {result.suggestions.map((sg, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)",
                          background: "var(--bg-soft)", borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)", lineHeight: 1.5,
                        }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: "50%",
                            background: "var(--warning-soft)", color: "var(--warning)",
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1,
                          }}>{i + 1}</span>
                          {sg}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!result && !loading && !error && (
              <div className="ui-card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Ready when you are</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Paste your professional text on the left and click analyze.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
