"""
FastAPI application entry point.
"""
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.database import engine

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Startup: verify DB connection
    async with engine.begin() as conn:
        await conn.run_sync(lambda _: None)
    yield
    # Shutdown: dispose engine
    await engine.dispose()


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="B2B Micro-SaaS API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,  # Required for httpOnly cookie refresh tokens
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health Check ──
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}


# ── Register Routers (imported after app creation to avoid circular imports) ──
from app.api.v1 import auth, organizations, feedback, api_keys, subscriptions, public  # noqa: E402

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(organizations.router, prefix="/api/v1/organizations", tags=["Organizations"])
app.include_router(feedback.router, prefix="/api/v1/orgs", tags=["Feedback"])
app.include_router(api_keys.router, prefix="/api/v1/orgs", tags=["API Keys"])
app.include_router(subscriptions.router, prefix="/api/v1", tags=["Subscriptions"])
app.include_router(public.router, prefix="/api/v1/public", tags=["Public API"])
