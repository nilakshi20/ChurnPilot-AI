from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

FEATURE_COLUMNS = [
    "tenure_months",
    "monthly_spend",
    "total_orders",
    "average_order_value",
    "days_since_last_order",
    "purchase_frequency",
    "support_tickets",
    "complaint_count",
    "discount_usage",
    "email_engagement",
    "login_frequency",
    "payment_failures",
]

FEATURE_LABELS = {
    "tenure_months": "Customer tenure in months",
    "monthly_spend": "Monthly spend",
    "total_orders": "Total completed orders",
    "average_order_value": "Average order value",
    "days_since_last_order": "Days since last order",
    "purchase_frequency": "Purchase frequency",
    "support_tickets": "Support ticket volume",
    "complaint_count": "Complaint volume",
    "discount_usage": "Discount usage",
    "email_engagement": "Email engagement",
    "login_frequency": "Login frequency",
    "payment_failures": "Payment failures",
}

SHAP_HEADLINE = "Factors contributing to this model prediction"


@dataclass
class CustomerFeatureRow:
    customer_id: UUID
    email: str
    first_name: str | None
    last_name: str | None
    company: str | None
    plan: str | None
    status: str
    country: str | None
    billing_interval: str | None
    signup_date: datetime | None
    last_seen_at: datetime | None
    tenure_months: float
    monthly_spend: float
    total_orders: int
    average_order_value: float
    days_since_last_order: float
    purchase_frequency: float
    support_tickets: int
    complaint_count: int
    discount_usage: int
    email_engagement: float
    login_frequency: float
    payment_failures: int
    is_churned: bool

    def to_feature_dict(self) -> dict[str, float]:
        return {
            "tenure_months": float(self.tenure_months),
            "monthly_spend": float(self.monthly_spend),
            "total_orders": float(self.total_orders),
            "average_order_value": float(self.average_order_value),
            "days_since_last_order": float(self.days_since_last_order),
            "purchase_frequency": float(self.purchase_frequency),
            "support_tickets": float(self.support_tickets),
            "complaint_count": float(self.complaint_count),
            "discount_usage": float(self.discount_usage),
            "email_engagement": float(self.email_engagement),
            "login_frequency": float(self.login_frequency),
            "payment_failures": float(self.payment_failures),
        }

    def display_name(self) -> str | None:
        parts = [part for part in [self.first_name, self.last_name] if part]
        return " ".join(parts) if parts else None
