from datetime import datetime
from uuid import UUID

import pandas as pd
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.db.models import Customer, CustomerActivity, SupportEvent, Transaction
from app.ml.features import CustomerFeatureRow
from app.utils.time import ensure_aware, utcnow


def _months_between(start: datetime | None, end: datetime) -> float:
    if start is None:
        return 0.0
    start = ensure_aware(start) or start
    days = max(0.0, (end - start).total_seconds() / 86400.0)
    return round(days / 30.437, 4)


def load_customer_feature_rows(
    db: Session,
    customer_ids: list[UUID] | None = None,
    as_of: datetime | None = None,
) -> list[CustomerFeatureRow]:
    as_of = ensure_aware(as_of) or utcnow()
    customers = list(db.scalars(_customer_query(customer_ids)).all())
    if not customers:
        return []

    # Aggregating per customer in SQL keeps this to four small result sets instead of
    # materializing every transaction, activity, and support row in Python.
    tx_by_customer = _transaction_aggregates(db, customer_ids)
    act_by_customer = _activity_aggregates(db, customer_ids)
    sup_by_customer = _support_aggregates(db, customer_ids)

    rows: list[CustomerFeatureRow] = []
    for customer in customers:
        tenure_months = _months_between(customer.signup_date, as_of)
        monthly_spend = float(customer.monthly_recurring_revenue or 0)
        tx = tx_by_customer.get(customer.id)
        act = act_by_customer.get(customer.id)
        sup = sup_by_customer.get(customer.id)

        total_orders = int(tx["total_orders"]) if tx else 0
        aov = float(tx["average_order_value"]) if tx else 0.0
        payment_failures = int(tx["payment_failures"]) if tx else 0
        last_order_at = ensure_aware(tx["last_order_at"]) if tx else None
        if last_order_at is not None:
            days_since = max(0.0, (as_of - last_order_at).total_seconds() / 86400.0)
        else:
            # No completed order on record, so order recency falls back to full tenure.
            days_since = max(tenure_months * 30.437, 0.0)
        purchase_frequency = round(total_orders / max(tenure_months, 1.0), 4)
        support_tickets = int(sup["support_tickets"]) if sup else 0
        complaint_count = int(sup["complaint_count"]) if sup else 0
        discount_usage = int(act["discount_usage"]) if act else 0
        email_events = float(act["email_events"]) if act else 0.0
        logins = float(act["logins"]) if act else 0.0

        rows.append(
            CustomerFeatureRow(
                customer_id=customer.id,
                email=customer.email,
                first_name=customer.first_name,
                last_name=customer.last_name,
                company=customer.company,
                plan=customer.plan,
                status=customer.status,
                country=customer.country,
                billing_interval=customer.billing_interval,
                signup_date=ensure_aware(customer.signup_date),
                last_seen_at=ensure_aware(customer.last_seen_at),
                tenure_months=tenure_months,
                monthly_spend=monthly_spend,
                total_orders=total_orders,
                average_order_value=round(aov, 2),
                days_since_last_order=round(days_since, 2),
                purchase_frequency=purchase_frequency,
                support_tickets=support_tickets,
                complaint_count=complaint_count,
                discount_usage=discount_usage,
                email_engagement=round(email_events / max(tenure_months, 1.0), 4),
                login_frequency=round(logins / max(tenure_months, 1.0), 4),
                payment_failures=payment_failures,
                is_churned=customer.status == "churned",
            )
        )
    return rows


def feature_frame(rows: list[CustomerFeatureRow]) -> pd.DataFrame:
    return pd.DataFrame([row.to_feature_dict() for row in rows])


def _customer_query(customer_ids: list[UUID] | None) -> Select[tuple[Customer]]:
    statement: Select[tuple[Customer]] = select(Customer)
    if customer_ids:
        statement = statement.where(Customer.id.in_(customer_ids))
    return statement


def _scope(statement: Select, column, customer_ids: list[UUID] | None) -> Select:
    return statement.where(column.in_(customer_ids)) if customer_ids else statement


def _transaction_aggregates(db: Session, customer_ids: list[UUID] | None) -> dict[UUID, dict]:
    completed = Transaction.status == "completed"
    statement = _scope(
        select(
            Transaction.customer_id,
            func.count().filter(completed).label("total_orders"),
            func.avg(Transaction.amount).filter(completed).label("average_order_value"),
            func.max(Transaction.occurred_at).filter(completed).label("last_order_at"),
            func.count().filter(Transaction.status == "failed").label("payment_failures"),
        ).group_by(Transaction.customer_id),
        Transaction.customer_id,
        customer_ids,
    )
    return {
        row.customer_id: {
            "total_orders": row.total_orders or 0,
            "average_order_value": float(row.average_order_value or 0),
            "last_order_at": row.last_order_at,
            "payment_failures": row.payment_failures or 0,
        }
        for row in db.execute(statement)
    }


def _activity_aggregates(db: Session, customer_ids: list[UUID] | None) -> dict[UUID, dict]:
    activity_type = CustomerActivity.activity_type
    statement = _scope(
        select(
            CustomerActivity.customer_id,
            func.count().filter(activity_type == "discount_redeemed").label("discount_usage"),
            func.count().filter(activity_type.in_(("email_open", "email_click"))).label("email_events"),
            func.count().filter(activity_type == "login").label("logins"),
        ).group_by(CustomerActivity.customer_id),
        CustomerActivity.customer_id,
        customer_ids,
    )
    return {
        row.customer_id: {
            "discount_usage": row.discount_usage or 0,
            "email_events": row.email_events or 0,
            "logins": row.logins or 0,
        }
        for row in db.execute(statement)
    }


def _support_aggregates(db: Session, customer_ids: list[UUID] | None) -> dict[UUID, dict]:
    event_type = SupportEvent.event_type
    statement = _scope(
        select(
            SupportEvent.customer_id,
            func.count().filter(event_type == "ticket").label("support_tickets"),
            func.count().filter(event_type == "complaint").label("complaint_count"),
        ).group_by(SupportEvent.customer_id),
        SupportEvent.customer_id,
        customer_ids,
    )
    return {
        row.customer_id: {
            "support_tickets": row.support_tickets or 0,
            "complaint_count": row.complaint_count or 0,
        }
        for row in db.execute(statement)
    }
