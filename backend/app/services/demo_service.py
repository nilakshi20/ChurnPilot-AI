from __future__ import annotations

from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.models import (
    ChurnPrediction,
    Customer,
    CustomerActivity,
    GeneratedMessage,
    RetentionRecommendation,
    SupportEvent,
    Transaction,
)
from app.schemas.platform import CsvValidationData, DemoLoadData
from app.services.csv_validation import validate_customer_csv
from app.services import snapshot
from app.services.demo_generator import DemoDataset, generate_demo_dataset
from app.services.prediction_service import run_predictions, train_model_from_database
from app.utils.time import utcnow


def load_demo(db: Session) -> DemoLoadData:
    dataset = generate_demo_dataset()
    _replace_operational_data(db)
    _persist_dataset(db, dataset)
    db.commit()
    snapshot.invalidate()
    train_model_from_database(db)
    predictions = run_predictions(db, train_if_missing=False)
    return DemoLoadData(
        customers_loaded=len(dataset.customers),
        transactions_loaded=len(dataset.transactions),
        activities_loaded=len(dataset.activities),
        support_events_loaded=len(dataset.support_events),
        predictions=predictions,
    )


def persist_validated_csv(db: Session, content: bytes, *, persist: bool = True) -> CsvValidationData:
    existing = {email.lower() for email in db.scalars(select(Customer.email)).all()}
    result, valid_rows = validate_customer_csv(content, existing)
    if not persist:
        result.persisted = 0
        return result
    now = utcnow()
    persisted = 0
    for row in valid_rows:
        db.add(
            Customer(
                id=uuid4(),
                email=row["email"],
                first_name=row.get("first_name"),
                last_name=row.get("last_name"),
                company=row.get("company"),
                plan=row.get("plan"),
                billing_interval=row.get("billing_interval"),
                status=row.get("status") or "active",
                signup_date=row.get("signup_date"),
                monthly_recurring_revenue=row.get("monthly_spend"),
                country=row.get("country"),
                created_at=now,
                updated_at=now,
            )
        )
        persisted += 1
    if persisted:
        db.commit()
        snapshot.invalidate()
    result.persisted = persisted
    return result


def persist_demo_dataset(db: Session, dataset: DemoDataset) -> None:
    _persist_dataset(db, dataset)
    db.commit()


def _replace_operational_data(db: Session) -> None:
    db.execute(delete(GeneratedMessage))
    db.execute(delete(RetentionRecommendation))
    db.execute(delete(ChurnPrediction))
    db.execute(delete(SupportEvent))
    db.execute(delete(CustomerActivity))
    db.execute(delete(Transaction))
    db.execute(delete(Customer))
    db.flush()


def _persist_dataset(db: Session, dataset: DemoDataset) -> None:
    now = utcnow()
    db.add_all(
        [
            Customer(
                id=item.id,
                email=item.email,
                first_name=item.first_name,
                last_name=item.last_name,
                company=item.company,
                plan=item.plan,
                billing_interval=item.billing_interval,
                status=item.status,
                signup_date=item.signup_date,
                last_seen_at=item.last_seen_at,
                monthly_recurring_revenue=item.monthly_recurring_revenue,
                country=item.country,
                created_at=now,
                updated_at=now,
            )
            for item in dataset.customers
        ]
    )
    db.flush()
    db.add_all(
        [
            Transaction(
                id=item.id,
                customer_id=item.customer_id,
                external_id=item.external_id,
                amount=item.amount,
                currency="USD",
                status=item.status,
                transaction_type=item.transaction_type,
                occurred_at=item.occurred_at,
                created_at=now,
                updated_at=now,
            )
            for item in dataset.transactions
        ]
    )
    db.add_all(
        [
            CustomerActivity(
                id=item.id,
                customer_id=item.customer_id,
                activity_type=item.activity_type,
                feature_name=item.feature_name,
                channel=item.channel,
                occurred_at=item.occurred_at,
                created_at=now,
                updated_at=now,
            )
            for item in dataset.activities
        ]
    )
    db.add_all(
        [
            SupportEvent(
                id=item.id,
                customer_id=item.customer_id,
                event_type=item.event_type,
                subject=item.subject,
                severity=item.severity,
                status=item.status,
                occurred_at=item.occurred_at,
                resolved_at=item.resolved_at,
                created_at=now,
                updated_at=now,
            )
            for item in dataset.support_events
        ]
    )
    db.flush()
