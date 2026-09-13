from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.core.priority import (
    priority_level_from_score,
    priority_score,
    retention_opportunity_score,
    value_score,
)
from app.core.revenue import revenue_at_risk
from app.ml.features import CustomerFeatureRow
from app.ml.predictor import PredictionResult


SEGMENT_ORDER = [
    "high_value_high_risk",
    "high_value_low_risk",
    "low_value_high_risk",
    "new_customers",
    "loyal_customers",
    "inactive_customers",
    "support_frustrated",
    "steady_customers",
]

SEGMENT_LABELS = {
    "high_value_high_risk": "High Value / High Risk",
    "high_value_low_risk": "High Value / Low Risk",
    "low_value_high_risk": "Low Value / High Risk",
    "new_customers": "New Customers",
    "loyal_customers": "Loyal Customers",
    "inactive_customers": "Inactive Customers",
    "support_frustrated": "Support-Frustrated Customers",
    "steady_customers": "Steady Customers",
}


@dataclass
class ScoredCustomer:
    features: CustomerFeatureRow
    churn_probability: float | None
    risk_level: str | None
    priority_score: float | None
    priority_level: str | None
    revenue_at_risk: float | None
    segment: str
    is_high_value: bool = False
    retention_opportunity: float = 0.0
    explanation: dict | None = None
    model_name: str | None = None
    model_version: str | None = None
    predicted_at: object | None = None


def high_value_threshold(rows: list[CustomerFeatureRow]) -> float:
    spends = sorted(row.monthly_spend for row in rows)
    if not spends:
        return 0.0
    index = int(round((len(spends) - 1) * 0.8))
    return float(spends[index])


def assign_segment(row: CustomerFeatureRow, risk_level: str | None, value_cut: float) -> str:
    high_risk = risk_level in {"high", "critical"}
    is_high_value = value_cut > 0 and row.monthly_spend >= value_cut

    if row.complaint_count >= 2 or row.support_tickets >= 4:
        return "support_frustrated"
    if row.is_churned or row.status == "paused" or row.days_since_last_order >= 60:
        return "inactive_customers"
    if row.tenure_months < 3:
        return "new_customers"
    if is_high_value:
        return "high_value_high_risk" if high_risk else "high_value_low_risk"
    if high_risk:
        return "low_value_high_risk"
    if row.tenure_months >= 12:
        return "loyal_customers"
    return "steady_customers"


def score_customer(
    row: CustomerFeatureRow,
    prediction: PredictionResult | None,
    *,
    spend_benchmark: float,
    value_cut: float,
) -> ScoredCustomer:
    probability = prediction.churn_probability if prediction else None
    risk_level = prediction.risk_level if prediction else None
    customer_value = value_score(row.monthly_spend, spend_benchmark)
    revenue_share = customer_value
    opportunity = retention_opportunity_score(
        churn_probability=probability or 0.0,
        value=customer_value,
        is_active=not row.is_churned,
    )
    p_score = None
    p_level = None
    rar = None
    if probability is not None:
        p_score = priority_score(
            churn_probability=probability,
            customer_value_score=customer_value,
            revenue_contribution_score=revenue_share,
            retention_opportunity=opportunity,
        )
        p_level = priority_level_from_score(p_score)
        rar = revenue_at_risk(row.monthly_spend, probability)

    return ScoredCustomer(
        features=row,
        churn_probability=probability,
        risk_level=risk_level,
        priority_score=p_score,
        priority_level=p_level,
        revenue_at_risk=rar,
        segment=assign_segment(row, risk_level, value_cut),
        is_high_value=bool(value_cut > 0 and row.monthly_spend >= value_cut),
        retention_opportunity=round(opportunity, 6),
        explanation=prediction.explanation if prediction else None,
        model_name=prediction.model_name if prediction else None,
        model_version=prediction.model_version if prediction else None,
    )


def score_rows(
    rows: list[CustomerFeatureRow],
    predictions: dict[UUID, PredictionResult] | None = None,
) -> list[ScoredCustomer]:
    predictions = predictions or {}
    spends = [row.monthly_spend for row in rows] or [0.0]
    spend_benchmark = max(spends) if spends else 1.0
    value_cut = high_value_threshold(rows)
    scored = []
    for row in rows:
        scored.append(
            score_customer(
                row,
                predictions.get(row.customer_id),
                spend_benchmark=max(spend_benchmark, 1.0),
                value_cut=value_cut,
            )
        )
    return scored
