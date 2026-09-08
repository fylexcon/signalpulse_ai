"""
Organization API routes: CRUD + team member management.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.deps import (
    get_current_active_user,
    get_current_org,
    require_org_role,
)
from app.core.database import get_db
from app.core.plan_limits import check_member_limit
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.user import User
from app.schemas.organization import (
    ChangeMemberRoleRequest,
    InviteMemberRequest,
    OrgCreate,
    OrgMemberResponse,
    OrgResponse,
    OrgUpdate,
)

router = APIRouter()


@router.post("", response_model=OrgResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    data: OrgCreate,
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization. Caller becomes OWNER."""
    org = Organization(name=data.name, owner_id=user.id)
    db.add(org)
    await db.flush()

    member = OrganizationMember(org_id=org.id, user_id=user.id, role="OWNER")
    db.add(member)
    await db.flush()
    await db.refresh(org)

    return OrgResponse.model_validate(org)


@router.get("", response_model=list[OrgResponse])
async def list_organizations(
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations where the current user is a member."""
    result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.org_id == Organization.id)
        .where(OrganizationMember.user_id == user.id)
        .order_by(Organization.created_at.desc())
    )
    orgs = result.scalars().all()
    return [OrgResponse.model_validate(o) for o in orgs]


@router.get("/{org_id}", response_model=OrgResponse)
async def get_organization(
    org: Organization = Depends(get_current_org),
):
    """Get organization details (requires membership)."""
    return OrgResponse.model_validate(org)


@router.patch("/{org_id}", response_model=OrgResponse)
async def update_organization(
    data: OrgUpdate,
    org: Organization = Depends(get_current_org),
    _role: OrganizationMember = Depends(require_org_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    """Update organization (OWNER/ADMIN only)."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    await db.flush()
    await db.refresh(org)
    return OrgResponse.model_validate(org)


# ── Member Management ──

@router.get("/{org_id}/members", response_model=list[OrgMemberResponse])
async def list_members(
    org_id: uuid.UUID,
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """List all members of the organization."""
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.org_id == org_id)
        .order_by(OrganizationMember.joined_at)
    )
    members = result.scalars().all()

    return [
        OrgMemberResponse(
            id=m.id,
            user_id=m.user_id,
            role=m.role,
            joined_at=m.joined_at,
            user_email=m.user.email,
            user_full_name=m.user.full_name,
        )
        for m in members
    ]


@router.post(
    "/{org_id}/members",
    response_model=OrgMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def invite_member(
    org_id: uuid.UUID,
    data: InviteMemberRequest,
    org: Organization = Depends(get_current_org),
    _role: OrganizationMember = Depends(require_org_role("OWNER", "ADMIN")),
    db: AsyncSession = Depends(get_db),
):
    """Invite a user to the org by email (OWNER/ADMIN only)."""
    # Check plan limit
    await check_member_limit(db, org)

    # Find user by email
    result = await db.execute(select(User).where(User.email == data.email))
    invitee = result.scalar_one_or_none()
    if not invitee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with that email",
        )

    # Check already a member
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == invitee.id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this organization",
        )

    member = OrganizationMember(
        org_id=org_id,
        user_id=invitee.id,
        role=data.role,
    )
    db.add(member)
    await db.flush()

    return OrgMemberResponse(
        id=member.id,
        user_id=member.user_id,
        role=member.role,
        joined_at=member.joined_at,
        user_email=invitee.email,
        user_full_name=invitee.full_name,
    )


@router.patch("/{org_id}/members/{member_id}", response_model=OrgMemberResponse)
async def change_member_role(
    org_id: uuid.UUID,
    member_id: uuid.UUID,
    data: ChangeMemberRoleRequest,
    org: Organization = Depends(get_current_org),
    _role: OrganizationMember = Depends(require_org_role("OWNER")),
    db: AsyncSession = Depends(get_db),
):
    """Change a member's role (OWNER only). Cannot change own role."""
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.id == member_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "OWNER":
        raise HTTPException(status_code=400, detail="Cannot change owner's role")

    member.role = data.role
    await db.flush()

    return OrgMemberResponse(
        id=member.id,
        user_id=member.user_id,
        role=member.role,
        joined_at=member.joined_at,
        user_email=member.user.email,
        user_full_name=member.user.full_name,
    )


@router.delete("/{org_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    org_id: uuid.UUID,
    member_id: uuid.UUID,
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member (OWNER/ADMIN, or self-leave). OWNER cannot be removed."""
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.id == member_id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "OWNER":
        raise HTTPException(status_code=400, detail="Cannot remove the owner")

    # Authorization: self-leave or OWNER/ADMIN
    if member.user_id != user.id:
        caller_result = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.org_id == org_id,
                OrganizationMember.user_id == user.id,
            )
        )
        caller = caller_result.scalar_one_or_none()
        if not caller or caller.role not in ("OWNER", "ADMIN"):
            raise HTTPException(status_code=403, detail="Insufficient permissions")

    await db.delete(member)
    await db.flush()
