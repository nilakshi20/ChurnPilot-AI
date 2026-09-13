from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.schemas.platform import InsightItem, InsightsData
from app.services.analytics_service import churn_analytics, dashboard_summary, revenue_risk
from app.services.gemini_service import gemini_service
from app.services.snapshot import scored_customers


def list_insights(db: Session) -> InsightsData:
    # One snapshot for all three views keeps this endpoint to a single pass over the base.
    scored = scored_customers(db)
    dashboard = dashboard_summary(db, scored)
    churn = churn_analytics(db, scored)
    revenue = revenue_risk(db, scored)
    metrics = {
        "total_customers": dashboard.total_customers,
        "observed_churn_rate": dashboard.observed_churn_rate,
        "predicted_high_risk_customers": dashboard.predicted_high_risk_customers,
        "total_revenue_at_risk": dashboard.total_revenue_at_risk,
        "annualized_revenue_at_risk": dashboard.annualized_revenue_at_risk,
        "high_value_revenue_at_risk": dashboard.high_value_revenue_at_risk,
        "risk_distribution": [item.model_dump() for item in dashboard.risk_distribution],
        "churn_by_plan": [item.model_dump() for item in churn.churn_by_plan],
        "segments": [item.model_dump() for item in revenue.by_segment],
    }
    calculated = _calculated_insights(dashboard, revenue)
    try:
        generated = gemini_service.generate_insights(metrics)
        items = calculated + [InsightItem.model_validate(item) for item in generated]
    except AppError:
        items = calculated
    return InsightsData(items=items, metrics_used=metrics)


def _calculated_insights(dashboard, revenue) -> list[InsightItem]:
    items: list[InsightItem] = []
    items.append(
        InsightItem(
            title="Observed churn rate",
            body=(
                f"{dashboard.churned_customers} of {dashboard.total_customers} customers are currently "
                f"marked churned ({dashboard.observed_churn_rate:.1%})."
            ),
            metric_name="observed_churn_rate",
            metric_value=dashboard.observed_churn_rate,
            severity="high" if dashboard.observed_churn_rate >= 0.25 else "medium",
            source="calculated",
        )
    )
    items.append(
        InsightItem(
            title="Estimated monthly revenue at risk",
            body=(
                f"Estimated monthly revenue at risk is {dashboard.total_revenue_at_risk:.2f}, "
                f"annualized to {dashboard.annualized_revenue_at_risk:.2f}. These are model estimates."
            ),
            metric_name="total_revenue_at_risk",
            metric_value=dashboard.total_revenue_at_risk,
            severity="high" if dashboard.total_revenue_at_risk > 0 else "info",
            source="calculated",
        )
    )
    if revenue.by_segment:
        top = max(revenue.by_segment, key=lambda item: item.revenue_at_risk)
        items.append(
            InsightItem(
                title="Segment with the most estimated revenue at risk",
                body=(
                    f"The {top.label} segment accounts for {top.revenue_at_risk:.2f} in estimated "
                    f"revenue at risk across {top.customer_count} customers."
                ),
                metric_name="segment_revenue_at_risk",
                metric_value=top.revenue_at_risk,
                severity="medium",
                source="calculated",
            )
        )
    items.append(
        InsightItem(
            title="High-value estimated exposure",
            body=(
                f"High-value customers carry {dashboard.high_value_revenue_at_risk:.2f} in estimated "
                "revenue at risk."
            ),
            metric_name="high_value_revenue_at_risk",
            metric_value=dashboard.high_value_revenue_at_risk,
            severity="high" if dashboard.high_value_revenue_at_risk > 0 else "info",
            source="calculated",
        )
    )
    return items
