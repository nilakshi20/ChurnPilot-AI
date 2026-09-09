from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.churn_prediction import ChurnPrediction
    from app.db.models.customer_activity import CustomerActivity
    from app.db.models.generated_message import GeneratedMessage
    from app.db.models.retention_recommendation import RetentionRecommendation
    from app.db.models.support_event import SupportEvent
    from app.db.models.transaction import Transaction


class Customer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'trial', 'inactive', 'paused', 'churned')",
            name="status_valid",
        ),
        CheckConstraint(
            "billing_interval IS NULL OR billing_interval IN ('monthly', 'annual', 'weekly')",
            name="billing_interval_valid",
        ),
        CheckConstraint(
            "monthly_recurring_revenue IS NULL OR monthly_recurring_revenue >= 0",
            name="mrr_non_negative",
        ),
        Index("ix_customers_status_plan", "status", "plan"),
        Index("ix_customers_last_seen_at", "last_seen_at"),
    )

    external_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plan: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    billing_interval: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="active",
        server_default=text("'active'"),
        index=True,
    )
    signup_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    monthly_recurring_revenue: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    activities: Mapped[list["CustomerActivity"]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    support_events: Mapped[list["SupportEvent"]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    churn_predictions: Mapped[list["ChurnPrediction"]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    retention_recommendations: Mapped[list["RetentionRecommendation"]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
    generated_messages: Mapped[list["GeneratedMessage"]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
    )
