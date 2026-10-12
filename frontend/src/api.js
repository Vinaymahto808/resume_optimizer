import axios from "axios";

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Career copilot (/api/career): plan paywall + credit refresh signals for PlanContext / UpgradeModal.
export const PAYWALL_EVENT = "career:paywall";
export const CREDITS_EVENT = "career:credits";
const METERED_PATHS = /^\/api\/career\/(resume\/tailor|cover-letter|auto-apply|agent\/run|interview\/|jobs\/[^/]+\/deep-match|connections\/[^/]+\/referral-message)/;

/** Readable message from an axios error (FastAPI `detail` may be a string or a validation list). */
export function apiError(err, fallback = "Something went wrong. Please try again.") {
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).filter(Boolean).join("; ") || fallback;
  return (typeof detail === "string" && detail) || err?.message || fallback;
}

/** Like apiError, but explains when the API server can't be reached (no response, or the dev proxy's 502-504). */
export function authError(err, fallback) {
  const status = err?.response?.status;
  if (!err?.response || status === 502 || status === 503 || status === 504) {
    if (import.meta.env.DEV) {
      return "Can't reach the API server. Start the backend (in resume_optimizer/backend: "
        + "uvicorn main:app --port 8000) and try again.";
    }
    return "Can't reach the server right now. Please try again in a moment.";
  }
  return apiError(err, fallback);
}

API.interceptors.response.use(
  (res) => {
    const { method, url = "" } = res.config || {};
    if (method === "post" && METERED_PATHS.test(url)) window.dispatchEvent(new Event(CREDITS_EVENT));
    return res;
  },
  (err) => {
    if (err.response?.status === 402 && (err.config?.url || "").startsWith("/api/career")) {
      window.dispatchEvent(new CustomEvent(PAYWALL_EVENT, { detail: apiError(err, "Upgrade to Turbo to continue.") }));
    }
    // A 401 on a request that carried a token means the session expired: sign out and come back here
    // after logging in. Login/register/reset answer 401 for a wrong password; the form shows that error.
    const sentToken = Boolean(err.config?.headers?.Authorization);
    const authForm = /^\/api\/auth\/(login|register|forgot-password|reset-password)/.test(err.config?.url || "");
    if (err.response?.status === 401 && sentToken && !authForm) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("plan");
      const here = window.location.pathname + window.location.search;
      if (!/^\/(login|signup|forgot-password|reset-password)\b/.test(window.location.pathname)) {
        window.location.href = `/login?next=${encodeURIComponent(here)}`;
      }
    }
    return Promise.reject(err);
  }
);

export const auth = {
  register: (data) => API.post("/api/auth/register", data).then((r) => r.data),
  login: (data) =>
    API.post("/api/auth/login", new URLSearchParams(data)).then((r) => r.data),
  me: () => API.get("/api/auth/me").then((r) => r.data),
  forgotPassword: (email) =>
    API.post("/api/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token, new_password) =>
    API.post("/api/auth/reset-password", { token, new_password }).then((r) => r.data),
  updateProfile: (data) =>
    API.put("/api/auth/me", data).then((r) => r.data),
  changePassword: (data) =>
    API.post("/api/auth/change-password", data).then((r) => r.data),
};

export const payments = {
  getPrices: () => API.get("/api/payments/prices").then((r) => r.data),
  createCheckout: (data) =>
    API.post("/api/payments/create-checkout-session", data).then((r) => r.data),
  getSubscription: () =>
    API.get("/api/payments/subscription").then((r) => r.data),
  cancel: () => API.post("/api/payments/cancel").then((r) => r.data),
};

export const resumes = {
  upload: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return API.post("/api/resumes/upload", fd).then((r) => r.data);
  },
  list: () => API.get("/api/resumes/").then((r) => r.data),
  get: (id) => API.get(`/api/resumes/${id}`).then((r) => r.data),
  delete: (id) => API.delete(`/api/resumes/${id}`).then((r) => r.data),
};

export const templates = {
  list: () => API.get("/api/templates/").then((r) => r.data),
  generate: (data) =>
    API.post("/api/templates/generate", data).then((r) => r.data),
  generatePdf: (data) =>
    API.post("/api/templates/generate-pdf", data).then((r) => r.data),
  studentPdf: (data) =>
    API.post("/api/templates/student-pdf", data, { responseType: "blob" }),
};

