export default function TermsOfService() {
  return (
    <div className="landing" style={{ minHeight: "100vh" }}>
      <section style={{ padding: "80px 24px", background: "#F8FAFC" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#2563EB", marginBottom: 12 }}>
              <span style={{ width: 20, height: 2, borderRadius: 2, background: "#2563EB" }} />
              Legal
            </div>
            <h1 style={{ fontSize: "clamp(32px, 4vw, 44px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, color: "#0F172A", marginBottom: 12 }}>
              Terms of Service
            </h1>
            <p style={{ fontSize: 14, color: "#64748B" }}>Last updated: June 26, 2026</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {[
              {
                title: "Acceptance",
                content: "By using ProfileOptimizer, you agree to these terms. If you do not agree, do not use the service. We reserve the right to update these terms at any time; continued use constitutes acceptance of changes."
              },
              {
                title: "Account registration",
                content: "You must provide a valid email address and choose a strong password meeting our requirements (12+ characters with mixed case, number, and special character). You are responsible for maintaining the confidentiality of your account credentials."
              },
              {
                title: "Acceptable use",
                content: "You agree to use ProfileOptimizer only for lawful purposes and in a way that does not infringe the rights of others. You may not upload resumes containing malicious code, attempt to reverse-engineer the scoring engine, or circumvent payment requirements."
              },
              {
                title: "Resume data",
                content: "You retain full ownership of your resume data. ProfileOptimizer is granted a limited license to process, store, and display your data solely to provide the service. We do not claim any intellectual property rights over your resume content."
              },
              {
                title: "AI analysis",
                content: "AI-powered suggestions are provided as guidance only and may contain errors or inaccuracies. They are not professional career advice. You should exercise your own judgment when revising your resume."
              },
              {
                title: "Payment & billing",
                content: "Paid plans are billed monthly or annually as selected at checkout. You may cancel at any time — access continues until the end of the current billing period. Refunds are handled on a case-by-case basis. Prices are subject to change with 30 days notice."
              },
              {
                title: "Service availability",
                content: "We aim for 99.9% uptime but do not guarantee uninterrupted access. We are not liable for damages arising from service interruptions, data loss, or unauthorized access resulting from your failure to follow security best practices."
              },
              {
                title: "Limitation of liability",
                content: "ProfileOptimizer is provided 'as is' without warranties of any kind. In no event shall ProfileOptimizer be liable for any indirect, incidental, or consequential damages arising from your use of the service."
              },
              {
                title: "Termination",
                content: "We may suspend or terminate accounts for violations of these terms. You may terminate your account at any time from your settings. Upon termination, your data will be deleted within 30 days."
              },
              {
                title: "Governing law",
                content: "These terms are governed by the laws of the State of California. Any disputes shall be resolved in the courts of San Francisco County, California."
              },
            ].map((s) => (
              <div key={s.title}>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>{s.title}</h2>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7 }}>{s.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
