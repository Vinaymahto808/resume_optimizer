import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ats_resume.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "uploads"
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_ENVIRONMENT: str = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "job-matches")
    PAYPAL_CLIENT_ID: str = os.getenv("PAYPAL_CLIENT_ID", "")
    PAYPAL_CLIENT_SECRET: str = os.getenv("PAYPAL_CLIENT_SECRET", "")
    PAYPAL_MODE: str = os.getenv("PAYPAL_MODE", "sandbox")
    RUN_ENV: str = os.getenv("RUN_ENV", "development")

    # Analytics / GTM
    GTM_ID: str = os.getenv("GTM_ID", "GTM-PHXK9HX")
    GA_MEASUREMENT_ID: str = os.getenv("GA_MEASUREMENT_ID", "")
    GA_API_SECRET: str = os.getenv("GA_API_SECRET", "")

    # Email / SMTP
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@profileoptimizer.com")
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "ProfileOptimizer")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    POSTMARK_API_TOKEN: str = os.getenv("POSTMARK_API_TOKEN", "")

    # LaTeX
    LATEX_TIMEOUT: int = int(os.getenv("LATEX_TIMEOUT", "60"))

    def check_secret_key(self):
        if self.RUN_ENV == "production" and not self.SECRET_KEY:
            sys.exit("FATAL: SECRET_KEY must be set in production mode")

settings = Settings()
settings.check_secret_key()

TEMPLATES_DIR: str = str(Path(__file__).resolve().parent / "latex_templates")
