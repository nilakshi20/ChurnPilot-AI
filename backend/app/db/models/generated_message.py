from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.customer import Customer
    from app.db.models.retention_recommendation import RetentionRecommendation


class GeneratedMessage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "generated_messages"
    __table_args__ = (
        CheckConstraint(
            "channel IN ('email', 'sms', 'in_app')",
            name="channel_valid",
        ),
        CheckConstraint(
            "status IN ('draft', 'queued', 'sent', 'failed')",
            name="status_valid",
        ),
        Index("ix_generated_messages_customer_status", "customer_id", "status"),
        Index("ix_generated_messages_channel_status", "channel", "status"),
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recommendation_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("retention_recommendations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    channel: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="draft",
        server_default=text("'draft'"),
        index=True,
    )
    generated_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped["Customer"] = relationship(back_populates="generated_messages")
    recommendation: Mapped["RetentionRecommendation | None"] = relationship(back_populates="messages")
