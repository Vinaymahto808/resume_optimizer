import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from app.middleware.error_handler import ErrorHandlerMiddleware

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
app.add_middleware(ErrorHandlerMiddleware)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@app.get("/")
def root():
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
