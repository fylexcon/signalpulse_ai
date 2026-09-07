"""Initial schema — all 8 tables.

Revision ID: 001
Revises: None
Create Date: 2024-01-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ──
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # ── organizations ──
    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column(
            "owner_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("plan_type", sa.String(50), server_default="free", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # ── organization_members ──
    op.create_table(
        "organization_members",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(20), server_default="MEMBER", nullable=False),
        sa.Column("joined_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("org_id", "user_id", name="uq_org_user"),
    )

    # ── refresh_tokens ──
    op.create_table(
        "refresh_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(64), unique=True, index=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # ── subscriptions ──
    op.create_table(
        "subscriptions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column("stripe_customer_id", sa.String(255), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), unique=True, nullable=False),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("current_period_end", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # ── api_keys ──
    op.create_table(
        "api_keys",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        ),
        sa.Column("key_hash", sa.String(64), unique=True, index=True, nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("permissions", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # ── core_entities ──
    op.create_table(
        "core_entities",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            index=True,
            nullable=False,
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("data", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("status", sa.String(50), server_default="active", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    # ── processed_events ──
    op.create_table(
        "processed_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("event_type", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("processed_events")
    op.drop_table("core_entities")
    op.drop_table("api_keys")
    op.drop_table("subscriptions")
    op.drop_table("refresh_tokens")
    op.drop_table("organization_members")
    op.drop_table("organizations")
    op.drop_table("users")
