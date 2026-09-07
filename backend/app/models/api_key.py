"""
SQLAlchemy model: ApiKey — hashed API keys with permissions per org.
"""
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    key_hash: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    permissions: Mapped[dict] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
    last_used_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
