from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.revenue import annualized_revenue_at_risk
from app.ml.model_loader import model_loader
from app.schemas.platform import (
    BandRow,
    ChurnAnalyticsData,
    CountMetric,
    DashboardSummary,
    RetentionOpportunityRow,
    RevenueRiskData,
    SegmentListData,
    SegmentRow,
    TrendPoint,
)
from app.services.scoring import SEGMENT_LABELS, SEGMENT_ORDER, ScoredCustomer
from app.services.snapshot import scored_customers
from app.utils.time import utcnow

TREND_MONTHS = 12
TENURE_BANDS = [
    ("0-3 months", 0.0, 3.0),
    ("3-6 months", 3.0, 6.0),
    ("6-12 months", 6.0, 12.0),
    ("12-24 months", 12.0, 24.0),
    ("24+ months", 24.0, float("inf")),
]
ENGAGEMENT_BANDS = [
    ("No logins", 0.0, 0.001),
    ("Low", 0.001, 1.0),
    ("Moderate", 1.0, 3.0),
    ("High", 3.0, float("inf")),
]
SUPPORT_BANDS = [
    ("No tickets", 0, 1),
    ("1-2 tickets", 1, 3),
    ("3-5 tickets", 3, 6),
    ("6+ tickets", 6, 10**9),
]


def dashboard_summary(db: Session, scored: list[ScoredCustomer] | None = None) -> DashboardSummary:
    scored = scored if scored is not None else _load_scored(db)
    total = len(scored)
    churned = sum(1 for item in scored if item.features.is_churned)
    active = sum(1 for item in scored if item.features.status == "active")
    at_risk = sum(1 for item in scored if item.risk_level in {"medium", "high", "critical"})
    high_risk = sum(1 for item in scored if item.risk_level in {"high", "critical"})
    monthly_revenue = sum(item.features.monthly_spend for item in scored)
    rar = sum(item.revenue_at_risk or 0 for item in scored)
    high_value_rar = sum(item.revenue_at_risk or 0 for item in scored if item.is_high_value)
    opportunities = [item for item in scored if item.priority_level in {"high", "urgent"}]

    model = None
    if model_loader.is_ready():
        bundle = model_loader.load()
        model = {
            "name": bundle.model_name,
            "version": bundle.model_version,
            "trained_at": bundle.trained_at,
            "metrics": {
                key: bundle.metrics.get(key)
                for key in ("accuracy", "precision", "recall", "f1", "roc_auc", "sample_count")
            },
        }

    return DashboardSummary(
        total_customers=total,
        active_customers=active,
        churned_customers=churned,
        observed_churn_rate=_rate(churned, total),
        at_risk_customers=at_risk,
        predicted_high_risk_customers=high_risk,
        total_monthly_revenue=round(monthly_revenue, 2),
        total_revenue_at_risk=round(rar, 2),
        annualized_revenue_at_risk=annualized_revenue_at_risk(rar),
        high_value_revenue_at_risk=round(high_value_rar, 2),
        retention_opportunity_customers=len(opportunities),
        retention_opportunity_value=round(sum(item.revenue_at_risk or 0 for item in opportunities), 2),
        scored_customers=sum(1 for item in scored if item.churn_probability is not None),
        risk_distribution=_risk_distribution(scored),
        churn_trend=_churn_trend(scored),
        revenue_at_risk_by_segment=_segments(scored),
        segment_distribution=_segment_distribution(scored),
        model=model,
    )


def segment_snapshot(db: Session) -> SegmentListData:
    return SegmentListData(items=_segments(_load_scored(db)))


