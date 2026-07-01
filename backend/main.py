import os
from pathlib import Path
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import HTTPException
from app.config import settings
from app.database import engine, Base

from app.job_recommender import get_all_job_portals, get_internship_portals
from app.paypal_integration import router as payments_router
from app.resume_routes import router as resume_router
from app.template_routes import router as template_router
from app.profile_routes import router as profile_router
from app.ai_routes import router as ai_router
from app.v1_routes import router as v1_router
from app.latex_routes import router as latex_router
from app.latex_engine.routes import router as latex_engine_router
from app.analytics_routes import router as analytics_router
from app.template_gallery_routes import router as template_gallery_router
from app.routes.auth_routes import router as auth_router

from app.middleware.request_id import RequestIDMiddleware
from app.middleware.timing import RequestTimingMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

try:
    Base.metadata.create_all(bind=engine)
except Exception:
    logger.warning("Table/type creation skipped (may already exist on PostgreSQL)")

app = FastAPI(title="ProfileOptimizer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RequestTimingMiddleware)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

frontend_dist_path = Path(__file__).resolve().parent / "frontend" / "dist"
if not frontend_dist_path.exists():
    frontend_dist_path = Path(__file__).resolve().parent.parent / "frontend" / "dist"
FRONTEND_DIST = frontend_dist_path if (frontend_dist_path / "index.html").exists() else None
if FRONTEND_DIST:
    logger.info("Frontend dist found at %s", FRONTEND_DIST)


@app.get("/")
def root():
    if FRONTEND_DIST:
        return FileResponse(str(FRONTEND_DIST / "index.html"), media_type="text/html")
    return {
        "app": "ProfileOptimizer API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health():
    from sqlalchemy import text
    from app.database import SessionLocal
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "version": "1.0.0",
        "database": "connected" if db_ok else "unreachable",
    }


@app.get("/api/portals/jobs")
def list_job_portals():
    return get_all_job_portals()

@app.get("/api/portals/internships")
def list_internship_portals():
    return get_internship_portals()

@app.get("/api/nav")
def get_nav_links():
    return NAV_LINKS

NAV_LINKS = [
    {"label": "Platform", "icon": "Grid3X3", "children": [
        [
            {"label": "ATS Resume Scanner", "to": "/scan", "icon": "Scan", "desc": "Score your resume in seconds", "badge": "Popular"},
            {"label": "AI Resume Builder", "to": "/templates", "icon": "FileText", "desc": "Build an ATS-friendly resume"},
            {"label": "Cover Letter Optimizer", "to": "/profile-analyzer", "icon": "MessageSquare", "desc": "Generate tailored cover letters"},
        ],
        [
            {"label": "LinkedIn Profile Audit", "to": "/profile-analyzer", "icon": "UserCheck", "desc": "Get noticed by recruiters"},
            {"label": "Job Application Tracker", "to": "/dashboard", "icon": "BarChart3", "desc": "Track applications & interviews"},
            {"label": "AI Deep Analysis", "to": "/ai-analysis", "icon": "Brain", "desc": "Advanced AI-powered insights"},
        ],
    ]},
    {"label": "Solutions", "icon": "Briefcase", "children": [
        [
            {"label": "For Job Seekers", "to": "/", "icon": "UserCheck", "desc": "Land 3x more interviews"},
            {"label": "For Hiring Managers", "to": "/pricing", "icon": "Building2", "desc": "Streamline your hiring pipeline"},
            {"label": "For Enterprise Teams", "to": "/pricing", "icon": "Building", "desc": "Enterprise-grade ATS optimization"},
        ],
    ]},
    {"label": "Learning Hub", "icon": "BookOpen", "children": [
        [
            {"label": "Career Blog", "to": "/about", "icon": "BookOpen", "desc": "Advice & guides for job seekers"},
            {"label": "Resume Templates", "to": "/templates", "icon": "Layout", "desc": "Free ATS-friendly templates"},
            {"label": "ATS Database", "to": "/about", "icon": "Database", "desc": "How ATS software works"},
        ],
        [
            {"label": "Success Stories", "to": "/about", "icon": "Sparkles", "desc": "Real results from real users"},
            {"label": "Resume Examples", "to": "/templates", "icon": "FileText", "desc": "Examples by job & industry"},
            {"label": "Pricing Plans", "to": "/pricing", "icon": "CreditCard", "desc": "Choose the right plan"},
        ],
    ]},
    {"label": "Pricing", "to": "/pricing", "icon": "CreditCard"},
]

app.include_router(auth_router)
app.include_router(payments_router)
app.include_router(resume_router)
app.include_router(template_router)
app.include_router(profile_router)
app.include_router(ai_router)
app.include_router(v1_router)
app.include_router(latex_router)
app.include_router(latex_engine_router)
app.include_router(analytics_router)
app.include_router(template_gallery_router)

if FRONTEND_DIST:
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/favicon.svg", include_in_schema=False)
    async def favicon():
        return FileResponse(str(FRONTEND_DIST / "favicon.svg"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith(("api/", "docs", "openapi", "uploads", "assets/")):
            raise HTTPException(status_code=404)
        return FileResponse(str(FRONTEND_DIST / "index.html"), media_type="text/html")
