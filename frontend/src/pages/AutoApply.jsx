import { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { autoApply, resumes } from "../api";

export default function AutoApply() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("tailor");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [userName, setUserName] = useState(user?.full_name || "");
  const [currentRole, setCurrentRole] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [applications, setApplications] = useState([]);
  const fileRef = useRef();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await resumes.upload(file);
      if (data.raw_text) {
        setResumeText(data.raw_text);
      } else if (data.success && data.data?.raw_text) {
        setResumeText(data.data.raw_text);
      }
    } catch (err) {
      setError("Failed to upload resume. Please paste the text manually.");
    }
    setLoading(false);
  };

  const handleTailor = async () => {
    if (!resumeText || !jobDescription) {
      setError("Please provide both resume text and job description.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await autoApply.tailor({
        resume_text: resumeText,
        job_description: jobDescription,
        company_name: companyName,
        job_title: jobTitle,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to tailor resume. Please try again.");
    }
    setLoading(false);
  };

  const handleAutoApply = async () => {
    if (!resumeText || !jobDescription) {
      setError("Please provide both resume text and job description.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await autoApply.apply({
        resume_text: resumeText,
        job_description: jobDescription,
        company_name: companyName,
        job_title: jobTitle,
        user_name: userName,
        current_role: currentRole,
        experience: experience,
        skills: skills,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to process application. Please try again.");
    }
    setLoading(false);
  };

  const handleExtractKeywords = async () => {
    if (!jobDescription) {
      setError("Please provide a job description.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await autoApply.extractKeywords(jobDescription);
      setResult({ keywords: data });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to extract keywords.");
    }
    setLoading(false);
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobDescription || !companyName || !jobTitle) {
      setError("Please provide job description, company name, and job title.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await autoApply.generateCoverLetter({
        user_name: userName,
        current_role: currentRole,
        experience: experience,
        skills: skills,
        company_name: companyName,
        job_title: jobTitle,
        job_description: jobDescription,
      });
      setResult({ coverLetter: data });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate cover letter.");
    }
    setLoading(false);
  };

  const handleLoadApplications = async () => {
    setLoading(true);
    try {
      const data = await autoApply.listApplications();
      setApplications(data.applications || []);
    } catch (err) {
      setError("Failed to load applications.");
    }
    setLoading(false);
  };

  const tabs = [
    { id: "tailor", label: "Tailor Resume", icon: "..." },
    { id: "apply", label: "Auto Apply", icon: "..." },
    { id: "keywords", label: "Extract Keywords", icon: "..." },
    { id: "cover", label: "Cover Letter", icon: "..." },
    { id: "history", label: "Applications", icon: "..." },
  ];

  return (
    <div className="auto-apply-page">
      <style>{`
        .auto-apply-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .aa-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .aa-header h1 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text, #1f2937);
          margin: 0 0 8px;
        }
        .aa-header p {
          color: var(--text-secondary, #475569);
          font-size: 15px;
          margin: 0;
        }
        .aa-tabs {
          display: flex;
          gap: 4px;
          background: var(--bg-card, #fff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          overflow-x: auto;
        }
        .aa-tab {
          flex: 1;
          padding: 10px 16px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary, #475569);
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .aa-tab.active {
          background: var(--accent, #10b981);
          color: white;
        }
        .aa-tab:hover:not(.active) {
          background: var(--border, #e2e8f0);
        }
        .aa-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .aa-grid { grid-template-columns: 1fr; }
        }
        .aa-card {
          background: var(--bg-card, #fff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          padding: 20px;
        }
        .aa-card h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--text, #1f2937);
          margin: 0 0 12px;
        }
        .aa-card.full-width {
          grid-column: 1 / -1;
        }
        .aa-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary, #475569);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .aa-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          font-size: 14px;
          color: var(--text, #1f2937);
          background: var(--bg-card, #fff);
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .aa-input:focus {
          outline: none;
          border-color: var(--accent, #10b981);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
        .aa-textarea {
          min-height: 150px;
          resize: vertical;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          line-height: 1.5;
        }
        .aa-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .aa-btn-primary {
          background: var(--accent, #10b981);
          color: white;
        }
        .aa-btn-primary:hover { opacity: 0.9; }
        .aa-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .aa-btn-secondary {
          background: var(--border, #e2e8f0);
          color: var(--text, #1f2937);
        }
        .aa-btn-secondary:hover { background: #d1d5db; }
        .aa-btn-group {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }
        .aa-upload-zone {
          border: 2px dashed var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 12px;
        }
        .aa-upload-zone:hover {
          border-color: var(--accent, #10b981);
          background: rgba(16, 185, 129, 0.03);
        }
        .aa-upload-zone p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary, #475569);
        }
        .aa-result-card {
          background: var(--bg-card, #fff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          padding: 20px;
          margin-top: 20px;
        }
        .aa-result-card h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text, #1f2937);
          margin: 0 0 12px;
        }
        .aa-score-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 700;
          color: white;
          margin: 0 auto 16px;
        }
        .aa-score-high { background: linear-gradient(135deg, #10b981, #059669); }
        .aa-score-mid { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .aa-score-low { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .aa-keyword-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .aa-keyword {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          background: rgba(16, 185, 129, 0.08);
          color: #059669;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .aa-changes-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .aa-changes-list li {
          padding: 8px 0;
          border-bottom: 1px solid var(--border, #e2e8f0);
          font-size: 13px;
          color: var(--text, #1f2937);
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .aa-changes-list li::before {
          content: "✓";
          color: #10b981;
          font-weight: 700;
          flex-shrink: 0;
        }
        .aa-cover-letter {
          background: #f8fafc;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          padding: 16px;
          font-size: 14px;
          line-height: 1.7;
          color: var(--text, #1f2937);
          white-space: pre-wrap;
        }
        .aa-app-card {
          background: var(--bg-card, #fff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .aa-app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .aa-app-title {
          font-weight: 600;
          color: var(--text, #1f2937);
        }
        .aa-status-badge {
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
        }
        .aa-status-completed {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }
        .aa-app-meta {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
        }
        .aa-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px;
          color: #dc2626;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .aa-loading {
          text-align: center;
          padding: 40px;
          color: var(--text-secondary, #475569);
        }
        .aa-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border, #e2e8f0);
          border-top-color: var(--accent, #10b981);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .aa-json-view {
          background: #1e293b;
          color: #e2e8f0;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          overflow-x: auto;
          white-space: pre-wrap;
          max-height: 300px;
          overflow-y: auto;
        }
      `}</style>

      <div className="aa-header">
        <h1>Auto Apply System</h1>
        <p>Tailor your resume, extract keywords, generate cover letters, and track applications — all powered by AI</p>
      </div>

      {error && <div className="aa-error">{error}</div>}

      <div className="aa-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`aa-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.id); if (tab.id === "history") handleLoadApplications(); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Input Section */}
      <div className="aa-grid" style={{ marginBottom: 20 }}>
        <div className="aa-card">
          <h3>Your Master Resume</h3>
          <div className="aa-upload-zone" onClick={() => fileRef.current?.click()}>
            <p>Click to upload PDF/DOCX or paste below</p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" style={{ display: "none" }} onChange={handleFileUpload} />
          <textarea
            className="aa-input aa-textarea"
            placeholder="Paste your resume text here..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            style={{ minHeight: 180 }}
          />
        </div>
        <div className="aa-card">
          <h3>Job Description</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label className="aa-label">Company</label>
              <input className="aa-input" placeholder="e.g. Google" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="aa-label">Job Title</label>
              <input className="aa-input" placeholder="e.g. Software Engineer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
          </div>
          <textarea
            className="aa-input aa-textarea"
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            style={{ minHeight: 220 }}
          />
        </div>
      </div>

      {/* Profile Info (for cover letter) */}
      {activeTab === "cover" && (
        <div className="aa-card full-width" style={{ marginBottom: 20 }}>
          <h3>Your Profile Info (for Cover Letter)</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label className="aa-label">Your Name</label>
              <input className="aa-input" placeholder="John Doe" value={userName} onChange={(e) => setUserName(e.target.value)} />
            </div>
            <div>
              <label className="aa-label">Current Role</label>
              <input className="aa-input" placeholder="Software Engineer" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} />
            </div>
            <div>
              <label className="aa-label">Experience</label>
              <input className="aa-input" placeholder="3+ years" value={experience} onChange={(e) => setExperience(e.target.value)} />
            </div>
            <div>
              <label className="aa-label">Key Skills</label>
              <input className="aa-input" placeholder="Python, React, AWS" value={skills} onChange={(e) => setSkills(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="aa-btn-group" style={{ justifyContent: "center", marginBottom: 20 }}>
        {activeTab === "tailor" && (
          <button className="aa-btn aa-btn-primary" onClick={handleTailor} disabled={loading}>
            {loading ? "Processing..." : "Tailor Resume"}
          </button>
        )}
        {activeTab === "apply" && (
          <button className="aa-btn aa-btn-primary" onClick={handleAutoApply} disabled={loading}>
            {loading ? "Processing..." : "Run Full Auto Apply"}
          </button>
        )}
        {activeTab === "keywords" && (
          <button className="aa-btn aa-btn-primary" onClick={handleExtractKeywords} disabled={loading}>
            {loading ? "Processing..." : "Extract Keywords"}
          </button>
        )}
        {activeTab === "cover" && (
          <button className="aa-btn aa-btn-primary" onClick={handleGenerateCoverLetter} disabled={loading}>
            {loading ? "Processing..." : "Generate Cover Letter"}
          </button>
        )}
        {activeTab === "history" && (
          <button className="aa-btn aa-btn-primary" onClick={handleLoadApplications} disabled={loading}>
            {loading ? "Loading..." : "Refresh Applications"}
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="aa-loading">
          <div className="aa-spinner" />
          <p>AI is processing your request...</p>
        </div>
      )}

      {/* Results */}
      {!loading && result && activeTab === "tailor" && result.match_score !== undefined && (
        <div className="aa-result-card">
          <div className={`aa-score-circle ${result.match_score >= 70 ? "aa-score-high" : result.match_score >= 40 ? "aa-score-mid" : "aa-score-low"}`}>
            {result.match_score}%
          </div>
          <h3 style={{ textAlign: "center" }}>ATS Match Score</h3>
          <div className="aa-grid" style={{ marginTop: 16 }}>
            <div>
              <h3 style={{ fontSize: 14 }}>Changes Made</h3>
              <ul className="aa-changes-list">
                {(result.changes_made || []).map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: 14 }}>Keywords Added</h3>
              <div className="aa-keyword-list">
                {(result.keywords_added || []).map((kw, i) => <span key={i} className="aa-keyword">{kw}</span>)}
              </div>
            </div>
          </div>
          {result.tailored_resume && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14 }}>Tailored Resume</h3>
              <div className="aa-cover-letter">{result.tailored_resume}</div>
            </div>
          )}
        </div>
      )}

      {!loading && result && activeTab === "tailor" && result.jd_keywords && (
        <div className="aa-result-card">
          <h3>JD Keywords Analysis</h3>
          <div className="aa-grid" style={{ marginTop: 12 }}>
            <div>
              <h3 style={{ fontSize: 14 }}>Technical Skills ({(result.technical_skills || []).length})</h3>
              <div className="aa-keyword-list">
                {(result.technical_skills || []).map((kw, i) => <span key={i} className="aa-keyword">{kw}</span>)}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 14 }}>Soft Skills ({(result.soft_skills || []).length})</h3>
              <div className="aa-keyword-list">
                {(result.soft_skills || []).map((kw, i) => <span key={i} className="aa-keyword">{kw}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && result && activeTab === "apply" && result.application && (
        <div className="aa-result-card">
          <h3>Application Summary</h3>
          <div className="aa-app-card">
            <div className="aa-app-header">
              <span className="aa-app-title">{result.application.job_title} @ {result.application.company}</span>
              <span className="aa-status-badge aa-status-completed">Completed</span>
            </div>
            <div className="aa-app-meta">ID: {result.application.application_id} | {result.application.submitted_at}</div>
          </div>
          <div className="aa-grid" style={{ marginTop: 16 }}>
            <div>
              <h3 style={{ fontSize: 14 }}>ATS Match</h3>
              <div className={`aa-score-circle ${result.application.summary?.ats_match_score >= 70 ? "aa-score-high" : "aa-score-mid"}`} style={{ width: 60, height: 60, fontSize: 18 }}>
                {result.application.summary?.ats_match_score || 0}%
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 14 }}>Steps Completed</h3>
              <ul className="aa-changes-list">
                <li>Keyword Extraction: {result.application.steps?.keyword_extraction?.status}</li>
                <li>Resume Tailoring: {result.application.steps?.resume_tailoring?.status}</li>
                <li>Cover Letter: {result.application.steps?.cover_letter?.status}</li>
              </ul>
            </div>
          </div>
          {result.application.steps?.resume_tailoring?.data?.tailored_resume && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14 }}>Tailored Resume</h3>
              <div className="aa-cover-letter">{result.application.steps.resume_tailoring.data.tailored_resume}</div>
            </div>
          )}
          {result.application.steps?.cover_letter?.data?.cover_letter && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14 }}>Cover Letter</h3>
              <div className="aa-cover-letter">{result.application.steps.cover_letter.data.cover_letter}</div>
            </div>
          )}
        </div>
      )}

      {!loading && result && activeTab === "keywords" && result.keywords && (
        <div className="aa-result-card">
          <h3>Extracted Keywords</h3>
          <div className="aa-grid" style={{ marginTop: 12 }}>
            <div>
              <h3 style={{ fontSize: 14 }}>Technical Skills ({(result.keywords.technical_skills || []).length})</h3>
              <div className="aa-keyword-list">
                {(result.keywords.technical_skills || []).map((kw, i) => <span key={i} className="aa-keyword">{kw}</span>)}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 14 }}>Soft Skills ({(result.keywords.soft_skills || []).length})</h3>
              <div className="aa-keyword-list">
                {(result.keywords.soft_skills || []).map((kw, i) => <span key={i} className="aa-keyword">{kw}</span>)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 14 }}>Resume Keywords ({(result.keywords.resume_keywords || []).length})</h3>
            <div className="aa-keyword-list">
              {(result.keywords.resume_keywords || []).map((kw, i) => <span key={i} className="aa-keyword">{kw}</span>)}
            </div>
          </div>
          <div className="aa-grid" style={{ marginTop: 16 }}>
            <div>
              <h3 style={{ fontSize: 14 }}>Role Level</h3>
              <span className="aa-keyword">{result.keywords.role_level || "Not determined"}</span>
            </div>
            <div>
              <h3 style={{ fontSize: 14 }}>Qualifications</h3>
              <div className="aa-keyword-list">
                {(result.keywords.qualifications || []).map((q, i) => <span key={i} className="aa-keyword">{q}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && result && activeTab === "cover" && result.coverLetter && (
        <div className="aa-result-card">
          <h3>Generated Cover Letter</h3>
          <div className="aa-cover-letter">{result.coverLetter.cover_letter}</div>
          {result.coverLetter.key_points && result.coverLetter.key_points.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14 }}>Key Selling Points</h3>
              <ul className="aa-changes-list">
                {result.coverLetter.key_points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && !loading && (
        <div>
          {applications.length === 0 ? (
            <div className="aa-card" style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "var(--text-secondary, #475569)" }}>No applications yet. Run an auto-apply to get started.</p>
            </div>
          ) : (
            applications.map((app, i) => (
              <div key={i} className="aa-app-card">
                <div className="aa-app-header">
                  <span className="aa-app-title">{app.job_title} @ {app.company}</span>
                  <span className={`aa-status-badge ${app.status === "completed" ? "aa-status-completed" : ""}`}>{app.status}</span>
                </div>
                <div className="aa-app-meta">
                  ID: {app.application_id} | Score: {app.summary?.ats_match_score || 0}% | {app.submitted_at}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
