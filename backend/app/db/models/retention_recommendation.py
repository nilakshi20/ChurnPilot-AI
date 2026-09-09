from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.churn_prediction import ChurnPrediction
    from app.db.models.customer import Customer
    from app.db.models.generated_message import GeneratedMessage


class RetentionRecommendation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "retention_recommendations"
    __table_args__ = (
        CheckConstraint(
            "action_type IN ('discount', 'outreach', 'product_education', 'winback', 'pause_plan', 'upgrade')",
            name="action_type_valid",
        ),
        CheckConstraint(
            "priority IN ('low', 'medium', 'high', 'urgent')",
            name="priority_valid",
        ),
        CheckConstraint(
            "status IN ('pending', 'accepted', 'dismissed', 'completed')",
            name="status_valid",
        ),
        Index("ix_retention_recommendations_customer_status", "customer_id", "status"),
        Index("ix_retention_recommendations_priority_status", "priority", "status"),
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prediction_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("churn_predictions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="medium",
        server_default=text("'medium'"),
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="pending",
        server_default=text("'pending'"),
        index=True,
    )

    customer: Mapped["Customer"] = relationship(back_populates="retention_recommendations")
    prediction: Mapped["ChurnPrediction | None"] = relationship(back_populates="recommendations")
    messages: Mapped[list["GeneratedMessage"]] = relationship(back_populates="recommendation")
