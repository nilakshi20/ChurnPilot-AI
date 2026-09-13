from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import CustomerNotFoundError
from app.db.models import ChurnPrediction
from app.db.repositories.customer import CustomerRepository
from app.db.repositories.prediction import PredictionRepository
from app.ml.dataset import load_customer_feature_rows
from app.ml.features import SHAP_HEADLINE, CustomerFeatureRow
from app.ml.predictor import PredictionResult
from app.schemas.platform import (
    CustomerDetail,
    CustomerListData,
    CustomerSummary,
    Explanation,
    PaginationMeta,
    PredictionData,
    RiskFactor,
    RiskFactorsData,
)
from app.services.scoring import SEGMENT_LABELS, ScoredCustomer, score_rows

SORT_KEYS = {
    "priority_score": lambda item: item.priority_score or -1.0,
    "churn_probability": lambda item: item.churn_probability if item.churn_probability is not None else -1.0,
    "monthly_spend": lambda item: item.features.monthly_spend,
    "total_orders": lambda item: item.features.total_orders,
    "tenure_months": lambda item: item.features.tenure_months,
    "days_since_last_order": lambda item: item.features.days_since_last_order,
    "revenue_at_risk": lambda item: item.revenue_at_risk or -1.0,
    "name": lambda item: (item.features.display_name() or item.features.email).lower(),
    "company": lambda item: (item.features.company or "").lower(),
    "segment": lambda item: item.segment,
}


def list_customers(
    db: Session,
    *,
    search: str | None = None,
    status: str | None = None,
    plan: str | None = None,
    risk_level: str | None = None,
    segment: str | None = None,
    high_value_only: bool = False,
    sort_by: str = "priority_score",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 25,
) -> CustomerListData:
    from app.services.snapshot import scored_customers

    scored = list(scored_customers(db))
    if search:
        needle = search.strip().lower()
        scored = [item for item in scored if _matches_search(item, needle)]
    if status:
        scored = [item for item in scored if item.features.status == status]
    if plan:
        scored = [item for item in scored if item.features.plan == plan]
    if risk_level:
        scored = [item for item in scored if item.risk_level == risk_level]
    if segment:
        scored = [item for item in scored if item.segment == segment]
    if high_value_only:
        scored = [item for item in scored if item.is_high_value]

    key = SORT_KEYS.get(sort_by, SORT_KEYS["priority_score"])
    scored.sort(key=key, reverse=sort_dir.lower() != "asc")

    total = len(scored)
    start = max(page - 1, 0) * page_size
    return CustomerListData(
        items=[_summary(item) for item in scored[start : start + page_size]],
        pagination=PaginationMeta(page=page, page_size=page_size, total=total),
    )


def get_customer(db: Session, customer_id: UUID) -> CustomerDetail:
    if CustomerRepository(db).get_or_none(customer_id) is None:
        raise CustomerNotFoundError()
    rows = load_customer_feature_rows(db, [customer_id])
    if not rows:
        raise CustomerNotFoundError()
    scored = attach_stored_predictions(db, rows)[0]
    return _detail(scored)


def get_prediction(db: Session, customer_id: UUID) -> PredictionData:
    scored = _require_scored(db, customer_id)
    if scored.churn_probability is None:
        from app.core.exceptions import AppError

        raise AppError("No prediction exists for this customer", status_code=404, error_code="PREDICTION_NOT_FOUND")
    latest = PredictionRepository(db).latest_for_customer(customer_id)
    assert latest is not None
    return _prediction_data(scored, latest)


def get_risk_factors(db: Session, customer_id: UUID) -> RiskFactorsData:
    scored = _require_scored(db, customer_id)
    if scored.churn_probability is None or not scored.explanation:
        from app.core.exceptions import AppError

        raise AppError("No prediction exists for this customer", status_code=404, error_code="PREDICTION_NOT_FOUND")
    explanation = scored.explanation
    factors = [RiskFactor.model_validate(item) for item in explanation.get("factors", [])]
    return RiskFactorsData(
        customer_id=customer_id,
        headline=explanation.get("headline") or SHAP_HEADLINE,
        disclaimer=explanation.get("disclaimer")
        or "These values describe contributions to the model prediction, not proven causes of churn.",
        churn_probability=scored.churn_probability,
        risk_level=scored.risk_level or "low",
        factors=factors,
    )


