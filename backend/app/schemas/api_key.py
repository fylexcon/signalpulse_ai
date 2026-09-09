"""
Pydantic v2 schemas for API Key management.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyCreate(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    permissions: dict | None = None


class ApiKeyCreateResponse(BaseModel):
    """Returned only on creation — the raw key is shown once and never again."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    raw_key: str  # Shown only once
    permissions: dict
    created_at: datetime


class ApiKeyResponse(BaseModel):
    """List view — key is masked (only prefix shown)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    label: str
    key_prefix: str  # e.g. "sk_live_a3f2...****"
    permissions: dict
    last_used_at: datetime | None
    created_at: datetime