export const profile = {
  analyze: (text) =>
    API.post("/api/analyze", { profile_text: text }).then((r) => r.data),
  fetchLinkedIn: (url) =>
    API.post("/api/fetch-profile", { url }).then((r) => r.data),
  recommendJobs: (text) =>
    API.post("/api/recommend-jobs", { profile_text: text }).then((r) => r.data),
};

export const atsLegacy = {
  analyze: (text) =>
    API.post("/api/ats-analyze", { resume_text: text }).then((r) => r.data),
  upload: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return API.post("/api/upload-resume", fd).then((r) => r.data);
  },
};

export const ai = {
  analyze: (text) =>
    API.post("/api/ai-analyze", { profile_text: text }).then((r) => r.data),
  matchJob: (profileText, jobTitle, jobDescription) =>
    API.post("/api/ai-match", {
      profile_text: profileText,
      job_title: jobTitle,
      job_description: jobDescription,
    }).then((r) => r.data),
  suggestJobs: (text) =>
    API.post("/api/ai-suggest-jobs", { profile_text: text }).then((r) => r.data),
  roadmap: (targetRole) =>
    API.post("/api/ai-roadmap", { target_role: targetRole }).then((r) => r.data),
  portfolio: (resumeText) =>
    API.post("/api/ai-portfolio", { resume_text: resumeText }).then((r) => r.data),
  analytics: (text) =>
    API.post("/api/ai-analytics", { profile_text: text }).then((r) => r.data),
};

