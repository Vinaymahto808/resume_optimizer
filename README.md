# ATS Resume Checker & Profile Optimizer

A full-stack application that analyzes resumes for ATS (Applicant Tracking System) compatibility, provides keyword gap analysis, recommends jobs, and optimizes LinkedIn profiles using AI.

## Features

- **ATS Resume Scanner** — Upload PDF/DOCX resumes, get a 0–100 ATS score with breakdown (formatting, keywords, experience, compatibility)
- **Keyword Category Analysis** — Matched skills visualized by category (Languages, ML & AI, Data & Analytics, Cloud & DevOps, etc.) with progress bars
- **Job Recommendations** — Auto-fetches relevant job matches based on resume content with match percentage
- **Profile Analyzer** — Paste or fetch LinkedIn profile text for keyword analysis, strengths/gaps, optimized headline, and About section
- **AI Deep Analysis** — Gemini-powered profile analysis, job matching, and job suggestions
- **Resume Builder** — LaTeX-based template engine with Minimal (free) and Professional (PRO) templates
- **User Auth** — JWT-based signup/login with password validation
- **Subscription Plans** — Free (1 scan/mo), Pro ($10/mo), Enterprise ($30/mo) via Stripe
- **Dark Modern UI** — Glassmorphism cards, gradient accents, animated hero dashboard

## Tech Stack