def churn_analytics(db: Session, scored: list[ScoredCustomer] | None = None) -> ChurnAnalyticsData:
    scored = scored if scored is not None else _load_scored(db)
    probabilities = [item.churn_probability for item in scored if item.churn_probability is not None]
    plan_groups: dict[str, list[ScoredCustomer]] = defaultdict(list)
    for item in scored:
        plan_groups[item.features.plan or "unknown"].append(item)
    churn_by_plan = [
        CountMetric(
            key=plan,
            count=sum(1 for item in items if item.features.is_churned),
            share=_rate(sum(1 for item in items if item.features.is_churned), len(items)),
        )
        for plan, items in sorted(plan_groups.items())
    ]
    return ChurnAnalyticsData(
        observed_churn_rate=_rate(sum(1 for item in scored if item.features.is_churned), len(scored)),
        predicted_average_probability=round(sum(probabilities) / len(probabilities), 6) if probabilities else None,
        risk_distribution=_risk_distribution(scored),
        churn_by_plan=churn_by_plan,
        churn_by_segment=_segments(scored),
        churn_trend=_churn_trend(scored),
        churn_by_tenure=_bands(scored, lambda item: item.features.tenure_months, TENURE_BANDS),
        churn_by_spend=_spend_bands(scored),
        engagement_vs_churn=_bands(scored, lambda item: item.features.login_frequency, ENGAGEMENT_BANDS),
        support_vs_churn=_bands(scored, lambda item: item.features.support_tickets, SUPPORT_BANDS),
    )


def revenue_risk(db: Session, scored: list[ScoredCustomer] | None = None) -> RevenueRiskData:
    scored = scored if scored is not None else _load_scored(db)
    rar = sum(item.revenue_at_risk or 0 for item in scored)
    high_value_rar = sum(item.revenue_at_risk or 0 for item in scored if item.is_high_value)

    by_risk: dict[str, list[ScoredCustomer]] = defaultdict(list)
    for item in scored:
        by_risk[item.risk_level or "unscored"].append(item)
    risk_rows = [
        {
            "risk_level": key,
            "customer_count": len(items),
            "revenue_at_risk": round(sum(item.revenue_at_risk or 0 for item in items), 2),
            "revenue_at_risk_is_estimate": True,
        }
        for key, items in sorted(by_risk.items())
    ]

    ranked = sorted(
        (item for item in scored if item.priority_score is not None and not item.features.is_churned),
        key=lambda item: item.priority_score or 0,
        reverse=True,
    )[:25]

    return RevenueRiskData(
        total_revenue_at_risk=round(rar, 2),
        annualized_revenue_at_risk=annualized_revenue_at_risk(rar),
        high_value_customer_revenue_at_risk=round(high_value_rar, 2),
        by_risk_category=risk_rows,
        by_segment=_segments(scored),
        retention_opportunities=[
            RetentionOpportunityRow(
                customer_id=item.features.customer_id,
                name=item.features.display_name(),
                company=item.features.company,
                segment=item.segment,
                segment_label=SEGMENT_LABELS.get(item.segment, item.segment),
                churn_probability=item.churn_probability or 0.0,
                risk_level=item.risk_level or "low",
                monthly_spend=item.features.monthly_spend,
                revenue_at_risk=item.revenue_at_risk or 0.0,
                priority_score=item.priority_score or 0.0,
                priority_level=item.priority_level or "low",
            )
            for item in ranked
        ],
    )


def _load_scored(db: Session) -> list[ScoredCustomer]:
    return scored_customers(db)


def _segments(scored: list[ScoredCustomer]) -> list[SegmentRow]:
    groups: dict[str, list[ScoredCustomer]] = defaultdict(list)
    for item in scored:
        groups[item.segment].append(item)
    rows = []
    for segment in SEGMENT_ORDER:
        items = groups.get(segment)
        if not items:
            continue
        churned = sum(1 for item in items if item.features.is_churned)
        probs = [item.churn_probability for item in items if item.churn_probability is not None]
        rows.append(
            SegmentRow(
                segment=segment,
                label=SEGMENT_LABELS.get(segment, segment),
                customer_count=len(items),
                observed_churn_rate=_rate(churned, len(items)),
                average_churn_probability=round(sum(probs) / len(probs), 6) if probs else None,
                monthly_revenue=round(sum(item.features.monthly_spend for item in items), 2),
                revenue_at_risk=round(sum(item.revenue_at_risk or 0 for item in items), 2),
                revenue_at_risk_is_estimate=True,
            )
        )
    return rows


