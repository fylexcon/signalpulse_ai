"""
Plan-based feature gating: enforces limits on entities, members, and API keys per plan.
"""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_key import ApiKey
from app.models.feedback_item import FeedbackItem
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember

# ── Plan limit definitions ──
PLAN_LIMITS: dict[str, dict[str, int | None]] = {
    "free": {"max_entities": 50, "max_members": 1, "max_api_keys": 1},
    "starter": {"max_entities": 1000, "max_members": 5, "max_api_keys": 5},
    "pro": {"max_entities": None, "max_members": None, "max_api_keys": 20},
}


def _get_limit(plan_type: str, key: str) -> int | None:
    """Get a specific limit for a plan. Returns None for unlimited."""
    return PLAN_LIMITS.get(plan_type, PLAN_LIMITS["free"]).get(key)


async def check_entity_limit(db: AsyncSession, org: Organization) -> None:
    """Raises 403 if the org has reached its entity limit."""
    limit = _get_limit(org.plan_type, "max_entities")
    if limit is None:
        return  # Unlimited

    count = await db.scalar(
        select(func.count(FeedbackItem.id)).where(FeedbackItem.org_id == org.id)
    ) or 0

    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan '{org.plan_type}' allows max {limit} entities. Please upgrade.",
        )


async def check_member_limit(db: AsyncSession, org: Organization) -> None:
    """Raises 403 if the org has reached its member limit."""
    limit = _get_limit(org.plan_type, "max_members")
    if limit is None:
        return

    count = await db.scalar(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.org_id == org.id
        )
    ) or 0

    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan '{org.plan_type}' allows max {limit} members. Please upgrade.",
        )


async def check_api_key_limit(db: AsyncSession, org: Organization) -> None:
    """Raises 403 if the org has reached its API key limit."""
    limit = _get_limit(org.plan_type, "max_api_keys")
    if limit is None:
        return

    count = await db.scalar(
        select(func.count(ApiKey.id)).where(ApiKey.org_id == org.id)
    ) or 0

    if count >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Plan '{org.plan_type}' allows max {limit} API keys. Please upgrade.",
        )


async def get_usage(db: AsyncSession, org_id: uuid.UUID) -> dict:
    """Get current usage counts for an org (for frontend display)."""
    entity_count = await db.scalar(
        select(func.count(FeedbackItem.id)).where(FeedbackItem.org_id == org_id)
    ) or 0
    member_count = await db.scalar(
        select(func.count(OrganizationMember.id)).where(
            OrganizationMember.org_id == org_id
        )
    ) or 0
    api_key_count = await db.scalar(
        select(func.count(ApiKey.id)).where(ApiKey.org_id == org_id)
    ) or 0

    return {
        "entities": entity_count,
        "members": member_count,
        "api_keys": api_key_count,
    }
