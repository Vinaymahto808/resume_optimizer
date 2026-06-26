export default function PrivacyPolicy() {
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
              Privacy Policy
            </h1>
            <p style={{ fontSize: 14, color: "#64748B" }}>Last updated: June 26, 2026</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {[
              {
                title: "Information we collect",
                content: "When you upload a resume, we process its text content to generate ATS scores, keyword analysis, and improvement suggestions. We store your uploaded file and the resulting analysis so you can revisit past results. If you create an account, we store your email address and a securely-hashed password."
              },
              {
                title: "How we use your information",
                content: "Your resume text is used exclusively to power the ATS scoring engine, keyword analysis, job matching, and AI-powered suggestions. We do not train machine learning models on your resume data. We do not sell or share your personal information with third parties for their own marketing purposes."
              },
              {
                title: "Data retention & deletion",
                content: "Your resume data is stored until you delete it. You can delete individual scans from your dashboard, or delete your entire account — all associated data is permanently removed within 30 days. Account deletion is self-service from your settings page."
              },
              {
                title: "Cookies",
                content: "We use essential cookies for authentication and session management. We do not use tracking cookies or third-party analytics cookies. You can disable cookies in your browser, but some features may not work correctly."
              },
              {
                title: "Third-party services",
                content: "We use Stripe for payment processing — Stripe receives your payment information and billing details according to their own privacy policy. We use Google Gemini API for AI-powered suggestions; the minimum necessary text is sent for analysis and is not stored by Google for training purposes."
              },
              {
                title: "Security",
                content: "All connections are encrypted via TLS 1.3. Passwords are hashed using bcrypt. We regularly audit our dependencies for vulnerabilities. Despite these measures, no online service is 100% secure."
              },
              {
                title: "Changes to this policy",
                content: "We may update this policy from time to time. Material changes will be notified via email if you have an account, or via a notice on our website. Continued use after changes constitutes acceptance."
              },
              {
                title: "Contact",
                content: "Questions about this policy? Email us at support@profileoptimizer.app."
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
