import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

# Vercel Functions: only /tmp is writable, and it is per instance and temporary.
ON_VERCEL = bool(os.getenv("VERCEL"))
if ON_VERCEL and not os.getenv("DATABASE_URL"):
    sys.exit("FATAL: set DATABASE_URL to a Postgres database; SQLite can't persist on Vercel")

def _resolve_secret_key() -> str:
    key = os.getenv("SECRET_KEY", "")
    if key:
        return key
    if ON_VERCEL:
        # The deployed bundle is read-only, and a per-instance random key would break every session.
        sys.exit("FATAL: set SECRET_KEY in the Vercel project's environment variables")
    env_path = Path(".env")
    env_lines = env_path.read_text().splitlines() if env_path.exists() else []
    for line in env_lines:
        if line.startswith("SECRET_KEY=") and len(line.split("=", 1)[1]) > 10:
            return line.split("=", 1)[1]
    import secrets as _secrets
    generated = _secrets.token_urlsafe(48)
    if env_path.exists():
        content = env_path.read_text()
        if "SECRET_KEY=" not in content:
            env_path.write_text(content.rstrip() + f"\nSECRET_KEY={generated}\n")
    else:
        env_path.write_text(f"SECRET_KEY={generated}\n")
    load_dotenv(override=True)
    os.environ["SECRET_KEY"] = generated
    print(f"[config] Auto-generated SECRET_KEY and saved to .env")
    return generated

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # SQLAlchemy 2 only accepts the "postgresql://" scheme; some hosts hand out "postgres://".
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ats_resume.db").replace("postgres://", "postgresql://", 1)
    SECRET_KEY: str = _resolve_secret_key()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "/tmp/uploads" if ON_VERCEL else "uploads"
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
    )
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
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
