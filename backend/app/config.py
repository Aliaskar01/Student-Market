import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def normalize_database_url(url: str) -> str:
    """Use the installed psycopg 3 driver for Render's Postgres URLs."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


class Settings:
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = normalize_database_url(os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@db:5432/student_market",
    ))
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "student-marketplace-dev-secret-key-2026-change-in-prod"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))
    SESSION_SHORT_EXPIRE_DAYS: int = int(os.getenv("SESSION_SHORT_EXPIRE_DAYS", "1"))

    # Auth provider switch: "local" (PostgreSQL + JWT) or "keycloak" (OIDC)
    AUTH_PROVIDER: str = os.getenv("AUTH_PROVIDER", "local").lower()
    KEYCLOAK_SERVER_URL: str = os.getenv("KEYCLOAK_SERVER_URL", "")
    KEYCLOAK_REALM: str = os.getenv("KEYCLOAK_REALM", "")
    KEYCLOAK_CLIENT_ID: str = os.getenv("KEYCLOAK_CLIENT_ID", "")
    KEYCLOAK_AUDIENCE: str = os.getenv("KEYCLOAK_AUDIENCE", "")

    # Comma-separated allowed email domains or suffixes (e.g. ".edu,.edu.kz,kbtu.kz").
    # Empty string allows any syntactically valid email address for MVP flexibility.
    ALLOWED_EMAIL_DOMAINS: str = os.getenv("ALLOWED_EMAIL_DOMAINS", "")

    # CORS origins (comma-separated, or "*" to allow all origins safely)
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    # File upload settings for listing photos
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "5"))
    FRONTEND_DIST: str = os.getenv("FRONTEND_DIST", "")


settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
