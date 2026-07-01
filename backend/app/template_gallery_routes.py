import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Template

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/templates", tags=["template-gallery"])

# ── Pydantic Schemas ──

class TemplateResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category_tags: list[str] = []
    is_premium: bool = False
    popularity: int = 0
    created_at: str

    model_config = {"from_attributes": True}

class TemplateDetailResponse(TemplateResponse):
    layout_structure_json: dict = {}
    updated_at: str

    model_config = {"from_attributes": True}

class PaginatedResponse(BaseModel):
    items: list[TemplateResponse]
    total: int
    page: int
    limit: int
    total_pages: int

class TemplateListParams(BaseModel):
    category: Optional[str] = None
    search: Optional[str] = None
    sort: str = "popular"
    page: int = 1
    limit: int = 12

# ── Seed Data ──

SEED_TEMPLATES = [
    {
        "name": "Modern Executive",
        "slug": "modern-executive",
        "description": "A sleek, contemporary design with a bold header section and clean typography. Best for senior professionals and executives who want to convey authority and modern thinking.",
        "thumbnail_url": "/assets/templates/modern-executive.png",
        "category_tags": ["modern", "professional", "executive", "single-column"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 16,
            "font_size_body": 11,
            "primary_color": "#1E293B",
            "accent_color": "#4F46E5",
            "sections": ["header", "summary", "experience", "education", "skills", "certifications"],
            "header_style": "bold-left"
        },
        "is_premium": False,
        "popularity": 95,
    },
    {
        "name": "Creative Portfolio",
        "slug": "creative-portfolio",
        "description": "A visually striking layout with accent color blocks and icon-driven section headers. Ideal for designers, marketers, and creative professionals.",
        "thumbnail_url": "/assets/templates/creative-portfolio.png",
        "category_tags": ["creative", "modern", "visual", "single-column"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 15,
            "font_size_body": 11,
            "primary_color": "#0F172A",
            "accent_color": "#F59E0B",
            "sections": ["header", "about", "portfolio", "experience", "education", "skills"],
            "header_style": "centered-accent"
        },
        "is_premium": True,
        "popularity": 88,
    },
    {
        "name": "Double Column Pro",
        "slug": "double-column-pro",
        "description": "A two-column layout that maximizes space efficiency. The left sidebar houses contact info and skills while the main column details experience. Perfect for career changers.",
        "thumbnail_url": "/assets/templates/double-column-pro.png",
        "category_tags": ["two-column", "professional", "space-efficient", "sidebar"],
        "layout_structure_json": {
            "columns": 2,
            "font_family": "Inter",
            "font_size_headings": 14,
            "font_size_body": 10.5,
            "primary_color": "#0F172A",
            "accent_color": "#10B981",
            "sections": ["sidebar", "experience", "education", "projects"],
            "sidebar_sections": ["contact", "skills", "languages", "interests"],
            "header_style": "sidebar-branded"
        },
        "is_premium": False,
        "popularity": 92,
    },
    {
        "name": "Minimalist Clean",
        "slug": "minimalist-clean",
        "description": "A pared-down, ultra-clean design with generous whitespace and minimalist section dividers. Best for academics, researchers, and those who prefer substance over style.",
        "thumbnail_url": "/assets/templates/minimalist-clean.png",
        "category_tags": ["minimalist", "clean", "academic", "single-column"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 13,
            "font_size_body": 11,
            "primary_color": "#1E293B",
            "accent_color": "#64748B",
            "sections": ["header", "summary", "experience", "publications", "education", "skills"],
            "header_style": "simple-left"
        },
        "is_premium": False,
        "popularity": 85,
    },
    {
        "name": "Tech Stack",
        "slug": "tech-stack",
        "description": "A modern layout designed for tech professionals. Features a skills heatmap, timeline-based experience, and a compact project grid. Great for engineers and developers.",
        "thumbnail_url": "/assets/templates/tech-stack.png",
        "category_tags": ["modern", "tech", "visual", "single-column", "engineering"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 14,
            "font_size_body": 11,
            "primary_color": "#0F172A",
            "accent_color": "#3B82F6",
            "sections": ["header", "skills-heatmap", "experience-timeline", "projects", "education"],
            "header_style": "tech-left"
        },
        "is_premium": True,
        "popularity": 90,
    },
    {
        "name": "Elegant Serif",
        "slug": "elegant-serif",
        "description": "A refined serif-based layout with classic proportions and ornamental section headers. Ideal for lawyers, consultants, and traditional industries.",
        "thumbnail_url": "/assets/templates/elegant-serif.png",
        "category_tags": ["traditional", "elegant", "professional", "single-column", "legal"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Merriweather",
            "font_size_headings": 15,
            "font_size_body": 11,
            "primary_color": "#1E293B",
            "accent_color": "#8B5CF6",
            "sections": ["header", "summary", "experience", "education", "publications", "affiliations"],
            "header_style": "centered-classic"
        },
        "is_premium": True,
        "popularity": 78,
    },
    {
        "name": "Sidebar Smart",
        "slug": "sidebar-smart",
        "description": "A two-column layout with a colored sidebar containing contact, skills, and profile photo. The main area features a career narrative timeline. Great for mid-career professionals.",
        "thumbnail_url": "/assets/templates/sidebar-smart.png",
        "category_tags": ["two-column", "sidebar", "modern", "visual", "professional"],
        "layout_structure_json": {
            "columns": 2,
            "font_family": "Inter",
            "font_size_headings": 14,
            "font_size_body": 11,
            "primary_color": "#0F172A",
            "accent_color": "#0EA5E9",
            "sidebar_color": "#0F172A",
            "sections": ["main-timeline", "education", "certifications"],
            "sidebar_sections": ["photo", "contact", "skills", "languages"],
            "header_style": "sidebar-dark"
        },
        "is_premium": False,
        "popularity": 82,
    },
    {
        "name": "Executive Suite",
        "slug": "executive-suite",
        "description": "A premium layout with gold accents and a refined top-of-page executive summary panel. Designed for C-suite executives and board-level professionals.",
        "thumbnail_url": "/assets/templates/executive-suite.png",
        "category_tags": ["executive", "premium", "professional", "single-column", "management"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 15,
            "font_size_body": 11,
            "primary_color": "#1E293B",
            "accent_color": "#D97706",
            "sections": ["executive-summary", "career-highlights", "experience", "board-positions", "education"],
            "header_style": "premium-centered"
        },
        "is_premium": True,
        "popularity": 74,
    },
    {
        "name": "Compact Pro",
        "slug": "compact-pro",
        "description": "A space-optimized single-column layout with condensed spacing and multi-column skill groupings. Perfect for experienced professionals with extensive work history.",
        "thumbnail_url": "/assets/templates/compact-pro.png",
        "category_tags": ["compact", "professional", "single-column", "experience-rich"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 13,
            "font_size_body": 10,
            "primary_color": "#0F172A",
            "accent_color": "#6366F1",
            "sections": ["header", "summary", "experience", "education", "skills-grid", "certifications"],
            "header_style": "compact-left"
        },
        "is_premium": False,
        "popularity": 80,
    },
    {
        "name": "Academic Research",
        "slug": "academic-research",
        "description": "A specialized layout for researchers and academics featuring publication lists, citation metrics, grant history, and teaching experience sections.",
        "thumbnail_url": "/assets/templates/academic-research.png",
        "category_tags": ["academic", "research", "traditional", "single-column", "education"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 14,
            "font_size_body": 11,
            "primary_color": "#1E293B",
            "accent_color": "#8B5CF6",
            "sections": ["header", "research-interests", "publications", "grants", "teaching", "education", "skills"],
            "header_style": "academic-left"
        },
        "is_premium": True,
        "popularity": 72,
    },
    {
        "name": "Bold Impact",
        "slug": "bold-impact",
        "description": "A high-contrast layout with large typography, prominent metrics callouts, and achievement highlights. Designed for sales professionals and results-driven roles.",
        "thumbnail_url": "/assets/templates/bold-impact.png",
        "category_tags": ["modern", "bold", "visual", "single-column", "sales"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 17,
            "font_size_body": 11,
            "primary_color": "#0F172A",
            "accent_color": "#EF4444",
            "sections": ["header", "metrics-dashboard", "experience", "education", "skills"],
            "header_style": "bold-centered"
        },
        "is_premium": False,
        "popularity": 86,
    },
    {
        "name": "Athens Classic",
        "slug": "athens-classic",
        "description": "A timeless single-column layout with subtle section shading and elegant dividers. Reliable, professional, and universally ATS-compatible.",
        "thumbnail_url": "/assets/templates/athens-classic.png",
        "category_tags": ["traditional", "classic", "professional", "single-column", "ats-friendly"],
        "layout_structure_json": {
            "columns": 1,
            "font_family": "Inter",
            "font_size_headings": 14,
            "font_size_body": 11,
            "primary_color": "#1E293B",
            "accent_color": "#475569",
            "sections": ["header", "summary", "experience", "education", "skills", "additional"],
            "header_style": "classic-left"
        },
        "is_premium": False,
        "popularity": 96,
    },
]

