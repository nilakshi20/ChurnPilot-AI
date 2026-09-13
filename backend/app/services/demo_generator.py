from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from uuid import UUID, uuid4

import numpy as np

from app.core.config import settings
from app.utils.time import utcnow

FIRST_NAMES = [
    "Ava", "Noah", "Mia", "Liam", "Zoe", "Ethan", "Ivy", "Mason", "Luna", "Kai",
    "Nina", "Omar", "Priya", "Hugo", "Sofia", "Arjun", "Elena", "Jonas", "Amara", "Theo",
    "Leila", "Mateo", "Hana", "Felix", "Anika", "Ravi", "Chloe", "Ibrahim", "Sienna", "Luca",
]
LAST_NAMES = [
    "Patel", "Nguyen", "Garcia", "Silva", "Khan", "Andersen", "Brooks", "Nakamura", "Okoye",
    "Berg", "Costa", "Diaz", "Hughes", "Iyer", "Johansson", "Kowalski", "Lopez", "Moreau",
    "Nilsen", "Ortega", "Petrov", "Quinn", "Rahman", "Sato", "Turner", "Usman", "Vega", "Walsh",
]
COMPANY_ROOTS = [
    "Northwind", "Harbor", "Lumen", "Cedar", "Atlas", "Brightpath", "Nimbus", "Redwood",
    "Solstice", "Vertex", "Copper", "Fieldnote", "Grain", "Helix", "Ironclad", "Juniper",
]
COMPANY_SUFFIXES = ["Labs", "Studio", "Systems", "Collective", "Works", "Analytics", "Retail", "Cloud"]
COUNTRIES = ["US", "GB", "IN", "DE", "CA", "AU", "SG", "BR", "NL", "FR"]
PLANS = ["starter", "growth", "professional", "enterprise"]
PLAN_WEIGHTS = [0.38, 0.32, 0.20, 0.10]
PLAN_SPEND = {
    "starter": (29, 89),
    "growth": (99, 279),
    "professional": (299, 720),
    "enterprise": (850, 2800),
}


@dataclass
class DemoCustomer:
    id: UUID
    email: str
    first_name: str
    last_name: str
    company: str
    plan: str
    status: str
    billing_interval: str
    signup_date: datetime
    last_seen_at: datetime
    monthly_recurring_revenue: float
    country: str
    churned: bool


@dataclass
class DemoTransaction:
    id: UUID
    customer_id: UUID
    amount: float
    status: str
    transaction_type: str
    occurred_at: datetime
    external_id: str


@dataclass
class DemoActivity:
    id: UUID
    customer_id: UUID
    activity_type: str
    feature_name: str | None
    channel: str | None
    occurred_at: datetime


@dataclass
class DemoSupport:
    id: UUID
    customer_id: UUID
    event_type: str
    subject: str
    severity: str
    status: str
    occurred_at: datetime
    resolved_at: datetime | None


@dataclass
class DemoDataset:
    customers: list[DemoCustomer] = field(default_factory=list)
    transactions: list[DemoTransaction] = field(default_factory=list)
    activities: list[DemoActivity] = field(default_factory=list)
    support_events: list[DemoSupport] = field(default_factory=list)


def generate_demo_dataset(
    count: int | None = None,
    seed: int | None = None,
    as_of: datetime | None = None,
) -> DemoDataset:
    count = count or settings.DEMO_CUSTOMER_COUNT
    seed = settings.DEMO_SEED if seed is None else seed
    as_of = as_of or utcnow()
    rng = np.random.default_rng(seed)
    dataset = DemoDataset()

    for index in range(count):
        customer, latents = _build_customer(rng, index, as_of)
        dataset.customers.append(customer)
        dataset.transactions.extend(_build_transactions(rng, customer, latents, as_of))
        dataset.activities.extend(_build_activities(rng, customer, latents, as_of))
        dataset.support_events.extend(_build_support(rng, customer, latents, as_of))
    return dataset


