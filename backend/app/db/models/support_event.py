from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.db.models.customer import Customer


class SupportEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "support_events"
    __table_args__ = (
        CheckConstraint(
            "event_type IN ('ticket', 'chat', 'call', 'complaint', 'bug_report')",
            name="event_type_valid",
        ),
        CheckConstraint(
            "severity IN ('low', 'medium', 'high', 'urgent')",
            name="severity_valid",
        ),
        CheckConstraint(
            "status IN ('open', 'pending', 'resolved', 'closed')",
            name="status_valid",
        ),
        Index("ix_support_events_customer_occurred", "customer_id", "occurred_at"),
        Index("ix_support_events_status_severity", "status", "severity"),
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    channel: Mapped[str | None] = mapped_column(String(64), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="medium",
        server_default=text("'medium'"),
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="open",
        server_default=text("'open'"),
        index=True,
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    customer: Mapped["Customer"] = relationship(back_populates="support_events")
