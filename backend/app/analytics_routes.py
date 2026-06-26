import os
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user
from app.models import User
from app.config import settings

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

class AnalyticsEvent(BaseModel):
    event: str
    data: dict = {}

@router.post("/track")
def track_event(
    body: AnalyticsEvent,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event_data = {
        "event": body.event,
        "user_id": user.id,
        "email": user.email,
        **body.data,
    }
    _log_event(event_data)
    return {"status": "ok"}


@router.post("/track-anonymous")
def track_anonymous(body: AnalyticsEvent):
    event_data = {
        "event": body.event,
        "anonymous": True,
        **body.data,
    }
    _log_event(event_data)
    return {"status": "ok"}


@router.post("/ga4")
async def proxy_ga4(body: dict):
    if not settings.GA_MEASUREMENT_ID or not settings.GA_API_SECRET:
        raise HTTPException(status_code=501, detail="GA4 not configured")
    url = (
        f"https://www.google-analytics.com/mp/collect"
        f"?measurement_id={settings.GA_MEASUREMENT_ID}"
        f"&api_secret={settings.GA_API_SECRET}"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=body)
    return {"status": resp.status_code}


def _log_event(event_data: dict):
    log_line = json.dumps(event_data)
    log_file = os.path.join(os.path.dirname(__file__), "..", "analytics.log")
    try:
        with open(log_file, "a") as f:
            f.write(log_line + "\n")
    except OSError:
        pass
