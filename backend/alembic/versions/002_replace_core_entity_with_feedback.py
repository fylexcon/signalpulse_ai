"""replace_core_entity_with_feedback_item

Revision ID: 002
Revises: 001
Create Date: 2026-09-06 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    # Drop old core_entities table
    op.drop_table('core_entities')

    # Create new feedback_items table
    op.create_table(
        'feedback_items',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('org_id', sa.Uuid(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('customer_email', sa.String(length=255), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('sentiment', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_feedback_org_status', 'feedback_items', ['org_id', 'status'], unique=False)
    op.create_index(op.f('ix_feedback_items_org_id'), 'feedback_items', ['org_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_feedback_items_org_id'), table_name='feedback_items')
    op.drop_index('ix_feedback_org_status', table_name='feedback_items')
    op.drop_table('feedback_items')

    # Recreate core_entities table (basic schema for rollback)
    op.create_table(
        'core_entities',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('org_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
