export default function PrivacyPolicy() {
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
              Privacy Policy
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
    title: "What We Collect",
    content: "We collect data you provide: your name, email address, and resume content you upload. We also collect basic usage data (page views, feature usage) to improve the service. We do not collect sensitive personal data beyond what you choose to include in your resume.",
  },
  {
    title: "How We Use Your Data",
    content: "Your resume content is used to: generate ATS scores and breakdowns, analyze keywords and skills, match you with relevant job openings, and generate improvement suggestions. We do not use your data to train AI models or share it with third parties for advertising.",
  },
  {
    title: "Data Storage & Security",
    content: "Your data is stored securely using industry-standard encryption (AES-256 at rest, TLS 1.3 in transit). We retain your resume data for as long as your account is active. You can delete your account and all associated data at any time from your account settings.",
  },
  {
    title: "Data Sharing",
    content: "We do not sell your personal data. We may share anonymized, aggregated data for analytics purposes. We may disclose data if required by law or to protect our legal rights. Job matching features use only keywords extracted from your resume, not the full document.",
  },
  {
    title: "Your Rights",
    content: "You have the right to: access your data, correct inaccurate data, delete your data and account, export your data in a portable format, and withdraw consent at any time. To exercise these rights, visit your account settings or contact support@profileoptimizer.app.",
  },
  {
    title: "Cookies",
    content: "We use essential cookies for authentication and basic functionality. We also use analytics cookies to understand how the service is used. You can disable cookies in your browser settings, though some features may not function properly.",
  },
  {
    title: "Third-Party Services",
    content: "We use Stripe for payment processing and standard cloud hosting providers. These services have their own privacy policies and data handling practices. We do not control and are not responsible for their data practices.",
  },
  {
    title: "Changes to This Policy",
    content: "We may update this policy from time to time. Material changes will be notified via email or through the service. Continued use after changes constitutes acceptance of the updated policy.",
  },
  {
    title: "Contact",
    content: "For privacy-related questions, contact privacy@profileoptimizer.app or write to our data protection officer at the registered address listed on our website.",
  },
];
