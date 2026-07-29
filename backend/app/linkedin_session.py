"""
LinkedIn Automation Session model.
Tracks active and completed automation runs.
"""

import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, DateTime, ForeignKey, Text, JSON,
)
from sqlalchemy.orm import relationship
from app.database import Base


class SessionStatus(str, enum.Enum):
    IDLE = "idle"
    LOGGING_IN = "logging_in"
    SEARCHING = "searching"
    APPLYING = "applying"
    PAUSED = "paused"
    STOPPING = "stopping"
    COMPLETED = "completed"
    ERROR = "error"


class LinkedInAutomationSession(Base):
    __tablename__ = "linkedin_automation_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    config_id = Column(String, ForeignKey("linkedin_job_search_configs.id"), nullable=True)

    status = Column(String, default=SessionStatus.IDLE)
    browser_session_id = Column(String, nullable=True)

    total_jobs_found = Column(Integer, default=0)
    total_applied = Column(Integer, default=0)
    total_skipped = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)

    current_position = Column(String, nullable=True)
    current_location = Column(String, nullable=True)
    current_page = Column(Integer, default=0)

    last_page_url = Column(String, nullable=True)
    error_message = Column(Text, nullable=True)

    logs = Column(JSON, default=list)

    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
