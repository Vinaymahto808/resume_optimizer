export default function TermsOfService() {
  return (
    <div className="landing" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--accent)", marginBottom: 12 }}>
              <span style={{ width: 20, height: 2, borderRadius: 2, background: "var(--accent)" }} />
              Legal
            </div>
            <h1 style={{ fontSize: "clamp(28px, 3.5vw, 38px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.2, color: "var(--text)", marginBottom: 12 }}>
              Terms of Service
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Last updated: January 2026</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {sections.map((section, i) => (
              <div key={i}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{section.title}</h2>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

const sections = [
  {
    title: "Acceptance of Terms",
    content: "By accessing or using ProfileOptimizer, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service. We reserve the right to update these terms at any time.",
  },
  {
    title: "Use of Service",
    content: "ProfileOptimizer provides resume scanning, ATS analysis, and job matching tools. You agree to use the service only for lawful purposes. You may not upload resumes or content that you do not have the right to use.",
  },
  {
    title: "Account Registration",
    content: "When you create an account, you are responsible for maintaining the confidentiality of your login credentials. You must provide accurate information and keep it up to date.",
  },
  {
    title: "Intellectual Property",
    content: "The service, its original content, features, and functionality are owned by ProfileOptimizer and are protected by applicable copyright, trademark, and other intellectual property laws.",
  },
  {
    title: "User Data & Privacy",
    content: "Your resume data belongs to you. We do not train AI models on your content. We only process your data to provide the service (scoring, analysis, job matching). For full details, see our Privacy Policy.",
  },
  {
    title: "Limitation of Liability",
    content: "ProfileOptimizer provides scores and suggestions as guidance only. We do not guarantee job placements, interview callbacks, or specific outcomes. The service is provided 'as is' without warranties of any kind.",
  },
  {
    title: "Subscription & Payments",
    content: "Paid plans are billed monthly or annually as selected. You may cancel at any time. Refunds are handled on a case-by-case basis. Your subscription will continue until cancelled.",
  },
  {
    title: "Termination",
    content: "We reserve the right to suspend or terminate access to the service for violations of these terms, without prior notice. Upon termination, your right to use the service ceases immediately.",
  },
  {
    title: "Contact",
    content: "For questions about these terms, reach out to support@profileoptimizer.app.",
  },
];
