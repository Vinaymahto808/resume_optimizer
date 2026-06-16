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
};

export const payments = {
  getPrices: () => API.get("/api/payments/prices").then((r) => r.data),
  createCheckout: (data) =>
    API.post("/api/payments/create-checkout-session", data).then((r) => r.data),
  getSubscription: () =>
    API.get("/api/payments/subscription").then((r) => r.data),
  cancel: () => API.post("/api/payments/cancel").then((r) => r.data),
  paypalCreateOrder: (data) =>
    API.post("/api/payments/paypal/create-order", data).then((r) => r.data),
  paypalCaptureOrder: (data) =>
    API.post("/api/payments/paypal/capture-order", data).then((r) => r.data),
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
};