def _segment_distribution(scored: list[ScoredCustomer]) -> list[CountMetric]:
    total = max(len(scored), 1)
    counts: dict[str, int] = defaultdict(int)
    for item in scored:
        counts[item.segment] += 1
    return [
        CountMetric(key=segment, count=counts[segment], share=round(counts[segment] / total, 6))
        for segment in SEGMENT_ORDER
        if counts.get(segment)
    ]


def _risk_distribution(scored: list[ScoredCustomer]) -> list[CountMetric]:
    order = ["low", "medium", "high", "critical", "unscored"]
    counts: dict[str, int] = defaultdict(int)
    for item in scored:
        counts[item.risk_level or "unscored"] += 1
    total = max(len(scored), 1)
    return [
        CountMetric(key=key, count=counts[key], share=round(counts[key] / total, 6))
        for key in order
        if counts.get(key)
    ]


def _churn_trend(scored: list[ScoredCustomer]) -> list[TrendPoint]:
    now = utcnow()
    points: list[TrendPoint] = []
    for offset in range(TREND_MONTHS - 1, -1, -1):
        window_end = _month_start(now, offset)
        window_start = _month_start(now, offset + 1)
        base = 0
        churned = 0
        for item in scored:
            signup = item.features.signup_date
            if signup is None or signup >= window_end:
                continue
            base += 1
            last_seen = item.features.last_seen_at
            if item.features.is_churned and last_seen and window_start <= last_seen < window_end:
                churned += 1
        points.append(
            TrendPoint(
                period=window_start.strftime("%Y-%m"),
                churn_rate=_rate(churned, base),
                churned_customers=churned,
                base_customers=base,
            )
        )
    return points


def _month_start(reference: datetime, months_back: int) -> datetime:
    year = reference.year
    month = reference.month - months_back
    while month <= 0:
        month += 12
        year -= 1
    return datetime(year, month, 1, tzinfo=timezone.utc)


def _bands(scored: list[ScoredCustomer], accessor, bands) -> list[BandRow]:
    rows: list[BandRow] = []
    for label, low, high in bands:
        items = [item for item in scored if low <= float(accessor(item)) < high]
        if not items:
            continue
        churned = sum(1 for item in items if item.features.is_churned)
        probs = [item.churn_probability for item in items if item.churn_probability is not None]
        rows.append(
            BandRow(
                band=label,
                customer_count=len(items),
                observed_churn_rate=_rate(churned, len(items)),
                average_churn_probability=round(sum(probs) / len(probs), 6) if probs else None,
            )
        )
    return rows


def _spend_bands(scored: list[ScoredCustomer]) -> list[BandRow]:
    spends = sorted(item.features.monthly_spend for item in scored)
    if not spends:
        return []
    quartiles = [
        spends[int((len(spends) - 1) * 0.25)],
        spends[int((len(spends) - 1) * 0.5)],
        spends[int((len(spends) - 1) * 0.75)],
    ]
    bands = [
        (f"Up to {quartiles[0]:.0f}", 0.0, quartiles[0]),
        (f"{quartiles[0]:.0f} - {quartiles[1]:.0f}", quartiles[0], quartiles[1]),
        (f"{quartiles[1]:.0f} - {quartiles[2]:.0f}", quartiles[1], quartiles[2]),
        (f"{quartiles[2]:.0f} and above", quartiles[2], float("inf")),
    ]
    return _bands(scored, lambda item: item.features.monthly_spend, bands)


def _rate(part: int, whole: int) -> float:
    if whole <= 0:
        return 0.0
    return round(part / whole, 6)
