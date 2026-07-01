# Session Context: ProfileOptimizer — ATS Resume Checker

## Architecture
- **Backend**: FastAPI + SQLAlchemy + SQLite (`backend/`)
- **Frontend**: React + Vite + Axios (`frontend/`)
- **Ports**: Backend `localhost:8000`, Frontend `localhost:5173`

## HeroSection Component (`frontend/src/components/HeroSection.jsx`, added 2026-06-29)
- Standalone premium hero section replicating Enhancv resume checker design
- **Navbar**: sticky translucent header, logo left, centered nav links (Resume/Cover Letter with dropdown chevrons, For Organizations, Pricing), "My Documents" emerald CTA button
- **Two-column grid** (desktop) / stacked (mobile): left content + right analytics card
- **Left column**: uppercase "RESUME CHECKER" badge, `"Is your resume good enough?"` headline with emerald gradient word, description paragraph with "27 crucial checks" highlight, drag-and-drop zone with "Upload Your Resume" button, privacy guarantee (lock icon), social proof (avatar stack, star rating, "5,289+ happy customers")
- **Right column**: floating "Resume Score Report" card with SVG score ring (87%), 4 breakdown progress bars (Content Quality 82%, Keyword Match 74%, Formatting 94%, Section Completeness 100%), issues list (amber alert icon), "View Full Report" button, "AI Verified" floating badge
- Uses only Tailwind CSS utility classes + lucide-react icons — no dependency on project CSS variables
- `anim-in` Tailwind v4 animation classes for card entrance
- z-index stacking: header 50, hero content below

## Premium SVG Decorative Elements (added 2026-06-29)
- **Floating PDF decorators** re-styled as realistic document pages: white bg (`#F8FAFC`), subtle border (`#E2E8F0`), gradient header bands, sidebars, score dots, content lines — each SVG is self-contained with its own `<defs>` for gradient URLs
- **Hero decorative grid pattern**: two overlapping grid SVGs (indigo left, emerald right) using SVG `<pattern>` element, placed behind hero content
- **Process section dots**: repeating dot pattern SVG in bottom-left
- **Jobs section animated bubbles**: three `<circle>` elements with `<animate>` attribute for breathing effect (radius oscillation)
- **CTA section glow rings**: concentric circles with `stroke` + optional `<animate>` for subtle expansion
- All decorative elements use `pointer-events: none` and `aria-hidden="true"`, low opacity (0.03–0.06) for subtlety
- Premium micro-classes: `.card-glow` (hover border glow via `::before` pseudo-element), `.process-step-shimmer` (animated gradient sweep on hover), `.hero-bg-pattern` (grid SVG container)

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
- `backend/main.py` — all routes (health, auth, forgot/reset, resume, AI, payments, template gallery)
- `backend/app/auth.py` — registration/login/password-reset logic + validation
- `backend/app/models.py` — User, Subscription, Resume, PasswordResetToken, Template
- `backend/app/resume_routes.py` — Upload/List/Get/Delete with ATS scoring (`GET` now recalculates breakdown)
- `backend/app/ats_scorer.py` — 4-category ATS scoring (formatting, keywords, experience, compatibility)
- `backend/app/profile_analyzer.py` — keyword analysis + headline/about generation + suggestions
- `backend/app/job_recommender.py` — 50+ sample jobs from 13 portals + skill matching
- `backend/app/profile_routes.py` — `/api/analyze`, `/api/recommend-jobs`, `/api/upload-resume`
- `backend/app/ai_routes.py` — AI analysis endpoints
- `backend/app/template_gallery_routes.py` — Database-backed template gallery API (`/api/v1/templates`)

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
- Tests: `source .venv/bin/activate && python -m pytest tests/ -v --tb=short` (from `backend/`)
- Coverage: `source .venv/bin/activate && python -m pytest tests/ --cov=app --cov-report=term-missing` (from `backend/`)

## Test Suite (328 passing)
- **All 328 tests pass** (279 non-route + 49 route/payment endpoint tests)
- **Core module coverage**: `ats_analyzer.py` 100%, `auth.py` 100%, `config.py` 100%, `database.py` 100%, `job_recommender.py` 100%, `models.py` 100%, `ats_scorer.py` 98%, `resume_parser.py` 97%, `gemini_helper.py` 96%, `profile_analyzer.py` 95%, `resume_routes.py` 91%
- **Route/payment tests fixed**: replaced `@patch("module.get_current_user")` (which doesn't work with `Depends()`) with `app.dependency_overrides[]` — `Depends()` captures the original function reference at import time, so module-level patching doesn't intercept the dependency injection
- **AI match text length fix**: increased test profile_text from `"python"` (6 chars) to `"python developer with ML skills"` (30 chars) to satisfy pydantic `min_length=10`
- **Overall app coverage**: 54% (328 tests) — core modules are well-covered; drag from 9 large low-coverage non-core modules (`template_routes.py` 28%, `rewrite_service.py` 12%, `v1_routes.py` 38%, etc.)

## Test Architecture
- All external deps mocked (no real DB/network/filesystem)
- `tests/conftest.py` — shared fixtures (`mock_db`, `sample_user`, etc.)
- Lazy imports (pdfplumber, pypypdf, docx, fitz, pytesseract, PIL, google.generativeai, pdfminer) mocked via `patch.dict("sys.modules", {"module": MagicMock()})`
- `Depends`-based auth: use `app.dependency_overrides[get_current_user]`, never `@patch` on the module attribute
