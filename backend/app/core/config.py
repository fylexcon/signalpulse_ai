"""
Application settings loaded from environment variables via pydantic-settings.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"

    # ── Database ──
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # ── JWT ──
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Stripe ──
    STRIPE_SECRET_KEY: str = "sk_test_..."
    STRIPE_WEBHOOK_SECRET: str = "whsec_..."
    STRIPE_STARTER_PRICE_ID: str = "price_starter_dummy"
    STRIPE_PRO_PRICE_ID: str = "price_pro_dummy"

    # ── AI ──
    OPENAI_API_KEY: str | None = None

    # ── Frontend ──
    FRONTEND_URL: str = "http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
