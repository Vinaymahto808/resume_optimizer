"""Background worker: periodic job ingestion, then alert evaluation and Background Agent Mode runs.

Runs in a daemon thread started with the app. Interval is JOB_INGEST_INTERVAL_HOURS
(default 6); set JOB_INGEST_ENABLED=0 to disable (tests do this)."""
import logging
import os
import threading
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

_state = {"running": False, "last_run": None, "last_stats": None, "next_run": None}
_lock = threading.Lock()
_thread: Optional[threading.Thread] = None
_stop = threading.Event()


def status() -> dict:
    return {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in _state.items()}


def run_once(include_network: bool = True) -> dict:
    from app.career.agent_mode import run_all as run_agents
    from app.career.alerts import evaluate_all
    from app.career.ingestion import default_connectors, run_ingestion
    from app.database import SessionLocal

    if not _lock.acquire(blocking=False):
        return {"skipped": "An ingestion run is already in progress"}
    _state["running"] = True
    db = SessionLocal()
    try:
        stats = run_ingestion(db, default_connectors(include_network=include_network, db=db))
        stats["alert_hits"] = evaluate_all(db)
        stats["agent_tasks"] = run_agents(db)
        _state["last_stats"] = stats
        return stats
    finally:
        db.close()
        _state["running"] = False
        _state["last_run"] = datetime.utcnow()
        _lock.release()


def _loop(interval_s: float):
    from datetime import timedelta
    # Seed immediately (offline data), then crawl the network.
    while not _stop.is_set():
        try:
            run_once()
        except Exception as exc:
            logger.exception("Scheduled ingestion failed: %s", exc)
        _state["next_run"] = datetime.utcnow() + timedelta(seconds=interval_s)
        _stop.wait(interval_s)


def start() -> None:
    global _thread
    if os.getenv("JOB_INGEST_ENABLED", "1") == "0" or (_thread and _thread.is_alive()):
        return
    if os.getenv("VERCEL"):
        # Serverless instances freeze between requests; Vercel Cron hits /api/career/cron/ingest instead.
        return
    hours = float(os.getenv("JOB_INGEST_INTERVAL_HOURS", "6"))
    _stop.clear()
    _thread = threading.Thread(target=_loop, args=(max(0.1, hours) * 3600,), name="job-ingest", daemon=True)
    _thread.start()


def stop() -> None:
    _stop.set()
