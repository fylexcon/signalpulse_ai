"""add_ai_summary_to_feedback_items

Revision ID: 003
Revises: 002
Create Date: 2026-09-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'feedback_items',
        sa.Column('ai_summary', sa.String(length=500), nullable=True)
    )


def downgrade():
    op.drop_column('feedback_items', 'ai_summary')
