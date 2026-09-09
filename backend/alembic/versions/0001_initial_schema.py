"""Initial schema for ChurnPilot AI.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=True),
        sa.Column("last_name", sa.String(length=100), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("plan", sa.String(length=100), nullable=True),
        sa.Column("billing_interval", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=32), server_default=sa.text("'active'"), nullable=False),
        sa.Column("signup_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("monthly_recurring_revenue", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("country", sa.String(length=2), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('active', 'trial', 'inactive', 'paused', 'churned')",
            name="ck_customers_status_valid",
        ),
        sa.CheckConstraint(
            "billing_interval IS NULL OR billing_interval IN ('monthly', 'annual', 'weekly')",
            name="ck_customers_billing_interval_valid",
        ),
        sa.CheckConstraint(
            "monthly_recurring_revenue IS NULL OR monthly_recurring_revenue >= 0",
            name="ck_customers_mrr_non_negative",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_customers"),
        sa.UniqueConstraint("external_id", name="uq_customers_external_id"),
        sa.UniqueConstraint("email", name="uq_customers_email"),
    )
    op.create_index("ix_customers_plan", "customers", ["plan"], unique=False)
    op.create_index("ix_customers_status", "customers", ["status"], unique=False)
    op.create_index("ix_customers_status_plan", "customers", ["status", "plan"], unique=False)
    op.create_index("ix_customers_last_seen_at", "customers", ["last_seen_at"], unique=False)

    op.create_table(
        "transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default=sa.text("'USD'"), nullable=False),
        sa.Column("status", sa.String(length=32), server_default=sa.text("'completed'"), nullable=False),
        sa.Column(
            "transaction_type",
            sa.String(length=32),
            server_default=sa.text("'subscription'"),
            nullable=False,
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'completed', 'failed', 'refunded')",
            name="ck_transactions_status_valid",
        ),
        sa.CheckConstraint(
            "transaction_type IN ('subscription', 'one_time', 'refund', 'upgrade', 'downgrade')",
            name="ck_transactions_type_valid",
        ),
        sa.CheckConstraint("char_length(currency) = 3", name="ck_transactions_currency_iso"),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            name="fk_transactions_customer_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_transactions"),
        sa.UniqueConstraint("external_id", name="uq_transactions_external_id"),
    )
    op.create_index("ix_transactions_customer_id", "transactions", ["customer_id"], unique=False)
    op.create_index("ix_transactions_status", "transactions", ["status"], unique=False)
    op.create_index(
        "ix_transactions_customer_occurred",
        "transactions",
        ["customer_id", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_transactions_status_occurred",
        "transactions",
        ["status", "occurred_at"],
        unique=False,
    )

    op.create_table(
        "customer_activity",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("activity_type", sa.String(length=64), nullable=False),
        sa.Column("feature_name", sa.String(length=128), nullable=True),
        sa.Column("channel", sa.String(length=64), nullable=True),
        sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            name="fk_customer_activity_customer_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_customer_activity"),
    )
    op.create_index("ix_customer_activity_customer_id", "customer_activity", ["customer_id"], unique=False)
    op.create_index("ix_customer_activity_activity_type", "customer_activity", ["activity_type"], unique=False)
    op.create_index("ix_customer_activity_occurred_at", "customer_activity", ["occurred_at"], unique=False)
    op.create_index(
        "ix_customer_activity_customer_occurred",
        "customer_activity",
        ["customer_id", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_customer_activity_type_occurred",
        "customer_activity",
        ["activity_type", "occurred_at"],
        unique=False,
    )

    op.create_table(
        "support_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("channel", sa.String(length=64), nullable=True),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=16), server_default=sa.text("'medium'"), nullable=False),
        sa.Column("status", sa.String(length=32), server_default=sa.text("'open'"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "event_type IN ('ticket', 'chat', 'call', 'complaint', 'bug_report')",
            name="ck_support_events_event_type_valid",
        ),
        sa.CheckConstraint(
            "severity IN ('low', 'medium', 'high', 'urgent')",
            name="ck_support_events_severity_valid",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'pending', 'resolved', 'closed')",
            name="ck_support_events_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            name="fk_support_events_customer_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_support_events"),
    )
    op.create_index("ix_support_events_customer_id", "support_events", ["customer_id"], unique=False)
    op.create_index("ix_support_events_event_type", "support_events", ["event_type"], unique=False)
    op.create_index("ix_support_events_severity", "support_events", ["severity"], unique=False)
    op.create_index("ix_support_events_status", "support_events", ["status"], unique=False)
    op.create_index(
        "ix_support_events_customer_occurred",
        "support_events",
        ["customer_id", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_support_events_status_severity",
        "support_events",
        ["status", "severity"],
        unique=False,
    )

    op.create_table(
        "churn_predictions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("risk_score", sa.Float(), nullable=False),
        sa.Column("risk_level", sa.String(length=16), nullable=False),
        sa.Column("model_name", sa.String(length=128), nullable=False),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("explanation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("predicted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("risk_score >= 0 AND risk_score <= 1", name="ck_churn_predictions_risk_score_range"),
        sa.CheckConstraint(
            "risk_level IN ('low', 'medium', 'high', 'critical')",
            name="ck_churn_predictions_risk_level_valid",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            name="fk_churn_predictions_customer_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_churn_predictions"),
    )
    op.create_index("ix_churn_predictions_customer_id", "churn_predictions", ["customer_id"], unique=False)
    op.create_index("ix_churn_predictions_risk_level", "churn_predictions", ["risk_level"], unique=False)
    op.create_index("ix_churn_predictions_predicted_at", "churn_predictions", ["predicted_at"], unique=False)
    op.create_index(
        "ix_churn_predictions_customer_predicted",
        "churn_predictions",
        ["customer_id", "predicted_at"],
        unique=False,
    )
    op.create_index(
        "ix_churn_predictions_risk_level_predicted",
        "churn_predictions",
        ["risk_level", "predicted_at"],
        unique=False,
    )

    op.create_table(
        "retention_recommendations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("prediction_id", sa.Uuid(), nullable=True),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=16), server_default=sa.text("'medium'"), nullable=False),
        sa.Column("status", sa.String(length=32), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "action_type IN ('discount', 'outreach', 'product_education', 'winback', 'pause_plan', 'upgrade')",
            name="ck_retention_recommendations_action_type_valid",
        ),
        sa.CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="ck_retention_recommendations_priority_valid",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'dismissed', 'completed')",
            name="ck_retention_recommendations_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            name="fk_retention_recommendations_customer_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["prediction_id"],
            ["churn_predictions.id"],
            name="fk_retention_recommendations_prediction_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_retention_recommendations"),
    )
    op.create_index(
        "ix_retention_recommendations_customer_id",
        "retention_recommendations",
        ["customer_id"],
        unique=False,
    )
    op.create_index(
        "ix_retention_recommendations_prediction_id",
        "retention_recommendations",
        ["prediction_id"],
        unique=False,
    )
    op.create_index(
        "ix_retention_recommendations_action_type",
        "retention_recommendations",
        ["action_type"],
        unique=False,
    )
    op.create_index("ix_retention_recommendations_priority", "retention_recommendations", ["priority"], unique=False)
    op.create_index("ix_retention_recommendations_status", "retention_recommendations", ["status"], unique=False)
    op.create_index(
        "ix_retention_recommendations_customer_status",
        "retention_recommendations",
        ["customer_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_retention_recommendations_priority_status",
        "retention_recommendations",
        ["priority", "status"],
        unique=False,
    )

    op.create_table(
        "generated_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("recommendation_id", sa.Uuid(), nullable=True),
        sa.Column("channel", sa.String(length=32), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), server_default=sa.text("'draft'"), nullable=False),
        sa.Column("generated_by", sa.String(length=64), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "channel IN ('email', 'sms', 'in_app')",
            name="ck_generated_messages_channel_valid",
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'queued', 'sent', 'failed')",
            name="ck_generated_messages_status_valid",
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
            name="fk_generated_messages_customer_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["recommendation_id"],
            ["retention_recommendations.id"],
            name="fk_generated_messages_recommendation_id",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_generated_messages"),
    )
    op.create_index("ix_generated_messages_customer_id", "generated_messages", ["customer_id"], unique=False)
    op.create_index(
        "ix_generated_messages_recommendation_id",
        "generated_messages",
        ["recommendation_id"],
        unique=False,
    )
    op.create_index("ix_generated_messages_channel", "generated_messages", ["channel"], unique=False)
    op.create_index("ix_generated_messages_status", "generated_messages", ["status"], unique=False)
    op.create_index(
        "ix_generated_messages_customer_status",
        "generated_messages",
        ["customer_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_generated_messages_channel_status",
        "generated_messages",
        ["channel", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_generated_messages_channel_status", table_name="generated_messages")
    op.drop_index("ix_generated_messages_customer_status", table_name="generated_messages")
    op.drop_index("ix_generated_messages_status", table_name="generated_messages")
    op.drop_index("ix_generated_messages_channel", table_name="generated_messages")
    op.drop_index("ix_generated_messages_recommendation_id", table_name="generated_messages")
    op.drop_index("ix_generated_messages_customer_id", table_name="generated_messages")
    op.drop_table("generated_messages")

    op.drop_index("ix_retention_recommendations_priority_status", table_name="retention_recommendations")
    op.drop_index("ix_retention_recommendations_customer_status", table_name="retention_recommendations")
    op.drop_index("ix_retention_recommendations_status", table_name="retention_recommendations")
    op.drop_index("ix_retention_recommendations_priority", table_name="retention_recommendations")
    op.drop_index("ix_retention_recommendations_action_type", table_name="retention_recommendations")
    op.drop_index("ix_retention_recommendations_prediction_id", table_name="retention_recommendations")
    op.drop_index("ix_retention_recommendations_customer_id", table_name="retention_recommendations")
    op.drop_table("retention_recommendations")

    op.drop_index("ix_churn_predictions_risk_level_predicted", table_name="churn_predictions")
    op.drop_index("ix_churn_predictions_customer_predicted", table_name="churn_predictions")
    op.drop_index("ix_churn_predictions_predicted_at", table_name="churn_predictions")
    op.drop_index("ix_churn_predictions_risk_level", table_name="churn_predictions")
    op.drop_index("ix_churn_predictions_customer_id", table_name="churn_predictions")
    op.drop_table("churn_predictions")

    op.drop_index("ix_support_events_status_severity", table_name="support_events")
    op.drop_index("ix_support_events_customer_occurred", table_name="support_events")
    op.drop_index("ix_support_events_status", table_name="support_events")
    op.drop_index("ix_support_events_severity", table_name="support_events")
    op.drop_index("ix_support_events_event_type", table_name="support_events")
    op.drop_index("ix_support_events_customer_id", table_name="support_events")
    op.drop_table("support_events")

    op.drop_index("ix_customer_activity_type_occurred", table_name="customer_activity")
    op.drop_index("ix_customer_activity_customer_occurred", table_name="customer_activity")
    op.drop_index("ix_customer_activity_occurred_at", table_name="customer_activity")
    op.drop_index("ix_customer_activity_activity_type", table_name="customer_activity")
    op.drop_index("ix_customer_activity_customer_id", table_name="customer_activity")
    op.drop_table("customer_activity")

    op.drop_index("ix_transactions_status_occurred", table_name="transactions")
    op.drop_index("ix_transactions_customer_occurred", table_name="transactions")
    op.drop_index("ix_transactions_status", table_name="transactions")
    op.drop_index("ix_transactions_customer_id", table_name="transactions")
    op.drop_table("transactions")

    op.drop_index("ix_customers_last_seen_at", table_name="customers")
    op.drop_index("ix_customers_status_plan", table_name="customers")
    op.drop_index("ix_customers_status", table_name="customers")
    op.drop_index("ix_customers_plan", table_name="customers")
    op.drop_table("customers")
