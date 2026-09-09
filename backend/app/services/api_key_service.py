"""
API Key service: generate, list, revoke — org-scoped.
Raw key is returned only on creation and never stored.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_api_key
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreateResponse, ApiKeyResponse


async def create_api_key(
    db: AsyncSession,
    org_id: uuid.UUID,
    data: ApiKeyCreate,
) -> ApiKeyCreateResponse:
    """Generate a new API key. Returns the raw key once."""
    raw_key, key_hash = generate_api_key()

    api_key = ApiKey(
        org_id=org_id,
        key_hash=key_hash,
        label=data.label,
        permissions=data.permissions or {},
    )
    db.add(api_key)
    await db.flush()
    await db.refresh(api_key)

    return ApiKeyCreateResponse(
        id=api_key.id,
        label=api_key.label,
        raw_key=raw_key,
        permissions=api_key.permissions,
        created_at=api_key.created_at,
    )


async def list_api_keys(
    db: AsyncSession,
    org_id: uuid.UUID,
) -> list[ApiKeyResponse]:
    """List all API keys for an org — keys are masked."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.org_id == org_id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()

    return [
        ApiKeyResponse(
            id=k.id,
            label=k.label,
            key_prefix=f"sk_live_{'*' * 8}",  # Never expose real hash
            permissions=k.permissions,
            last_used_at=k.last_used_at,
            created_at=k.created_at,
        )
        for k in keys
    ]


async def revoke_api_key(
    db: AsyncSession,
    org_id: uuid.UUID,
    key_id: uuid.UUID,
) -> None:
    """Revoke (delete) an API key — org-scoped."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.org_id == org_id,
            ApiKey.id == key_id,
        )
    )
    api_key = result.scalar_one_or_none()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )
    await db.delete(api_key)
    await db.flush()
