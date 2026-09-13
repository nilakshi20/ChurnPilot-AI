from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import ChurnPrediction
from app.db.repositories.base import BaseRepository


class PredictionRepository(BaseRepository[ChurnPrediction]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, ChurnPrediction)

    def latest_for_customer(self, customer_id: UUID) -> ChurnPrediction | None:
        statement = (
            select(ChurnPrediction)
            .where(ChurnPrediction.customer_id == customer_id)
            .order_by(ChurnPrediction.predicted_at.desc())
            .limit(1)
        )
        return self.db.scalars(statement).first()

    def latest_by_customer_ids(self, customer_ids: list[UUID]) -> dict[UUID, ChurnPrediction]:
        if not customer_ids:
            return {}
        rows = list(
            self.db.scalars(
                select(ChurnPrediction)
                .where(ChurnPrediction.customer_id.in_(customer_ids))
                .order_by(ChurnPrediction.customer_id, ChurnPrediction.predicted_at.desc())
            ).all()
        )
        latest: dict[UUID, ChurnPrediction] = {}
        for row in rows:
            if row.customer_id not in latest:
                latest[row.customer_id] = row
        return latest

    def latest_all(self) -> list[ChurnPrediction]:
        rows = list(
            self.db.scalars(
                select(ChurnPrediction).order_by(
                    ChurnPrediction.customer_id,
                    ChurnPrediction.predicted_at.desc(),
                )
            ).all()
        )
        latest: dict[UUID, ChurnPrediction] = {}
        for row in rows:
            if row.customer_id not in latest:
                latest[row.customer_id] = row
        return list(latest.values())

    def delete_for_customers(self, customer_ids: list[UUID] | None = None) -> None:
        statement = delete(ChurnPrediction)
        if customer_ids:
            statement = statement.where(ChurnPrediction.customer_id.in_(customer_ids))
        self.db.execute(statement)