```
Frontend           Backend            Infrastructure
├─ React 19        ├─ FastAPI         ├─ Render
├─ Vite 8          ├─ SQLAlchemy      ├─ PostgreSQL / SQLite
├─ React Router 7  ├─ Pydantic v2     ├─ Stripe
├─ Axios           ├─ JWT (python-jose)├─ Gemini API
└─ Stripe.js       └─ Gemini SDK      └─ GitHub
```

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌───────────┐  ┌──────────┐  ┌─────────────────────────┐  │
│  │  Home /   │  │  Scan /  │  │  Analyzer / Jobs / AI   │  │
│  │  Pricing  │  │  Results │  │  (tool pages)           │  │
│  └─────┬─────┘  └────┬─────┘  └───────────┬─────────────┘  │
│        │              │                    │                │
│        └──────────────┴────────────────────┘                │
│                         │ Axios (JWT Bearer)                │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              FastAPI Backend (port 8000)                     │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │
│  │ Auth     │  │ Resume   │  │ Profile  │  │ AI (Gemini) │ │
│  │ Routes   │  │ Routes   │  │ Routes   │  │ Routes      │ │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├─────────────┤ │
│  │ /api/    │  │ /api/    │  │ /api/    │  │ /api/       │ │
│  │ auth/*   │  │ resumes/*│  │ analyze  │  │ ai-*        │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘ │
│       │              │             │               │        │
│       ▼              ▼             ▼               ▼        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            Service / Business Layer                  │    │
│  │  ats_scorer   profile_analyzer   job_recommender    │    │
│  │  gemini_helper linkedin_scraper  resume_parser      │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SQLAlchemy ORM → SQLite (dev) / PostgreSQL (prod)  │   │
│  │  Tables: users, subscriptions, resumes              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  External: Stripe API ← → /api/payments/*                    │
│  External: Gemini API ← → /api/ai-*                         │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
ats-resume-checker/
├── backend/                     # FastAPI Python backend
│   ├── main.py                  # App entry, CORS, route registration
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env.example
│   └── app/
│       ├── config.py            # Settings from env vars
│       ├── database.py          # SQLAlchemy engine + session
│       ├── models.py            # User, Subscription, Resume ORM models
│       ├── auth.py              # JWT auth, password hashing, reg/login
│       ├── ats_scorer.py        # ATS score calculation engine
│       ├── profile_analyzer.py  # Keyword categories, strengths, headline gen
│       ├── job_recommender.py   # 30+ sample jobs with skill matching
│       ├── gemini_helper.py     # Gemini AI integration wrapper
│       ├── linkedin_scraper.py  # LinkedIn profile text fetcher
│       ├── resume_parser.py     # PDF/DOCX text extraction
│       ├── stripe_integration.py# Pricing plans, checkout, webhooks
│       ├── resume_routes.py     # CRUD + upload + category analysis
│       ├── profile_routes.py    # Profile analyze, job recommend, ATS legacy
│       ├── ai_routes.py         # AI analyze, match, suggest jobs
│       └── template_routes.py   # Resume template list + LaTeX generation
│
├── frontend/                    # React + Vite SPA
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx             # React entry
│       ├── App.jsx              # Router + AuthContext provider
│       ├── api.js               # Axios client (auth, resumes, profile, ai...)
│       ├── index.css            # Dark theme CSS variables + animations
│       ├── contexts/AuthContext.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── ResumeBuilder.jsx
│       └── pages/
│           ├── Home.jsx         # Hero + tool cards + floating dashboard
│           ├── Login.jsx
│           ├── Signup.jsx
│           ├── Dashboard.jsx
│           ├── Scan.jsx         # Resume upload
│           ├── Results.jsx      # ATS score + category breakdown + jobs
│           ├── Pricing.jsx      # Free / Pro $10 / Enterprise $30
│           ├── Templates.jsx    # Resume template gallery
│           ├── ProfileAnalyzer.jsx
│           ├── JobRecommender.jsx
│           └── AIAnalysis.jsx
│
├── render.yaml                  # Render Blueprint (API + frontend + DB)
├── .gitignore
├── .env.example
└── README.md
```

## Setup (Local Development)

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Configure env
cp .env.example .env
# Edit .env — add GROQ_API_KEY, STRIPE keys (optional for core flow)

uvicorn main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | No | `sqlite:///./ats_resume.db` | PostgreSQL for prod |
| `SECRET_KEY` | No | `change-this...` | JWT signing secret |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated |
| `STRIPE_SECRET_KEY` | For payments | — | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | For payments | — | Stripe webhook secret |
| `GROQ_API_KEY` | For AI | — | Groq API key (get at https://console.groq.com/keys) |

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login (form-encoded) |
| GET | `/api/auth/me` | JWT | Current user |
| POST | `/api/resumes/upload` | JWT | Upload resume → ATS score |
| GET | `/api/resumes/` | JWT | List resumes |
| GET | `/api/resumes/{id}` | JWT | Resume detail + category breakdown |
| DELETE | `/api/resumes/{id}` | JWT | Delete resume |
| GET | `/api/payments/prices` | — | Pricing plans |
| POST | `/api/payments/create-checkout-session` | JWT | Stripe checkout / free plan |
| POST | `/api/payments/webhook` | — | Stripe webhook |
| GET | `/api/payments/subscription` | JWT | User subscription |
| POST | `/api/payments/cancel` | JWT | Cancel subscription |
| GET | `/api/templates/` | — | Resume templates |
| POST | `/api/templates/generate` | JWT | Generate LaTeX resume |
| POST | `/api/analyze` | — | Profile keyword analysis |
| POST | `/api/recommend-jobs` | — | Job recommendations |
| POST | `/api/ats-analyze` | — | Legacy ATS analysis |
| POST | `/api/fetch-profile` | — | Fetch LinkedIn profile |
| POST | `/api/upload-resume` | — | Legacy resume upload |
| POST | `/api/ai-analyze` | — | Gemini profile analysis |
| POST | `/api/ai-match` | — | Gemini job match |
| POST | `/api/ai-suggest-jobs` | — | Gemini job suggestions |
| GET | `/api/health` | — | Health check |

## Deployment (Render)

Push to GitHub, then use the Render Blueprint:

```bash
render blueprint apply
```

Or set up manually:
- **API Web Service**: Python 3, `pip install -r backend/requirements.txt`, start `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Frontend Static Site**: build `cd frontend && npm install && npm run build`, publish `frontend/dist`, rewrite `/*` → `/index.html`
- **PostgreSQL**: Create via Render Dashboard, set as `DATABASE_URL`
- **Env vars**: `SECRET_KEY`, `CORS_ORIGINS`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GROQ_API_KEY`, `VITE_API_URL`

### GoDaddy Domain

In GoDaddy DNS: `CNAME` `www` → `your-app.onrender.com`
In Render: add custom domain in frontend service settings.