def _matches_search(item: ScoredCustomer, needle: str) -> bool:
    row = item.features
    haystack = " ".join(
        part.lower()
        for part in (row.email, row.first_name, row.last_name, row.company)
        if part
    )
    return needle in haystack


def _require_scored(db: Session, customer_id: UUID) -> ScoredCustomer:
    if CustomerRepository(db).get_or_none(customer_id) is None:
        raise CustomerNotFoundError()
    rows = load_customer_feature_rows(db, [customer_id])
    if not rows:
        raise CustomerNotFoundError()
    return attach_stored_predictions(db, rows)[0]


def attach_stored_predictions(db: Session, rows: list[CustomerFeatureRow]) -> list[ScoredCustomer]:
    latest = PredictionRepository(db).latest_by_customer_ids([row.customer_id for row in rows])
    mapped: dict[UUID, PredictionResult] = {}
    for customer_id, record in latest.items():
        mapped[customer_id] = PredictionResult(
            customer_id=customer_id,
            churn_probability=record.risk_score,
            risk_level=record.risk_level,
            model_name=record.model_name,
            model_version=record.model_version,
            features=(record.explanation or {}).get("features") or {},
            explanation=record.explanation or {},
        )
    return score_rows(rows, mapped)


def _summary(item: ScoredCustomer) -> CustomerSummary:
    row = item.features
    return CustomerSummary(
        id=row.customer_id,
        email=row.email,
        first_name=row.first_name,
        last_name=row.last_name,
        company=row.company,
        plan=row.plan,
        status=row.status,
        country=row.country,
        segment=item.segment,
        segment_label=SEGMENT_LABELS.get(item.segment, item.segment),
        is_high_value=item.is_high_value,
        monthly_spend=row.monthly_spend,
        tenure_months=row.tenure_months,
        total_orders=row.total_orders,
        days_since_last_order=row.days_since_last_order,
        last_seen_at=row.last_seen_at,
        churn_probability=item.churn_probability,
        risk_level=item.risk_level,
        priority_score=item.priority_score,
        priority_level=item.priority_level,
        retention_opportunity=item.retention_opportunity,
        revenue_at_risk=item.revenue_at_risk,
        revenue_at_risk_is_estimate=True,
    )


def _detail(item: ScoredCustomer) -> CustomerDetail:
    base = _summary(item)
    row = item.features
    return CustomerDetail(
        **base.model_dump(),
        billing_interval=row.billing_interval,
        signup_date=row.signup_date,
        support_tickets=row.support_tickets,
        complaint_count=row.complaint_count,
        payment_failures=row.payment_failures,
        email_engagement=row.email_engagement,
        login_frequency=row.login_frequency,
        purchase_frequency=row.purchase_frequency,
        average_order_value=row.average_order_value,
        discount_usage=row.discount_usage,
        features=row.to_feature_dict(),
    )


def _prediction_data(item: ScoredCustomer, record: ChurnPrediction) -> PredictionData:
    explanation_raw = item.explanation or {}
    factors = [RiskFactor.model_validate(factor) for factor in explanation_raw.get("factors", [])]
    return PredictionData(
        customer_id=item.features.customer_id,
        churn_probability=item.churn_probability or record.risk_score,
        risk_level=item.risk_level or record.risk_level,
        model_name=record.model_name,
        model_version=record.model_version,
        predicted_at=record.predicted_at,
        revenue_at_risk=item.revenue_at_risk or 0.0,
        revenue_at_risk_is_estimate=True,
        priority_score=item.priority_score or 0.0,
        priority_level=item.priority_level or "low",
        explanation=Explanation(
            headline=explanation_raw.get("headline") or SHAP_HEADLINE,
            disclaimer=explanation_raw.get("disclaimer")
            or "These values describe contributions to the model prediction, not proven causes of churn.",
            factors=factors,
        ),
        features=item.features.to_feature_dict(),
    )
