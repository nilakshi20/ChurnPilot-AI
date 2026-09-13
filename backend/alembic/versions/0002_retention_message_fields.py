"""Expand generated message channels and store retention agent payload.

Revision ID: 0002_retention_message_fields
Revises: 0001_initial_schema
Create Date: 2026-09-09
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_retention_message_fields"
down_revision: Union[str, Sequence[str], None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_generated_messages_channel_valid", "generated_messages", type_="check")
    op.create_check_constraint(
        "ck_generated_messages_channel_valid",
        "generated_messages",
        "channel IN ('email', 'sms', 'whatsapp', 'sales_call', 'in_app')",
    )
    op.add_column("generated_messages", sa.Column("tone", sa.String(length=32), nullable=True))
    op.add_column(
        "retention_recommendations",
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("retention_recommendations", "payload")
    op.drop_column("generated_messages", "tone")
    op.drop_constraint("ck_generated_messages_channel_valid", "generated_messages", type_="check")
    op.create_check_constraint(
        "ck_generated_messages_channel_valid",
        "generated_messages",
        "channel IN ('email', 'sms', 'in_app')",
    )
