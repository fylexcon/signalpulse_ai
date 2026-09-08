"""
Authentication service: signup, login, token refresh, logout.
Refresh tokens are stored as SHA-256 hashes and delivered via httpOnly cookies.
"""
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Set the refresh token as an httpOnly cookie."""
    response.set_cookie(
        key="refresh_token",
        value=raw_token,
        httponly=True,
        secure=get_settings().ENVIRONMENT == "production",  # Set to True in production (HTTPS)
        samesite="none" if get_settings().ENVIRONMENT == "production" else "lax",
        path="/api/v1/auth",  # Only sent to auth endpoints
        max_age=7 * 24 * 60 * 60,  # 7 days
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Clear the refresh token cookie."""
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
    )


async def signup(
    db: AsyncSession,
    data: SignupRequest,
    response: Response,
) -> TokenResponse:
    """
    Create a new user, a default organization, and issue tokens.
    """
    # Check duplicate email
    existing = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create user
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.flush()  # Get user.id

    # Create default organization
    org = Organization(
        name=f"{data.full_name}'s Workspace",
        owner_id=user.id,
    )
    db.add(org)
    await db.flush()

    # Add user as OWNER of the org
    member = OrganizationMember(
        org_id=org.id,
        user_id=user.id,
        role="OWNER",
    )
    db.add(member)

    # Issue tokens
    access_token = create_access_token({"sub": str(user.id)})
    raw_refresh, token_hash, expires_at = create_refresh_token()

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    ))

    await db.flush()

    _set_refresh_cookie(response, raw_refresh)
    return TokenResponse(access_token=access_token)


async def login(
    db: AsyncSession,
    data: LoginRequest,
    response: Response,
) -> TokenResponse:
    """
    Verify credentials and issue tokens.
    """
    result = await db.execute(
        select(User).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Issue tokens
    access_token = create_access_token({"sub": str(user.id)})
    raw_refresh, token_hash, expires_at = create_refresh_token()

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    ))
    await db.flush()

    _set_refresh_cookie(response, raw_refresh)
    return TokenResponse(access_token=access_token)


async def refresh(
    db: AsyncSession,
    raw_token: str | None,
    response: Response,
) -> TokenResponse:
    """
    Rotate refresh token: validate old token, revoke it, issue new pair.
    """
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    token_hash = hash_token(raw_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,  # noqa: E712
        )
    )
    stored_token = result.scalar_one_or_none()

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if stored_token.expires_at < datetime.now(timezone.utc):
        stored_token.revoked = True
        await db.flush()
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    # Revoke old token (rotation)
    stored_token.revoked = True

    # Issue new pair
    access_token = create_access_token({"sub": str(stored_token.user_id)})
    new_raw, new_hash, new_expires = create_refresh_token()

    db.add(RefreshToken(
        user_id=stored_token.user_id,
        token_hash=new_hash,
        expires_at=new_expires,
    ))
    await db.flush()

    _set_refresh_cookie(response, new_raw)
    return TokenResponse(access_token=access_token)


async def logout(
    db: AsyncSession,
    raw_token: str | None,
    response: Response,
) -> None:
    """
    Revoke the refresh token and clear the cookie.
    """
    if raw_token:
        token_hash = hash_token(raw_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        stored = result.scalar_one_or_none()
        if stored:
            stored.revoked = True
            await db.flush()

    _clear_refresh_cookie(response)
