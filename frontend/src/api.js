import axios from "axios";

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
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
};

export const templateGallery = {
  list: (params) => API.get("/api/v1/templates", { params }).then((r) => r.data),
  get: (slug) => API.get(`/api/v1/templates/${slug}`).then((r) => r.data),
  categories: () => API.get("/api/v1/templates/meta/categories").then((r) => r.data),
};