# ── Helper: build sort clause ──

SORT_MAP = {
    "popular": "t.popularity DESC",
    "newest": "t.created_at DESC",
    "oldest": "t.created_at ASC",
    "name": "t.name ASC",
    "name_desc": "t.name DESC",
}

def validate_sort(value: str) -> str:
    return SORT_MAP.get(value, SORT_MAP["popular"])

# ── Indexing Strategy ──
"""
Database Indexes (run manually or via Alembic migration):

    CREATE INDEX ix_templates_category_tags
        ON templates USING GIN (category_tags);

    CREATE INDEX ix_templates_slug
        ON templates (slug);

    CREATE INDEX ix_templates_is_active
        ON templates (is_active);

    CREATE INDEX ix_templates_popularity
        ON templates (popularity DESC);

    CREATE INDEX ix_templates_created_at
        ON templates (created_at DESC);

    -- PostgreSQL full-text search index (optional, for search queries)
    -- CREATE INDEX ix_templates_search
    --     ON templates USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));
"""

# ── GET /api/v1/templates ──

@router.get("", response_model=dict)
def list_templates(
    category: Optional[str] = Query(None, description="Filter by category tag"),
    search: Optional[str] = Query(None, min_length=2, max_length=100, description="Search by name or description"),
    sort: str = Query("popular", description=f"Sort mode: {', '.join(SORT_MAP.keys())}"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(12, ge=1, le=50, description="Items per page"),
    db: Session = Depends(get_db),
):
    order_clause = validate_sort(sort)
    offset = (page - 1) * limit

    conditions = ["t.is_active = :active"]
    params = {"active": True}

    if category:
        conditions.append("EXISTS (SELECT 1 FROM json_each(t.category_tags) WHERE value = :cat)")
        params["cat"] = category

    if search:
        conditions.append("(t.name LIKE :search OR t.description LIKE :search)")
        params["search"] = f"%{search}%"

    where_clause = " AND ".join(conditions)

    count_sql = f"SELECT COUNT(*) AS cnt FROM templates t WHERE {where_clause}"
    data_sql = f"""
        SELECT t.id, t.name, t.slug, t.description, t.thumbnail_url,
               t.category_tags, t.is_premium, t.popularity, t.created_at
        FROM templates t
        WHERE {where_clause}
        ORDER BY {order_clause}
        LIMIT :limit OFFSET :offset
    """

    try:
        total = db.execute(text(count_sql), params).scalar() or 0
        rows = db.execute(text(data_sql), {**params, "limit": limit, "offset": offset}).fetchall()
    except Exception as e:
        logger.error("Template list query failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch templates")

    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "name": row.name,
            "slug": row.slug,
            "description": row.description,
            "thumbnail_url": row.thumbnail_url,
            "category_tags": row.category_tags if isinstance(row.category_tags, list) else [],
            "is_premium": row.is_premium,
            "popularity": row.popularity,
            "created_at": row.created_at.isoformat() if row.created_at else "",
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
    }


