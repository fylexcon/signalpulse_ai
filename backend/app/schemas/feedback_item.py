import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class FeedbackItemBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    customer_email: str | None = None
    source: str = Field(default="manual")
    category: str = Field(default="general")
    sentiment: str = Field(default="neutral")
    status: str = Field(default="open")


class FeedbackItemCreate(FeedbackItemBase):
    pass


class FeedbackItemUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    content: str | None = None
    category: str | None = None
    sentiment: str | None = None
    status: str | None = None


class FeedbackItemResponse(FeedbackItemBase):
    id: uuid.UUID
    org_id: uuid.UUID
    ai_summary: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
