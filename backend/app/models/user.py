"""
SQLAlchemy model: User
"""
import uuid
from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # ── Relationships (always use selectinload / joinedload in async) ──
    owned_orgs: Mapped[list["Organization"]] = relationship(  # noqa: F821
        back_populates="owner", lazy="raise"
    )
    memberships: Mapped[list["OrganizationMember"]] = relationship(  # noqa: F821
        back_populates="user", lazy="raise"
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(  # noqa: F821
        back_populates="user", lazy="raise"
    )