# ── GET /api/v1/templates/:slug ──

@router.get("/{slug}", response_model=dict)
def get_template(slug: str, db: Session = Depends(get_db)):
    try:
        row = db.execute(
            text("""
                SELECT id, name, slug, description, thumbnail_url,
                       category_tags, layout_structure_json, is_premium,
                       popularity, created_at, updated_at
                FROM templates
                WHERE slug = :slug AND is_active = :active
                LIMIT 1
            """),
            {"slug": slug, "active": True},
        ).mappings().first()
    except Exception as e:
        logger.error("Template fetch failed for slug '%s': %s", slug, e)
        raise HTTPException(status_code=500, detail="Failed to fetch template")

    if not row:
        raise HTTPException(status_code=404, detail="Template not found")

    return {
        "id": row["id"],
        "name": row["name"],
        "slug": row["slug"],
        "description": row["description"],
        "thumbnail_url": row["thumbnail_url"],
        "category_tags": row["category_tags"] if isinstance(row["category_tags"], list) else [],
        "layout_structure_json": row["layout_structure_json"] if isinstance(row["layout_structure_json"], dict) else {},
        "is_premium": row["is_premium"],
        "popularity": row["popularity"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else "",
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else "",
    }


# ── GET /api/v1/templates/categories ──

@router.get("/meta/categories", response_model=dict)
def list_categories(db: Session = Depends(get_db)):
    try:
        rows = db.execute(
            text("""
                SELECT DISTINCT json_each.value AS category
                FROM templates t, json_each(t.category_tags)
                WHERE t.is_active = :active
                ORDER BY category ASC
            """),
            {"active": True},
        ).fetchall()
    except Exception as e:
        logger.error("Category list query failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to fetch categories")

    return {"categories": [r.category for r in rows]}


# ── POST /api/v1/templates/seed (dev-only) ──

@router.post("/seed", response_model=dict)
def seed_templates(db: Session = Depends(get_db)):
    existing = db.execute(text("SELECT COUNT(*) FROM templates")).scalar() or 0
    if existing > 0:
        return {"seeded": False, "message": "Templates already exist", "count": existing}

    from datetime import datetime
    now = datetime.utcnow()
    inserted = 0

    for tpl in SEED_TEMPLATES:
        from uuid import uuid4
        db.execute(
            text("""
                INSERT INTO templates (id, name, slug, description, thumbnail_url, category_tags,
                                       layout_structure_json, is_active, is_premium, popularity,
                                       created_at, updated_at)
                VALUES (:id, :name, :slug, :desc, :thumb, :tags, :layout, :active, :premium, :pop, :now, :now)
            """),
            {
                "id": str(uuid4()),
                "name": tpl["name"],
                "slug": tpl["slug"],
                "desc": tpl["description"],
                "thumb": tpl["thumbnail_url"],
                "tags": tpl["category_tags"],
                "layout": tpl["layout_structure_json"],
                "active": True,
                "premium": tpl.get("is_premium", False),
                "pop": tpl.get("popularity", 0),
                "now": now,
            },
        )
        inserted += 1

    db.commit()
    return {"seeded": True, "message": f"Inserted {inserted} templates", "count": inserted}
