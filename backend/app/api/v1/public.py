from fastapi import APIRouter, Depends, HTTPException, status, Header, BackgroundTasks, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.core.security import hash_token
from app.models.api_key import ApiKey
from app.models.organization import Organization
from app.schemas.feedback_item import FeedbackItemCreate, FeedbackItemResponse
from app.services import feedback_service
from app.services.ai_service import triage_feedback_async

router = APIRouter()

# Create a module-level limiter that extracts X-API-Key or falls back to IP
def get_api_key_or_ip(request: Request) -> str:
    api_key = request.headers.get("x-api-key")
    if api_key:
        return hash_token(api_key)
    return get_remote_address(request)

limiter = Limiter(key_func=get_api_key_or_ip)


async def get_org_from_api_key(
    x_api_key: str = Header(..., description="The API Key for the organization"),
    db: AsyncSession = Depends(get_db)
) -> Organization:
    """Validate X-API-Key and return the associated Organization."""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key missing")
        
    hashed_key = hash_token(x_api_key)
    
    result = await db.execute(
        select(ApiKey).where(ApiKey.key_hash == hashed_key)
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API Key")
        
    # Get organization
    org_result = await db.execute(
        select(Organization).where(Organization.id == api_key.org_id)
    )
    org = org_result.scalar_one_or_none()
    
    if not org:
        raise HTTPException(status_code=401, detail="Organization not found")
        
    return org


@router.post("/feedback", response_model=FeedbackItemResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("60/minute")
async def create_public_feedback(
    request: Request,
    data: FeedbackItemCreate,
    background_tasks: BackgroundTasks,
    org: Organization = Depends(get_org_from_api_key),
    db: AsyncSession = Depends(get_db)
):
    """
    Public ingestion endpoint for feedback.
    Validates API key, checks limits, creates feedback, and queues AI triage.
    """
    # Overwrite source to 'api' to distinguish from internal manual entries
    data.source = "api"
    
    try:
        # Create item (this automatically checks plan limits via check_entity_limit inside service)
        item = await feedback_service.create_item(db, org, data)
        
        # Enqueue AI Triage
        background_tasks.add_task(triage_feedback_async, item.id, org.id)
        
        return item
    except HTTPException as e:
        # Pass through the 403 or 429 exceptions thrown by the limit checker
        raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
