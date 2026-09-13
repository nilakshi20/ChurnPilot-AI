from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total: int


class RiskFactor(BaseModel):
    feature: str
    label: str
    contribution: float
    effect: str


class Explanation(BaseModel):
    headline: str = "Factors contributing to this model prediction"
    disclaimer: str
    factors: list[RiskFactor] = Field(default_factory=list)


class CustomerSummary(BaseModel):
    id: UUID
    email: str
    first_name: str | None = None
    last_name: str | None = None
    company: str | None = None
    plan: str | None = None
    status: str
    country: str | None = None
    segment: str
    segment_label: str
    is_high_value: bool = False
    monthly_spend: float
    tenure_months: float
    total_orders: int
    days_since_last_order: float
    last_seen_at: datetime | None = None
    churn_probability: float | None = None
    risk_level: str | None = None
    priority_score: float | None = None
    priority_level: str | None = None
    retention_opportunity: float | None = None
    revenue_at_risk: float | None = None
    revenue_at_risk_is_estimate: bool = True


class CustomerDetail(CustomerSummary):
    billing_interval: str | None = None
    signup_date: datetime | None = None
    support_tickets: int
    complaint_count: int
    payment_failures: int
    email_engagement: float
    login_frequency: float
    purchase_frequency: float
    average_order_value: float
    discount_usage: int
    features: dict[str, float]


class CustomerListData(BaseModel):
    items: list[CustomerSummary]
    pagination: PaginationMeta


class PredictionData(BaseModel):
    customer_id: UUID
    churn_probability: float
    risk_level: str
    model_name: str
    model_version: str
    predicted_at: datetime
    revenue_at_risk: float
    revenue_at_risk_is_estimate: bool = True
    priority_score: float
    priority_level: str
    explanation: Explanation
    features: dict[str, float]


class RiskFactorsData(BaseModel):
    customer_id: UUID
    headline: str = "Factors contributing to this model prediction"
    disclaimer: str
    churn_probability: float
    risk_level: str
    factors: list[RiskFactor]


class GeminiRetentionOutput(BaseModel):
    strategy: str
    priority: str
    reasoning: str
    recommended_action: str
    channel: str
    incentive: str | None = None


class RetentionRecord(BaseModel):
    id: UUID
    customer_id: UUID
    prediction_id: UUID | None = None
    action_type: str
    title: str
    description: str | None = None
    priority: str
    status: str
    source: str = "gemini"
    strategy: str | None = None
    reasoning: str | None = None
    recommended_action: str | None = None
    channel: str | None = None
    incentive: str | None = None
    created_at: datetime


class RetentionListData(BaseModel):
    items: list[RetentionRecord]


class GenerateRetentionRequest(BaseModel):
    pass


class GenerateMessageRequest(BaseModel):
    channel: Literal["email", "whatsapp", "sms", "sales_call"]
    tone: Literal["professional", "friendly", "concise", "premium"] = "professional"


class GeneratedMessageData(BaseModel):
    id: UUID
    customer_id: UUID
    channel: str
    tone: str | None = None
    subject: str | None = None
    body: str
    status: str
    generated_by: str | None = None
    send_status: Literal["not_sent"] = "not_sent"
    created_at: datetime


class CountMetric(BaseModel):
    key: str
    count: int
    share: float


class TrendPoint(BaseModel):
    period: str
    churn_rate: float
    churned_customers: int
    base_customers: int


class SegmentRow(BaseModel):
    segment: str
    label: str
    customer_count: int
    observed_churn_rate: float
    average_churn_probability: float | None = None
    monthly_revenue: float
    revenue_at_risk: float
    revenue_at_risk_is_estimate: bool = True


class DashboardSummary(BaseModel):
    total_customers: int
    active_customers: int
    churned_customers: int
    observed_churn_rate: float
    at_risk_customers: int
    predicted_high_risk_customers: int
    total_monthly_revenue: float
    total_revenue_at_risk: float
    annualized_revenue_at_risk: float
    high_value_revenue_at_risk: float
    retention_opportunity_customers: int
    retention_opportunity_value: float
    scored_customers: int
    estimates_label: str = "Revenue-at-risk figures are model estimates, not guaranteed losses."
    risk_distribution: list[CountMetric]
    churn_trend: list[TrendPoint]
    revenue_at_risk_by_segment: list[SegmentRow]
    segment_distribution: list[CountMetric]
    model: dict[str, Any] | None = None


class SegmentListData(BaseModel):
    items: list[SegmentRow]
    estimates_label: str = "Revenue-at-risk figures are model estimates, not guaranteed losses."


class BandRow(BaseModel):
    band: str
    customer_count: int
    observed_churn_rate: float
    average_churn_probability: float | None = None


class ChurnAnalyticsData(BaseModel):
    observed_churn_rate: float
    predicted_average_probability: float | None = None
    risk_distribution: list[CountMetric]
    churn_by_plan: list[CountMetric]
    churn_by_segment: list[SegmentRow]
    churn_trend: list[TrendPoint]
    churn_by_tenure: list[BandRow]
    churn_by_spend: list[BandRow]
    engagement_vs_churn: list[BandRow]
    support_vs_churn: list[BandRow]


class RetentionOpportunityRow(BaseModel):
    customer_id: UUID
    name: str | None = None
    company: str | None = None
    segment: str
    segment_label: str
    churn_probability: float
    risk_level: str
    monthly_spend: float
    revenue_at_risk: float
    priority_score: float
    priority_level: str


class RevenueRiskData(BaseModel):
    estimates_label: str = "Revenue-at-risk figures are model estimates, not guaranteed losses."
    total_revenue_at_risk: float
    annualized_revenue_at_risk: float
    high_value_customer_revenue_at_risk: float
    by_risk_category: list[dict[str, Any]]
    by_segment: list[SegmentRow]
    retention_opportunities: list[RetentionOpportunityRow]


class PlatformSettingsData(BaseModel):
    risk_thresholds: dict[str, float]
    priority_weights: dict[str, float]
    message_channels: list[str]
    message_tones: list[str]
    retention_actions: list[str]
    segments: list[dict[str, str]]
    model: dict[str, Any] | None = None
    demo_seed: int
    demo_customer_count: int


class InsightItem(BaseModel):
    title: str
    body: str
    metric_name: str
    metric_value: float | None = None
    severity: str
    source: Literal["calculated", "gemini"]


class InsightsData(BaseModel):
    items: list[InsightItem]
    metrics_used: dict[str, Any]


class PredictionRunData(BaseModel):
    scored_customers: int
    model_name: str
    model_version: str
    metrics: dict[str, Any]


class DemoLoadData(BaseModel):
    customers_loaded: int
    transactions_loaded: int
    activities_loaded: int
    support_events_loaded: int
    predictions: PredictionRunData | None = None


class CsvIssue(BaseModel):
    row_number: int
    field: str | None = None
    code: str
    message: str


class CsvValidationData(BaseModel):
    preview: list[dict[str, Any]]
    stats: dict[str, int]
    issues: list[CsvIssue]
    persisted: int = 0