def _build_customer(rng: np.random.Generator, index: int, as_of: datetime) -> tuple[DemoCustomer, dict[str, float]]:
    first = str(rng.choice(FIRST_NAMES))
    last = str(rng.choice(LAST_NAMES))
    plan = str(rng.choice(PLANS, p=PLAN_WEIGHTS))
    spend_min, spend_max = PLAN_SPEND[plan]
    monthly_spend = float(np.round(rng.uniform(spend_min, spend_max), 2))
    tenure_bucket = rng.choice(["new", "mid", "long"], p=[0.18, 0.52, 0.30])
    if tenure_bucket == "new":
        tenure_days = int(rng.integers(12, 90))
    elif tenure_bucket == "mid":
        tenure_days = int(rng.integers(90, 540))
    else:
        tenure_days = int(rng.integers(540, 1800))

    signup = as_of - timedelta(days=tenure_days)
    engagement = float(np.clip(rng.beta(2.2, 1.6), 0.05, 0.98))
    inactivity = float(np.clip(rng.beta(1.4, 3.2), 0.0, 0.95))
    support_pain = float(np.clip(rng.gamma(1.2, 0.9), 0.0, 8.0))
    payment_stress = float(np.clip(rng.beta(1.1, 4.5), 0.0, 0.9))
    discount_dependence = float(np.clip(rng.beta(1.3, 3.4), 0.0, 0.95))

    tenure_months = tenure_days / 30.437
    logit = (
        -2.05
        + 1.35 * inactivity
        + 0.55 * payment_stress
        + 0.18 * support_pain
        + 0.45 * (1 - engagement)
        + 0.35 * discount_dependence
        + 0.22 * (plan == "starter")
        - 0.03 * min(tenure_months, 36)
        + 0.18 * (tenure_bucket == "new")
        + float(rng.normal(0, 0.35))
    )
    churn_p = 1 / (1 + np.exp(-logit))
    churned = bool(rng.random() < churn_p)

    if churned:
        status = "churned"
        quiet_days = int(rng.integers(20, 120))
    elif tenure_bucket == "new" and rng.random() < 0.25:
        status = "trial"
        quiet_days = int(rng.integers(0, 8))
    elif inactivity > 0.7 and rng.random() < 0.2:
        status = "paused"
        quiet_days = int(rng.integers(10, 40))
    else:
        status = "active"
        quiet_days = int(rng.integers(0, max(1, int(8 + inactivity * 25))))

    # The customer cannot have gone quiet before they signed up.
    quiet_days = min(quiet_days, max(tenure_days - 5, 1))
    last_seen = as_of - timedelta(days=quiet_days)

    billing = "annual" if plan == "enterprise" and rng.random() < 0.45 else "monthly"
    customer = DemoCustomer(
        id=uuid4(),
        email=f"{first.lower()}.{last.lower()}.{index}@demo.churnpilot.ai",
        first_name=first,
        last_name=last,
        company=f"{rng.choice(COMPANY_ROOTS)} {rng.choice(COMPANY_SUFFIXES)}",
        plan=plan,
        status=status,
        billing_interval=billing,
        signup_date=signup.replace(microsecond=0),
        last_seen_at=last_seen.replace(microsecond=0),
        monthly_recurring_revenue=monthly_spend,
        country=str(rng.choice(COUNTRIES)),
        churned=churned,
    )
    active_days = max(float(tenure_days - quiet_days), 1.0)
    latents = {
        "engagement": engagement,
        "inactivity": inactivity,
        "support_pain": support_pain,
        "payment_stress": payment_stress,
        "discount_dependence": discount_dependence,
        "tenure_days": float(tenure_days),
        "active_days": active_days,
        "active_months": active_days / 30.437,
        "churn_p": float(churn_p),
    }
    return customer, latents


def _build_transactions(
    rng: np.random.Generator,
    customer: DemoCustomer,
    latents: dict[str, float],
    as_of: datetime,
) -> list[DemoTransaction]:
    # Orders accumulate while the customer is engaged and stop once they go quiet,
    # so purchase frequency and order recency stay faithful to the latent behaviour.
    active_days = latents["active_days"]
    active_months = max(latents["active_months"], 0.5)
    monthly_rate = max(0.25, 0.45 + 2.1 * latents["engagement"] * (1 - 0.55 * latents["inactivity"]))
    order_count = max(1, int(rng.poisson(monthly_rate * active_months)))
    interval = 30.437 / monthly_rate
    age = min(float(rng.uniform(0.05, 0.9)) * interval, active_days * 0.6)

    items: list[DemoTransaction] = []
    for index in range(order_count):
        if index > 0:
            age += interval * float(rng.uniform(0.6, 1.4))
        if age > active_days:
            break
        occurred = customer.last_seen_at - timedelta(days=age, hours=int(rng.integers(0, 20)))
        failed = rng.random() < (0.04 + latents["payment_stress"] * 0.28)
        refunded = (not failed) and rng.random() < 0.04
        amount = float(np.round(customer.monthly_recurring_revenue * rng.uniform(0.35, 1.25), 2))
        tx_type = "subscription" if rng.random() < 0.7 else "one_time"
        if customer.plan in {"professional", "enterprise"} and rng.random() < 0.08:
            tx_type = "upgrade"
        status = "failed" if failed else ("refunded" if refunded else "completed")
        if refunded:
            tx_type = "refund"
        items.append(
            DemoTransaction(
                id=uuid4(),
                customer_id=customer.id,
                amount=abs(amount),
                status=status,
                transaction_type=tx_type,
                occurred_at=occurred.replace(microsecond=0),
                external_id=f"txn_{customer.id.hex[:10]}_{index}",
            )
        )
    return items


