"""
LinkedIn Job Search Configuration model.
Stores user's job search preferences (replaces AIHawk's config.yaml).
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime,
    ForeignKey, Text, JSON,
)
from app.database import Base


class LinkedInJobSearchConfig(Base):
    __tablename__ = "linkedin_job_search_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    positions = Column(JSON, default=list)
    locations = Column(JSON, default=list)
    remote = Column(Boolean, default=True)

    experience_levels = Column(JSON, default=lambda: {
        "internship": False, "entry": True, "associate": True,
        "mid-senior level": True, "director": False, "executive": False,
    })

    job_types = Column(JSON, default=lambda: {
        "full-time": True, "contract": False, "part-time": False,
        "temporary": False, "internship": False, "other": False, "volunteer": False,
    })

    date_filter = Column(String, default="month")
    distance = Column(Integer, default=100)
    apply_once_at_company = Column(Boolean, default=True)

    company_blacklist = Column(JSON, default=list)
    title_blacklist = Column(JSON, default=list)
    location_blacklist = Column(JSON, default=list)

    min_applicants = Column(Integer, default=0)
    max_applicants = Column(Integer, default=50)

    llm_model_type = Column(String, default="openai")
    llm_model = Column(String, default="gpt-4o-mini")
    llm_api_url = Column(String, nullable=True)
    llm_api_key = Column(Text, nullable=True)

    resume_path = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LinkedInApplicationProfile(Base):
    __tablename__ = "linkedin_application_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    personal_information = Column(JSON, default=dict)
    education_details = Column(JSON, default=list)
    experience_details = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    achievements = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    languages = Column(JSON, default=list)
    interests = Column(JSON, default=list)
    availability = Column(JSON, default=dict)
    salary_expectations = Column(JSON, default=dict)
    self_identification = Column(JSON, default=dict)
    legal_authorization = Column(JSON, default=dict)
    work_preferences = Column(JSON, default=dict)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
