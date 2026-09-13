from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import GeneratedMessage, RetentionRecommendation
from app.db.repositories.base import BaseRepository


class RetentionRepository(BaseRepository[RetentionRecommendation]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, RetentionRecommendation)

    def list_for_customer(self, customer_id: UUID) -> list[RetentionRecommendation]:
        statement = (
            select(RetentionRecommendation)
            .where(RetentionRecommendation.customer_id == customer_id)
            .order_by(RetentionRecommendation.created_at.desc())
        )
        return list(self.db.scalars(statement).all())


class MessageRepository(BaseRepository[GeneratedMessage]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, GeneratedMessage)

    def list_for_customer(self, customer_id: UUID) -> list[GeneratedMessage]:
        statement = (
            select(GeneratedMessage)
            .where(GeneratedMessage.customer_id == customer_id)
            .order_by(GeneratedMessage.created_at.desc())
        )
        return list(self.db.scalars(statement).all())
