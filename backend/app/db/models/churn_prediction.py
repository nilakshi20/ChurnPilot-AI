from datetime import datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.customer import Customer
    from app.db.models.retention_recommendation import RetentionRecommendation


class ChurnPrediction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "churn_predictions"
    __table_args__ = (
        CheckConstraint("risk_score >= 0 AND risk_score <= 1", name="risk_score_range"),
        CheckConstraint(
            "risk_level IN ('low', 'medium', 'high', 'critical')",
            name="risk_level_valid",
        ),
        Index("ix_churn_predictions_customer_predicted", "customer_id", "predicted_at"),
        Index("ix_churn_predictions_risk_level_predicted", "risk_level", "predicted_at"),
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    explanation: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    predicted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        index=True,
    )

    customer: Mapped["Customer"] = relationship(back_populates="churn_predictions")
    recommendations: Mapped[list["RetentionRecommendation"]] = relationship(
        back_populates="prediction",
    )
