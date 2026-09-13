from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.db.models import Customer
from app.db.repositories.base import BaseRepository


class CustomerRepository(BaseRepository[Customer]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, Customer)

    def get_or_none(self, customer_id: UUID) -> Customer | None:
        return self.get(customer_id)

    def list_filtered(
        self,
        *,
        search: str | None = None,
        status: str | None = None,
        plan: str | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> tuple[list[Customer], int]:
        statement: Select[tuple[Customer]] = select(Customer)
        count_statement = select(func.count()).select_from(Customer)
        if search:
            pattern = f"%{search.strip()}%"
            clause = (
                Customer.email.ilike(pattern)
                | Customer.first_name.ilike(pattern)
                | Customer.last_name.ilike(pattern)
                | Customer.company.ilike(pattern)
            )
            statement = statement.where(clause)
            count_statement = count_statement.where(clause)
        if status:
            statement = statement.where(Customer.status == status)
            count_statement = count_statement.where(Customer.status == status)
        if plan:
            statement = statement.where(Customer.plan == plan)
            count_statement = count_statement.where(Customer.plan == plan)

        total = int(self.db.scalar(count_statement) or 0)
        offset = max(page - 1, 0) * page_size
        rows = list(
            self.db.scalars(
                statement.order_by(Customer.created_at.desc()).offset(offset).limit(page_size)
            ).all()
        )
        return rows, total

    def emails_in(self, emails: Sequence[str]) -> set[str]:
        if not emails:
            return set()
        rows = self.db.scalars(select(Customer.email).where(Customer.email.in_(list(emails)))).all()
        return {str(email).lower() for email in rows}
