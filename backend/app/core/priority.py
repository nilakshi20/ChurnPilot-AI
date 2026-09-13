from typing import Literal

PriorityLevel = Literal["low", "medium", "high", "urgent"]


def _clip(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def value_score(monthly_spend: float, spend_benchmark: float) -> float:
    if spend_benchmark <= 0:
        return 0.0
    return _clip(monthly_spend / spend_benchmark)


def retention_opportunity_score(
    *,
    churn_probability: float,
    value: float,
    is_active: bool,
) -> float:
    base = _clip(churn_probability) * _clip(value)
    return _clip(base if is_active else base * 0.35)


def priority_score(
    *,
    churn_probability: float,
    customer_value_score: float,
    revenue_contribution_score: float,
    retention_opportunity: float,
) -> float:
    score = (
        0.45 * _clip(churn_probability)
        + 0.25 * _clip(customer_value_score)
        + 0.15 * _clip(revenue_contribution_score)
        + 0.15 * _clip(retention_opportunity)
    )
    return round(_clip(score), 6)


def priority_level_from_score(score: float) -> PriorityLevel:
    if score < 0.25:
        return "low"
    if score < 0.50:
        return "medium"
    if score < 0.75:
        return "high"
    return "urgent"