// === v1 Unified API (covers all landing page promises) ===
export const v1 = {
  // Resume upload with async scan
  uploadResume: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return API.post("/api/v1/upload", fd).then((r) => r.data);
  },
  // Poll scan status
  scanStatus: (taskId) =>
    API.get(`/api/v1/scan/${taskId}/status`).then((r) => r.data),

  // Profile analysis (keywords, headline, about, suggestions)
  analyze: (text) =>
    API.post("/api/v1/analyze", { profile_text: text }).then((r) => r.data),

  // AI Rewriting
  rewriteBullet: (original, jobDesc = "", context = "") =>
    API.post("/api/v1/rewrite/bullet", {
      original_text: original, job_description: jobDesc, profile_context: context,
    }).then((r) => r.data),
  rewriteHeadline: (profileText, targetRole = "") =>
    API.post("/api/v1/rewrite/headline", {
      profile_text: profileText, target_role: targetRole,
    }).then((r) => r.data),
  rewriteSummary: (profileText, targetRole = "") =>
    API.post("/api/v1/rewrite/summary", {
      profile_text: profileText, target_role: targetRole,
    }).then((r) => r.data),

  // Optimization suggestions
  suggestions: (text) =>
    API.post("/api/v1/suggestions", { profile_text: text }).then((r) => r.data),

  // LinkedIn scraping + ingestion
  scrapeLinkedIn: (url) =>
    API.post("/api/v1/linkedin/scrape", { url }).then((r) => r.data),
  ingestLinkedIn: (url) =>
    API.post("/api/v1/linkedin/ingest", { url }).then((r) => r.data),

  // Job matching
  matchJobs: (text, minMatch = 10, topN = 12) =>
    API.post("/api/v1/jobs/match", {
      profile_text: text, min_match: minMatch, top_n: topN,
    }).then((r) => r.data),
  uploadAndMatchJobs: (formData, minMatch = 10, topN = 12) =>
    API.post(`/api/v1/jobs/upload-match?min_match=${minMatch}&top_n=${topN}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  analyzeJobs: (text, topN = 5) =>
    API.post("/api/v1/jobs/analyze", {
      profile_text: text, top_n: topN,
    }).then((r) => r.data),

  // Optimization checklist / action plan
  getChecklist: (profileText) =>
    API.post("/api/v1/checklist", { profile_text: profileText }).then((r) => r.data),

  // Skill extraction & matching
  extractSkills: (text) =>
    API.post("/api/v1/skills/extract", { text }).then((r) => r.data),
  scoreSkills: (profileSkills, jobSkills) =>
    API.post("/api/v1/skills/score", {
      profile_skills: profileSkills, job_skills: jobSkills,
    }).then((r) => r.data),

  // Unified ingest (resume text + optional LinkedIn)
  ingestUnified: (resumeText, linkedinUrl = "") =>
    API.post("/api/v1/unified/ingest", {
      resume_text: resumeText, linkedin_url: linkedinUrl,
    }).then((r) => r.data),

  // Full unified scan (ingest + analyze + match + checklist)
  fullScan: (resumeText, linkedinUrl = "") =>
    API.post("/api/v1/unified/scan", {
      resume_text: resumeText, linkedin_url: linkedinUrl,
    }).then((r) => r.data),
};

export const analytics = {
  track: (event, data = {}) =>
    API.post("/api/analytics/track", { event, data }).then((r) => r.data),
  trackAnonymous: (event, data = {}) =>
    API.post("/api/analytics/track-anonymous", { event, data }).then((r) => r.data),
};

export const latex = {
  list: () => API.get("/api/latex-templates/").then((r) => r.data),
  get: (id) => API.get(`/api/latex-templates/${id}`).then((r) => r.data),
  downloadUrl: (id) => `${API.defaults.baseURL}/api/latex-templates/${id}/download`,
  previewUrl: (id) => `${API.defaults.baseURL}/api/latex-templates/${id}/preview`,
  compile: (id, substitutions) =>
    API.post(`/api/latex-templates/${id}/compile`, { substitutions }, { responseType: "blob" }).then((r) => r.data),
  search: (params = {}) =>
    API.get("/api/latex-templates/search", { params }).then((r) => r.data),
  industries: () =>
    API.get("/api/latex-templates/industries").then((r) => r.data),
  roles: () =>
    API.get("/api/latex-templates/roles").then((r) => r.data),
  styles: () =>
    API.get("/api/latex-templates/styles").then((r) => r.data),
  experienceLevels: () =>
    API.get("/api/latex-templates/experience-levels").then((r) => r.data),
  customCompile: (data) =>
    API.post("/api/latex-templates/custom-compile", data, { responseType: "blob" }).then((r) => r.data),
  analyzeJD: (data) =>
    API.post("/api/latex-templates/analyze-jd", data).then((r) => r.data),
  generateFromJD: (data) =>
    API.post("/api/latex-templates/generate-from-jd", data, { responseType: "blob" }).then((r) => r.data),
  aiOptimize: (data) =>
    API.post("/api/latex-templates/ai-optimize", data).then((r) => r.data),
};

export const portals = {
  getJobPortals: () =>
    API.get("/api/portals/jobs").then((r) => r.data),
  getInternshipPortals: () =>
    API.get("/api/portals/internships").then((r) => r.data),
  getNavLinks: () =>
    API.get("/api/nav").then((r) => r.data),
};

export const templateGallery = {
  list: (params) => API.get("/api/v1/templates", { params }).then((r) => r.data),
  get: (slug) => API.get(`/api/v1/templates/${slug}`).then((r) => r.data),
  categories: () => API.get("/api/v1/templates/meta/categories").then((r) => r.data),
};

export const autoApply = {
  tailor: (data) =>
    API.post("/api/auto-apply/tailor", data).then((r) => r.data),
  apply: (data) =>
    API.post("/api/auto-apply/apply", data).then((r) => r.data),
  extractKeywords: (jobDescription) =>
    API.post("/api/auto-apply/extract-keywords", { job_description: jobDescription }).then((r) => r.data),
  generateCoverLetter: (data) =>
    API.post("/api/auto-apply/cover-letter", data).then((r) => r.data),
  listApplications: () =>
    API.get("/api/auto-apply/applications").then((r) => r.data),
  getApplication: (id) =>
    API.get(`/api/auto-apply/applications/${id}`).then((r) => r.data),
  pipeline: (data) =>
    API.post("/api/auto-apply/pipeline", data).then((r) => r.data),
  pipelineUpload: (formData) =>
    API.post("/api/auto-apply/pipeline/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
};

// === Automation Layer (LLM, State Machine, Vault, Queue, Browser, Jobs, Analytics) ===
export const automation = {
  // LLM Executor
  llmCall: (data) =>
    API.post("/api/automation/llm/call", data).then((r) => r.data),
  llmUsage: () =>
    API.get("/api/automation/llm/usage").then((r) => r.data),

  // Prompt Registry
  listPrompts: () =>
    API.get("/api/automation/prompts").then((r) => r.data),
  renderPrompt: (data) =>
    API.post("/api/automation/prompts/render", data).then((r) => r.data),

  // Application State Machine
  createApplication: (data) =>
    API.post("/api/automation/applications", data).then((r) => r.data),
  listApplications: (params = {}) =>
    API.get("/api/automation/applications", { params }).then((r) => r.data),
  getApplication: (id) =>
    API.get(`/api/automation/applications/${id}`).then((r) => r.data),
  transitionApplication: (id, data) =>
    API.post(`/api/automation/applications/${id}/transition`, data).then((r) => r.data),
  applicationStats: () =>
    API.get("/api/automation/applications/stats").then((r) => r.data),

  // Credential Vault
  storeCredential: (data) =>
    API.post("/api/automation/credentials", data).then((r) => r.data),
  listCredentials: () =>
    API.get("/api/automation/credentials").then((r) => r.data),
  getCredential: (id) =>
    API.get(`/api/automation/credentials/${id}`).then((r) => r.data),
  deleteCredential: (id) =>
    API.delete(`/api/automation/credentials/${id}`).then((r) => r.data),

  // Job Queue
  enqueueJob: (data) =>
    API.post("/api/automation/queue/enqueue", data).then((r) => r.data),
  listQueueJobs: (params = {}) =>
    API.get("/api/automation/queue/jobs", { params }).then((r) => r.data),
  queueStats: () =>
    API.get("/api/automation/queue/stats").then((r) => r.data),

  // Job Board Search
  searchJobs: (data) =>
    API.post("/api/automation/jobs/search", data).then((r) => r.data),
  portalStatus: () =>
    API.get("/api/automation/jobs/portal-status").then((r) => r.data),

  // Browser Automation
  startBrowser: (data) =>
    API.post("/api/automation/browser/start", data).then((r) => r.data),
  browserNavigate: (sid, data) =>
    API.post(`/api/automation/browser/${sid}/navigate`, data).then((r) => r.data),
  browserFillForm: (sid, data) =>
    API.post(`/api/automation/browser/${sid}/fill-form`, data).then((r) => r.data),
  browserDetectCaptcha: (sid) =>
    API.post(`/api/automation/browser/${sid}/detect-captcha`).then((r) => r.data),
  browserScreenshot: (sid) =>
    API.post(`/api/automation/browser/${sid}/screenshot`).then((r) => r.data),
  browserSubmit: (sid) =>
    API.post(`/api/automation/browser/${sid}/submit`).then((r) => r.data),
  stopBrowser: (sid) =>
    API.delete(`/api/automation/browser/${sid}`).then((r) => r.data),

  // Notifications
  sendNotification: (data) =>
    API.post("/api/automation/notifications/send", data).then((r) => r.data),

  // Analytics
  getMetrics: () =>
    API.get("/api/automation/analytics/metrics").then((r) => r.data),
  getEvents: (params = {}) =>
    API.get("/api/automation/analytics/events", { params }).then((r) => r.data),
  flushAnalytics: () =>
    API.post("/api/automation/analytics/flush").then((r) => r.data),
};

// === Career copilot (/api/career) ===
// The JWT from the request interceptor identifies the user; the backend maps it to their career profile.
const C = "/api/career";
const data = (r) => r.data;
const form = (fields) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((item) => fd.append(k, item));
    else fd.append(k, v);
  });
  return fd;
};
const clean = (params) =>
  Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== "" && v !== null));

export const career = {
  // profile, plan & billing
  me: () => API.get(`${C}/me`).then(data),
  updateMe: (body) => API.put(`${C}/me`, body).then(data),
  plans: () => API.get(`${C}/plans`).then(data),
  checkout: (period = "monthly") => API.post(`${C}/plan/checkout`, { period }).then(data),
  upgrade: (order_id = "", period = "monthly") => API.post(`${C}/plan/upgrade`, { order_id, period }).then(data),
  cancelPlan: () => API.post(`${C}/plan/cancel`).then(data),
  upiDetails: (period = "monthly") => API.get(`${C}/payments/upi`, { params: { period } }).then(data),
  upiQrImage: () => API.get(`${C}/payments/qr-image`, { responseType: "blob" }).then((r) => URL.createObjectURL(r.data)),
  submitPayment: ({ period, utr, email, screenshot }) =>
    API.post(`${C}/payments`, form({ period, utr, email, screenshot })).then(data),
  myPayment: () => API.get(`${C}/payments/me`).then(data),
  system: () => API.get(`${C}/system`).then(data),

  // jobs
  jobs: (q = {}) => API.get(`${C}/jobs`, { params: clean(q) }).then(data),
  job: (id) => API.get(`${C}/jobs/${id}`).then(data),
  jobStats: () => API.get(`${C}/jobs/stats`).then(data),
  deepMatch: (id) => API.post(`${C}/jobs/${id}/deep-match`).then(data),
  decide: (id, decision) => API.post(`${C}/jobs/${id}/decision`, { decision }).then(data),
  resetFeed: () => API.delete(`${C}/jobs/decisions`).then(data),
  ingest: () => API.post(`${C}/jobs/ingest`).then(data),
  ingestStatus: () => API.get(`${C}/jobs/ingest/status`).then(data),
  companyInsights: (name) => API.get(`${C}/companies/insights`, { params: { name } }).then(data),

  // AI writing
  tailor: (body) => API.post(`${C}/resume/tailor`, body).then(data),
  coverLetter: (body) => API.post(`${C}/cover-letter`, body).then(data),
  interviewQuestions: (body) => API.post(`${C}/interview/questions`, body).then(data),
  interviewFeedback: (body) => API.post(`${C}/interview/feedback`, body).then(data),
  salary: (body) => API.post(`${C}/salary`, body).then(data),

  // structured resume (resume builder: the resume used for matching)
  structuredResume: () => API.get(`${C}/resume/structured`).then(data),
  saveStructuredResume: (resume) => API.put(`${C}/resume/structured`, resume).then(data),
  parseResume: ({ file, text } = {}, save = false) =>
    API.post(`${C}/resume/structured/parse`, form({ file, resume_text: text, save: String(save) })).then(data),
  recheck: (body = {}) => API.post(`${C}/resume/recheck`, body).then(data),
  exportResume: (format = "pdf", template = "classic") =>
    API.get(`${C}/resume/structured/export`, { params: { format, template }, responseType: "blob" }),

  // tracker
  applications: () => API.get(`${C}/applications`).then(data),
  createApplication: (body) => API.post(`${C}/applications`, body).then(data),
  updateApplication: (id, body) => API.patch(`${C}/applications/${id}`, body).then(data),
  deleteApplication: (id) => API.delete(`${C}/applications/${id}`).then(data),
  packet: (id) => API.get(`${C}/applications/${id}/packet`).then(data),
  autoApply: (job_id, min_match = 0) => API.post(`${C}/auto-apply`, { job_id, min_match }).then(data),

  // background agent
  agent: () => API.get(`${C}/agent`).then(data),
  updateAgent: (body) => API.put(`${C}/agent`, body).then(data),
  runAgent: () => API.post(`${C}/agent/run`).then(data),
  agentTasks: (scope = "today") => API.get(`${C}/agent/tasks`, { params: { scope } }).then(data),
  agentTask: (id) => API.get(`${C}/agent/tasks/${id}`).then(data),
  resolveAgentTask: (id, outcome, detail = "") =>
    API.post(`${C}/agent/tasks/${id}/resolve`, { outcome, detail }).then(data),

  // Sage AI coach
  chat: (message) => API.post(`${C}/copilot/chat`, { message }).then(data),
  chatHistory: () => API.get(`${C}/copilot/history`).then(data),
  clearChat: () => API.delete(`${C}/copilot/history`).then(data),

  // career knowledge base (domains, skill-gap roadmap, interview bank, RAG answers)
  kbDomains: () => API.get(`${C}/kb/domains`).then(data),
  kbDomain: (id) => API.get(`${C}/kb/domains/${encodeURIComponent(id)}`).then(data),
  kbGap: (domain) => API.post(`${C}/kb/gap`, clean({ domain })).then(data),
  kbInterview: (domain, params) => API.get(`${C}/kb/interview`, { params: clean({ domain, ...params }) }).then(data),
  kbAsk: (question, domain) => API.post(`${C}/kb/ask`, clean({ question, domain })).then(data),

  // insider connections
  connections: (company = "") => API.get(`${C}/connections`, { params: clean({ company }) }).then(data),
  addConnection: (body) => API.post(`${C}/connections`, body).then(data),
  importConnections: (file) => API.post(`${C}/connections/import`, form({ file })).then(data),
  deleteConnection: (id) => API.delete(`${C}/connections/${id}`).then(data),
  insiders: (jobId) => API.get(`${C}/jobs/${jobId}/insiders`).then(data),
  referralMessage: (connId, job_id) =>
    API.post(`${C}/connections/${connId}/referral-message`, { job_id }).then(data),

  // alerts
  alerts: () => API.get(`${C}/alerts`).then(data),
  createAlert: (body) => API.post(`${C}/alerts`, body).then(data),
  deleteAlert: (id) => API.delete(`${C}/alerts/${id}`).then(data),
  alertHits: () => API.get(`${C}/alerts/hits`).then(data),
  markHitsSeen: () => API.post(`${C}/alerts/hits/seen`).then(data),

  // Chrome extension pairing
  extensionToken: () => API.get(`${C}/extension/token`).then(data),
  createExtensionToken: () => API.post(`${C}/extension/token`).then(data),
  revokeExtensionToken: () => API.delete(`${C}/extension/token`).then(data),

  // recruiter
  recruiterDashboard: () => API.get(`${C}/recruiter/dashboard`).then(data),
  createRole: (body) => API.post(`${C}/recruiter/roles`, body).then(data),
  role: (id) => API.get(`${C}/recruiter/roles/${id}`).then(data),
  deleteRole: (id) => API.delete(`${C}/recruiter/roles/${id}`).then(data),
  addCandidates: (roleId, files = [], resumeText = "", name = "") =>
    API.post(`${C}/recruiter/roles/${roleId}/candidates`, form({ files, resume_text: resumeText, name })).then(data),
  sourceCandidates: (roleId) => API.post(`${C}/recruiter/roles/${roleId}/source`).then(data),
  candidate: (id) => API.get(`${C}/recruiter/candidates/${id}`).then(data),
  draftOutreach: (id) => API.post(`${C}/recruiter/candidates/${id}/outreach`).then(data),
  contactCandidate: (id, body) => API.post(`${C}/recruiter/candidates/${id}/contact`, body).then(data),
  updateCandidate: (id, status) => API.patch(`${C}/recruiter/candidates/${id}`, { status }).then(data),
};

/** Save a blob response (export) as a download, using the server's filename when given. */
export function saveBlob(response, fallbackName) {
  const name = /filename="([^"]+)"/.exec(response.headers?.["content-disposition"] || "")?.[1] || fallbackName;
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// === Admin (JWT of an is_admin user) ===
export const careerAdmin = {
  me: () => API.get(`${C}/admin/me`).then(data),
  system: () => API.get(`${C}/admin/system`).then(data),
  ingest: (include_network = true) => API.post(`${C}/admin/ingest`, null, { params: { include_network } }).then(data),
  users: (q = "", offset = 0) => API.get(`${C}/admin/users`, { params: { q, offset, limit: 50 } }).then(data),
  setAdmin: (userId, is_admin) => API.patch(`${C}/admin/users/${userId}`, { is_admin }).then(data),
  setPlan: (clientId, body) => API.patch(`${C}/admin/profiles/${encodeURIComponent(clientId)}/plan`, body).then(data),
  payments: (status = "pending") => API.get(`${C}/admin/payments`, { params: { status } }).then(data),
  paymentScreenshot: (id) =>
    API.get(`${C}/admin/payments/${id}/screenshot`, { responseType: "blob" }).then((r) => URL.createObjectURL(r.data)),
  approvePayment: (id) => API.post(`${C}/admin/payments/${id}/approve`).then(data),
  rejectPayment: (id, reason) => API.post(`${C}/admin/payments/${id}/reject`, { reason }).then(data),
  boards: (ats) => API.get(`${C}/admin/boards`, { params: clean({ ats }) }).then(data),
  addBoard: (body) => API.post(`${C}/admin/boards`, body).then(data),
  updateBoard: (id, body) => API.patch(`${C}/admin/boards/${id}`, body).then(data),
  deleteBoard: (id) => API.delete(`${C}/admin/boards/${id}`).then(data),
  crawlBoard: (id) => API.post(`${C}/admin/boards/${id}/crawl`).then(data),
};
