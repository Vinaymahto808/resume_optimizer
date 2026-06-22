# Session Context: ProfileOptimizer — ATS Resume Checker

## Architecture
- **Backend**: FastAPI + SQLAlchemy + SQLite (`backend/`)
- **Frontend**: React + Vite + Axios (`frontend/`)
- **Ports**: Backend `localhost:8000`, Frontend `localhost:5173`

## Theme (Enhancv-Inspired Light, applied 2026-06-16)
- Switched from dark coral → light mint/indigo
- **CSS variables** in `frontend/src/index.css`:
  - `--accent: #10b981` (mint/emerald primary)
  - `--accent-gradient: linear-gradient(135deg, #10b981, #34d399)`
  - `--accent-indigo: #4f46e5` (secondary label color)
  - `--success: #059669` (deep emerald), `--warning: #f59e0b`, `--danger: #ef4444`
  - `--text: #1f2937` (dark slate), `--text-secondary: #475569`, `--text-muted: #94a3b8`
  - `--bg-card: #ffffff`, `--border: #e2e8f0`
  - Body: radial gradient with mint (`#ecfdf5`) in top-left and lavender (`#e9d5ff`) in bottom-right
  - `--shadow-sm` / `--shadow-md` for card elevation
- All hardcoded coral (`#ff6b4a`/`#ff8a6a`/`rgba(255,107,74,…)`) → mint equivalents
- All hardcoded dark-theme white transparencies → light-theme black transparencies or CSS vars
- Navbar: white translucent (`rgba(255,255,255,0.9)`) with backdrop blur + `var(--border)` bottom

## Password Rules
- ≥12 chars, uppercase, lowercase, number, special char, no spaces
- Enforced in `app/auth.py`
- bcrypt 4.1.3 (downgraded from 5.0.0 for passlib compat on Python 3.10.11)

## Forgot/Reset Password
- No email service configured; token returned in API response
- `PasswordResetToken` model (token, expires_at=1h, used flag)
- `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`
- Frontend: `ForgotPassword.jsx`, `ResetPassword.jsx`

## Results Page (`frontend/src/pages/Results.jsx`)
Unified post-scan dashboard showing:
- **Score header**: circle + color badge + 4 breakdown bars
- **Skills & Keywords**: category bars + matched skill tags
- **Suggestions**: actionable list
- **ATS Parsing**: 4-phase grid (Conversion → NLP → Classification → Scoring)
- **Recommended Jobs**: portal badges, match %, matched/missing skills, links
- **LinkedIn Profile**: optimized headline, about, suggestions, strength bar
- Fetches from `GET /api/resumes/{id}`, then `/api/recommend-jobs` and `/api/analyze`

## Results page data flow
- `resumes.get(id)` → `data.breakdown` (now recalculated from file, was empty `{}`)
- `data.category_breakdown` → flat `{Category: {matched, count, total, score}}` from `keyword_match_analysis`
- `profile.recommendJobs(raw_text)` → `{success, data: [{job, match_pct, matched_skills, missing_skills}]}`
- `profile.analyze(raw_text)` → `{success, data: {keywords, suggestions, optimized_headline, optimized_about}}`

## Key Backend Files
- `backend/main.py` — all routes (health, auth, forgot/reset, resume, AI, payments)
- `backend/app/auth.py` — registration/login/password-reset logic + validation
- `backend/app/models.py` — User, Subscription, Resume, PasswordResetToken
- `backend/app/resume_routes.py` — Upload/List/Get/Delete with ATS scoring (`GET` now recalculates breakdown)
- `backend/app/ats_scorer.py` — 4-category ATS scoring (formatting, keywords, experience, compatibility)
- `backend/app/profile_analyzer.py` — keyword analysis + headline/about generation + suggestions
- `backend/app/job_recommender.py` — 50+ sample jobs from 13 portals + skill matching
- `backend/app/profile_routes.py` — `/api/analyze`, `/api/recommend-jobs`, `/api/upload-resume`
- `backend/app/ai_routes.py` — AI analysis endpoints

## Key Frontend Files
- `frontend/src/index.css` — CSS variables, button/input classes, body gradient bg
- `frontend/src/api.js` — Axios client (auth, resumes, profile, payments, templates, ai)
- `frontend/src/App.jsx` — Route definitions
- `frontend/src/pages/Results.jsx` — Post-scan unified dashboard
- `frontend/src/pages/Home.jsx` — Landing page (hero, features, 19-point grid, AI, jobs, testimonials, FAQ)
- `frontend/src/pages/Scan.jsx` — Resume upload
- `frontend/src/pages/JobRecommender.jsx` — Job recommendations with file upload
- `frontend/src/pages/ProfileAnalyzer.jsx` — LinkedIn/profile text analysis
- `frontend/src/pages/Dashboard.jsx` — User dashboard
- `frontend/src/components/Navbar.jsx` — Sticky nav with backdrop blur

## Database
- SQLite: `backend/ats_resume.db`
- No email service configured

## Verification
- Build: `npx vite build` (runs from `frontend/`)
- Server: `uvicorn main:app --reload` (runs from `backend/`)
