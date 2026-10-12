"""Admin API for the company career boards the crawler covers ("hidden jobs" from company career pages).

Boards are public ATS feeds only: Greenhouse/Lever/Ashby/SmartRecruiters posting APIs and Workday
career-site JSON. Adding a board can optionally crawl it right away."""
import re
import threading
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.career.admin import require_admin
from app.career.ingestion import (
    AshbyConnector, GreenhouseConnector, LeverConnector, SmartRecruitersConnector, WorkdayConnector, run_ingestion,
    seed_boards,
)
from app.career.models import CompanyBoard
from app.database import SessionLocal, get_db

router = APIRouter(prefix="/api/career/admin/boards", tags=["career-admin"], dependencies=[Depends(require_admin)])

Ats = Literal["greenhouse", "lever", "ashby", "workday", "smartrecruiters"]
_SLUG_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")
_CONNECTORS = {"greenhouse": GreenhouseConnector, "lever": LeverConnector, "ashby": AshbyConnector,
               "workday": WorkdayConnector, "smartrecruiters": SmartRecruitersConnector}


def normalize_slug(ats: str, raw: str) -> str:
    """Accept a bare board token or a careers URL and return the slug the connector expects."""
    value = raw.strip().rstrip("/")
    if ats == "workday":
        parsed = WorkdayConnector.parse_board(re.sub(r"/(en-US|[a-z]{2}-[A-Z]{2})(?=/)", "", value))
        if not parsed:
            raise HTTPException(status_code=422, detail="Workday boards look like <company>.wd5.myworkdayjobs.com/<tenant>/<site>.")
        return "/".join(parsed)
    patterns = {
        "greenhouse": r"(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io/(?:embed/job_board\?for=)?([^/?#]+)",
        "lever": r"jobs\.(?:eu\.)?lever\.co/([^/?#]+)",
        "ashby": r"jobs\.ashbyhq\.com/([^/?#]+)",
        "smartrecruiters": r"(?:careers|jobs)\.smartrecruiters\.com/([^/?#]+)",
    }
    m = re.search(patterns[ats], value)
    slug = m.group(1) if m else value
    if not _SLUG_RE.match(slug):
        raise HTTPException(status_code=422, detail="Board must be a board token (letters, digits, - . _) or its careers URL.")
    return slug


def board_dict(b: CompanyBoard) -> dict:
    return {"id": b.id, "ats": b.ats, "slug": b.slug, "name": b.name, "active": bool(b.active), "source": b.source,
            "last_crawled_at": b.last_crawled_at.isoformat() if b.last_crawled_at else None,
            "last_status": b.last_status, "last_count": b.last_count,
            "created_at": b.created_at.isoformat() if b.created_at else None}


def _crawl_board(board_id: str) -> None:
    db = SessionLocal()
    try:
        board = db.get(CompanyBoard, board_id)
        if board:
            run_ingestion(db, [_CONNECTORS[board.ats]([board.slug])])
    finally:
        db.close()


class BoardCreate(BaseModel):
    ats: Ats
    slug: str = Field(min_length=2, max_length=300, description="Board token or careers-page URL")
    name: str = Field(default="", max_length=200)
    crawl_now: bool = False


class BoardUpdate(BaseModel):
    active: Optional[bool] = None
    name: Optional[str] = Field(default=None, max_length=200)


@router.get("")
def list_boards(ats: Optional[Ats] = None, db: Session = Depends(get_db)):
    seed_boards(db)
    q = db.query(CompanyBoard)
    if ats:
        q = q.filter(CompanyBoard.ats == ats)
    rows = q.order_by(CompanyBoard.ats, CompanyBoard.slug).all()
    return {"boards": [board_dict(b) for b in rows], "total": len(rows)}


@router.post("")
def add_board(body: BoardCreate, db: Session = Depends(get_db)):
    slug = normalize_slug(body.ats, body.slug)
    existing = db.query(CompanyBoard).filter(CompanyBoard.ats == body.ats).all()
    if any(b.slug.lower() == slug.lower() for b in existing):
        raise HTTPException(status_code=409, detail=f"{body.ats} board '{slug}' is already listed.")
    board = CompanyBoard(ats=body.ats, slug=slug, name=body.name.strip(), source="admin")
    db.add(board)
    db.commit()
    db.refresh(board)
    if body.crawl_now:
        threading.Thread(target=_crawl_board, args=(board.id,), daemon=True).start()
    return {"board": board_dict(board), "crawl_started": body.crawl_now}


@router.patch("/{board_id}")
def update_board(board_id: str, body: BoardUpdate, db: Session = Depends(get_db)):
    board = db.get(CompanyBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(board, key, value.strip() if isinstance(value, str) else value)
    db.commit()
    return {"board": board_dict(board)}


@router.delete("/{board_id}")
def delete_board(board_id: str, db: Session = Depends(get_db)):
    board = db.get(CompanyBoard, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    if board.source != "admin":
        # Env/default boards would be re-seeded on the next run, so deactivate instead of deleting.
        board.active = False
        db.commit()
        return {"deleted": False, "deactivated": True, "board": board_dict(board)}
    db.delete(board)
    db.commit()
    return {"deleted": True}


@router.post("/{board_id}/crawl")
def crawl_board(board_id: str, db: Session = Depends(get_db)):
    if not db.get(CompanyBoard, board_id):
        raise HTTPException(status_code=404, detail="Board not found")
    threading.Thread(target=_crawl_board, args=(board_id,), daemon=True).start()
    return {"crawl_started": True}
