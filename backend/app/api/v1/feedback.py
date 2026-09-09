from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_org, require_org_role
from app.core.database import get_db
from app.models.organization import Organization
from app.schemas.feedback_item import FeedbackItemCreate, FeedbackItemUpdate, FeedbackItemResponse
from app.services import feedback_service

router = APIRouter()


@router.get("/{org_id}/feedback", response_model=List[FeedbackItemResponse])
async def list_feedback_items(
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db)
):
    """List all feedback items for the organization."""
    return await feedback_service.get_items(db, org.id)


@router.post("/{org_id}/feedback", response_model=FeedbackItemResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback_item(
    data: FeedbackItemCreate,
    org: Organization = Depends(require_org_role(["OWNER", "ADMIN", "MEMBER"])),
    db: AsyncSession = Depends(get_db)
):
    """Create a new feedback item (counts against plan limits)."""
    return await feedback_service.create_item(db, org, data)


@router.get("/{org_id}/feedback/{item_id}", response_model=FeedbackItemResponse)
async def get_feedback_item(
    item_id: str,
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific feedback item."""
    return await feedback_service.get_item(db, item_id, org.id)


@router.patch("/{org_id}/feedback/{item_id}", response_model=FeedbackItemResponse)
async def update_feedback_item(
    item_id: str,
    data: FeedbackItemUpdate,
    org: Organization = Depends(require_org_role(["OWNER", "ADMIN", "MEMBER"])),
    db: AsyncSession = Depends(get_db)
):
    """Update a feedback item."""
    return await feedback_service.update_item(db, item_id, org.id, data)


@router.delete("/{org_id}/feedback/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feedback_item(
    item_id: str,
    org: Organization = Depends(require_org_role(["OWNER", "ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    """Delete a feedback item."""
    await feedback_service.delete_item(db, item_id, org.id)
