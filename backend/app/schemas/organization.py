"""
Pydantic v2 schemas for Organization and OrganizationMember.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class OrgCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class OrgUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)


class OrgResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    plan_type: str
    owner_id: uuid.UUID
    created_at: datetime


class OrgMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    user_email: str
    user_full_name: str


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: str = Field(default="MEMBER", pattern=r"^(ADMIN|MEMBER)$")


class ChangeMemberRoleRequest(BaseModel):
    role: str = Field(pattern=r"^(ADMIN|MEMBER)$")
