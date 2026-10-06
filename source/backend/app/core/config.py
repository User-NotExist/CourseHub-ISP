"""Load environment configuration once, before database and OAuth setup."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str | None = os.getenv("DATABASE_URL")
    jwt_secret_key: str | None = os.getenv("JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    google_client_id: str | None = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret: str | None = os.getenv("GOOGLE_CLIENT_SECRET")
    google_redirect_uri: str | None = os.getenv("GOOGLE_REDIRECT_URI")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    cookie_secure: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    allowed_domain: str = "ku.th"


settings = Settings()
