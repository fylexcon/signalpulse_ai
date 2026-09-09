"""
API Key routes — scoped under /orgs/{org_id}/api-keys.
"""
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_org, require_org_role
from app.core.database import get_db
from app.core.plan_limits import check_api_key_limit
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreateResponse, ApiKeyResponse
from app.services import api_key_service

router = APIRouter()


@router.post(
    "/{org_id}/api-keys",
    response_model=ApiKeyCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_api_key(
    data: ApiKeyCreate,
    org: Organization = Depends(get_current_org),
    _role: OrganizationMember = Depends(require_org_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new API key. The raw key is shown only once."""
    await check_api_key_limit(db, org)
    return await api_key_service.create_api_key(db, org.id, data)


@router.get("/{org_id}/api-keys", response_model=list[ApiKeyResponse])
async def list_api_keys(
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys for the organization (keys are masked)."""
    return await api_key_service.list_api_keys(db, org.id)


@router.delete(
    "/{org_id}/api-keys/{key_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def revoke_api_key(
    key_id: uuid.UUID,
    org: Organization = Depends(get_current_org),
    _role: OrganizationMember = Depends(require_org_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    """Revoke (delete) an API key (OWNER/ADMIN only)."""
    await api_key_service.revoke_api_key(db, org.id, key_id)