def _build_activities(
    rng: np.random.Generator,
    customer: DemoCustomer,
    latents: dict[str, float],
    as_of: datetime,
) -> list[DemoActivity]:
    # Monthly rates keep login frequency and email engagement proportional to the
    # latent engagement level rather than to tenure length alone.
    active_days = latents["active_days"]
    active_months = max(latents["active_months"], 0.5)
    login_rate = max(0.3, 0.5 + 4.2 * latents["engagement"] * (1 - 0.6 * latents["inactivity"]))
    email_rate = max(0.1, 0.3 + 2.6 * latents["engagement"] * (1 - 0.4 * latents["inactivity"]))
    discount_rate = 0.05 + 0.9 * latents["discount_dependence"]

    login_count = max(1, int(rng.poisson(login_rate * active_months)))
    email_count = int(rng.poisson(email_rate * active_months))
    discount_count = int(rng.poisson(discount_rate * active_months))

    items: list[DemoActivity] = []
    for _ in range(login_count):
        items.append(_activity(rng, customer, active_days, "login", "app", "web"))
    for _ in range(email_count):
        kind = "email_open" if rng.random() < 0.7 else "email_click"
        items.append(_activity(rng, customer, active_days, kind, None, "email"))
    for _ in range(discount_count):
        items.append(_activity(rng, customer, active_days, "discount_redeemed", "billing", "web"))
    if rng.random() < 0.6:
        items.append(_activity(rng, customer, active_days, "feature_use", "reports", "web"))
    return items


def _activity(
    rng: np.random.Generator,
    customer: DemoCustomer,
    active_days: float,
    activity_type: str,
    feature_name: str | None,
    channel: str | None,
) -> DemoActivity:
    age = active_days * float(rng.beta(1.0, 1.6))
    occurred = customer.last_seen_at - timedelta(days=age, hours=int(rng.integers(0, 23)))
    return DemoActivity(
        id=uuid4(),
        customer_id=customer.id,
        activity_type=activity_type,
        feature_name=feature_name,
        channel=channel,
        occurred_at=occurred.replace(microsecond=0),
    )


def _build_support(
    rng: np.random.Generator,
    customer: DemoCustomer,
    latents: dict[str, float],
    as_of: datetime,
) -> list[DemoSupport]:
    ticket_count = int(rng.poisson(latents["support_pain"]))
    complaint_count = int(rng.poisson(latents["support_pain"] * 0.35))
    active_days = latents["active_days"]
    items: list[DemoSupport] = []
    for _ in range(ticket_count):
        items.append(_support_event(rng, customer, as_of, active_days, "ticket", "Product issue"))
    for _ in range(complaint_count):
        items.append(_support_event(rng, customer, as_of, active_days, "complaint", "Service complaint"))
    if rng.random() < 0.12:
        items.append(_support_event(rng, customer, as_of, active_days, "bug_report", "Bug report"))
    return items


def _support_event(
    rng: np.random.Generator,
    customer: DemoCustomer,
    as_of: datetime,
    active_days: float,
    event_type: str,
    subject: str,
) -> DemoSupport:
    age = active_days * float(rng.beta(1.0, 1.4))
    occurred = customer.last_seen_at - timedelta(days=age)
    severity = str(rng.choice(["low", "medium", "high", "urgent"], p=[0.35, 0.4, 0.2, 0.05]))
    resolved = rng.random() < 0.72
    resolved_at = (occurred + timedelta(days=int(rng.integers(1, 12)))) if resolved else None
    if resolved_at and resolved_at > as_of:
        resolved_at = as_of
    return DemoSupport(
        id=uuid4(),
        customer_id=customer.id,
        event_type=event_type,
        subject=subject,
        severity=severity,
        status="resolved" if resolved else "open",
        occurred_at=occurred.replace(microsecond=0),
        resolved_at=resolved_at.replace(microsecond=0) if resolved_at else None,
    )
