"""
SQLAlchemy model: Organization (Workspace / Tenant)
"""
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    plan_type: Mapped[str] = mapped_column(
        String(50), default="free", nullable=False
    )  # free | starter | pro
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # ── Relationships ──
    owner: Mapped["User"] = relationship(  # noqa: F821
        back_populates="owned_orgs", lazy="raise"
    )
    members: Mapped[list["OrganizationMember"]] = relationship(  # noqa: F821
        back_populates="organization",
        cascade="all, delete-orphan",
        lazy="raise",
    )
    subscription: Mapped["Subscription | None"] = relationship(  # noqa: F821
        back_populates="organization",
        uselist=False,
        lazy="raise",
    )
