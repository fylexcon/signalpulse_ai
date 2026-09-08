"""
Auth API routes: signup, login, refresh (cookie-based), logout, me.
"""
from fastapi import APIRouter, Cookie, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse
from app.services import auth_service

router = APIRouter()


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    data: SignupRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user. Creates a default workspace and issues tokens."""
    return await auth_service.signup(db, data, response)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate and receive access token. Refresh token set via httpOnly cookie."""
    return await auth_service.login(db, data, response)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    """
    Rotate refresh token. The old refresh token (from httpOnly cookie) is revoked
    and a new pair is issued. No request body needed — cookie is sent automatically.
    """
    return await auth_service.refresh(db, refresh_token, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    """Revoke the refresh token and clear the cookie."""
    await auth_service.logout(db, refresh_token, response)


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_active_user),
):
    """Return the currently authenticated user."""
    return UserResponse.model_validate(user)
