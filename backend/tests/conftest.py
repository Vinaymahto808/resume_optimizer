import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch, PropertyMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import User, Resume, Subscription, PasswordResetToken, PlanTier, SubscriptionStatus
from app.config import settings
from app.database import Base

# -- Test data factories --

@pytest.fixture
def mock_db():
    db = MagicMock(spec=Session)
    return db


@pytest.fixture
def sample_user():
    return User(
        id=str(uuid.uuid4()),
        email="test@example.com",
        hashed_password="$2b$12$LJ3m4ys3Lk0TSwHnbfOMiOXPmK9Q8K7Xp5K7Xp5K7Xp5K7Xp5K7Xp",
        full_name="Test User",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_user_dict():
    return {
        "id": str(uuid.uuid4()),
        "email": "test@example.com",
        "full_name": "Test User",
    }


@pytest.fixture
def sample_resume(sample_user):
    return Resume(
        id=str(uuid.uuid4()),
        user_id=sample_user.id,
        filename="resume.pdf",
        file_path="/tmp/test_resume.pdf",
        ats_score=78.5,
        raw_text="Python developer with 5 years experience in machine learning and data science.",
        keywords_found="python,machine learning,data science",
        keywords_missing="docker,kubernetes,aws",
        suggestions="Add cloud experience\nAdd more quantified results",
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_subscription(sample_user):
    return Subscription(
        id=str(uuid.uuid4()),
        user_id=sample_user.id,
        plan=PlanTier.FREE,
        status=SubscriptionStatus.ACTIVE,
        current_period_end=datetime.utcnow() + timedelta(days=30),
    )


@pytest.fixture
def sample_reset_token(sample_user):
    return PasswordResetToken(
        id=str(uuid.uuid4()),
        user_id=sample_user.id,
        token="valid-reset-token-123",
        expires_at=datetime.utcnow() + timedelta(hours=1),
        used=False,
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def mock_current_user(sample_user):
    """Patch get_current_user to return sample_user."""
    patcher = patch("app.auth.get_current_user", return_value=sample_user)
    yield patcher.start()
    patcher.stop()


@pytest.fixture
def mock_get_db(mock_db):
    """Patch get_db to yield mock_db."""
    def _get_db():
        yield mock_db
    patcher = patch("app.database.get_db", _get_db)
    yield patcher.start()
    patcher.stop()


@pytest.fixture
def sample_profile_text():
    return (
        "Experienced Data Scientist with 5+ years building ML models. "
        "Proficient in Python, TensorFlow, Scikit-learn, and SQL. "
        "Built NLP pipelines for text classification using transformers and BERT. "
        "Deployed models on AWS SageMaker and GCP Vertex AI. "
        "Strong background in statistical analysis, A/B testing, and data visualization. "
        "Led cross-functional teams and communicated insights to stakeholders. "
        "Improved model accuracy by 25% and reduced inference time by 40%. "
        "Worked with healthcare datasets including clinical trial data. "
        "Certified AWS Solutions Architect. "
        "Volunteer mentor at Data Science bootcamps."
    )


@pytest.fixture
def sample_resume_text_strong():
    return (
        "Professional Summary\n"
        "Data Scientist with 5+ years of experience in machine learning and NLP.\n\n"
        "Skills\n"
        "Python, SQL, Machine Learning, Deep Learning, NLP, PyTorch, Docker, AWS\n\n"
        "Experience\n"
        "• Developed ML models improving accuracy by 35%\n"
        "• Built NLP pipelines processing 10K+ documents daily\n"
        "• Led team of 5 engineers delivering 3 major products\n"
        "• Reduced cloud costs by 40% through optimization\n"
        "• Implemented CI/CD pipeline for ML model deployment\n"
        "• Designed A/B testing framework with statistical rigor\n\n"
        "Education\n"
        "Master's in Computer Science, 2019\n"
        "Bachelor's in Engineering, 2017\n\n"
        "Contact: test@email.com | +1-555-123-4567\n"
        "Certifications: AWS Certified, Google Cloud Professional"
    )
