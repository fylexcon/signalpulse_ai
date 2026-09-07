import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, Text, Index, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import ENUM

from app.core.database import Base

class FeedbackItem(Base):
    __tablename__ = "feedback_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    source: Mapped[str] = mapped_column(String(50)) # widget, api, manual
    category: Mapped[str] = mapped_column(String(50)) # bug, feature_request, general
    sentiment: Mapped[str] = mapped_column(String(50)) # positive, neutral, negative
    status: Mapped[str] = mapped_column(String(50), default="open") # open, under_review, resolved
    ai_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", lazy="raise")

    __table_args__ = (
        Index('ix_feedback_org_status', 'org_id', 'status'),
    )
