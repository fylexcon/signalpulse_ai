import uuid
from typing import Sequence

from fastapi import HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.plan_limits import check_entity_limit
from app.models.feedback_item import FeedbackItem
from app.models.organization import Organization
from app.schemas.feedback_item import FeedbackItemCreate, FeedbackItemUpdate


async def get_items(db: AsyncSession, org_id: str) -> Sequence[FeedbackItem]:
    result = await db.execute(
        select(FeedbackItem)
        .where(FeedbackItem.org_id == org_id)
        .order_by(desc(FeedbackItem.created_at))
    )
    return result.scalars().all()


async def get_item(db: AsyncSession, item_id: str, org_id: str) -> FeedbackItem:
    result = await db.execute(
        select(FeedbackItem).where(
            FeedbackItem.id == item_id,
            FeedbackItem.org_id == org_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found"
        )
    return item


async def create_item(
    db: AsyncSession, org: Organization, data: FeedbackItemCreate
) -> FeedbackItem:
    # 1. Lock the organization row to prevent race conditions during limits check
    await db.execute(
        select(Organization).where(Organization.id == org.id).with_for_update()
    )

    # 2. Check limits
    await check_entity_limit(db, org)

    # 3. Create the entity
    item = FeedbackItem(
        org_id=org.id,
        title=data.title,
        content=data.content,
        customer_email=data.customer_email,
        source=data.source,
        category=data.category,
        sentiment=data.sentiment,
        status=data.status,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_item(
    db: AsyncSession, item_id: str, org_id: str, data: FeedbackItemUpdate
) -> FeedbackItem:
    item = await get_item(db, item_id, org_id)
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
        
    await db.commit()
    await db.refresh(item)
    return item


async def delete_item(db: AsyncSession, item_id: str, org_id: str) -> None:
    item = await get_item(db, item_id, org_id)
    await db.delete(item)
    await db.commit()
