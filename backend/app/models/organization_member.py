"""
SQLAlchemy model: OrganizationMember (join table for multi-tenancy with roles)
"""
import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(20), default="MEMBER", nullable=False
    )  # OWNER | ADMIN | MEMBER
    joined_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # One membership per user per org
    __table_args__ = (
        UniqueConstraint("org_id", "user_id", name="uq_org_user"),
    )

    # ── Relationships ──
    organization: Mapped["Organization"] = relationship(  # noqa: F821
        back_populates="members", lazy="raise"
    )
    user: Mapped["User"] = relationship(  # noqa: F821
        back_populates="memberships", lazy="raise"
    )
