from datetime import datetime, timezone
from uuid import uuid4

import numpy as np

from app.core.risk import risk_level_from_probability
from app.ml.features import FEATURE_COLUMNS, CustomerFeatureRow, SHAP_HEADLINE
from app.ml.predictor import Predictor
from app.ml.trainer import train_from_arrays
from app.schemas.platform import Explanation, PredictionData
from app.core.responses import ok


def _row(index: int, churned: bool) -> CustomerFeatureRow:
    failures = 6 if churned else 0
    inactivity = 90 if churned else 5
    return CustomerFeatureRow(
        customer_id=uuid4(),
        email=f"user{index}@example.com",
        first_name="Ada",
        last_name="Lovelace",
        company="Example",
        plan="growth",
        status="churned" if churned else "active",
        country="US",
        billing_interval="monthly",
        signup_date=datetime(2024, 1, 1, tzinfo=timezone.utc),
        last_seen_at=datetime(2024, 6, 1, tzinfo=timezone.utc),
        tenure_months=8,
        monthly_spend=120,
        total_orders=3 if churned else 12,
        average_order_value=40,
        days_since_last_order=inactivity,
        purchase_frequency=0.4 if churned else 1.5,
        support_tickets=4 if churned else 0,
        complaint_count=2 if churned else 0,
        discount_usage=3 if churned else 0,
        email_engagement=0.2 if churned else 2.0,
        login_frequency=0.3 if churned else 4.0,
        payment_failures=failures,
        is_churned=churned,
    )


def test_prediction_response_contains_probability_and_risk() -> None:
    rows = [_row(i, churned=i % 3 == 0) for i in range(40)]
    X = np.array([[row.to_feature_dict()[name] for name in FEATURE_COLUMNS] for row in rows], dtype=float)
    y = np.array([int(row.is_churned) for row in rows], dtype=int)
    bundle = train_from_arrays(X, y, test_size=0.25)
    results = Predictor(bundle).predict_rows(rows[:3])
    assert len(results) == 3
    item = results[0]
    assert 0.0 <= item.churn_probability <= 1.0
    assert item.risk_level == risk_level_from_probability(item.churn_probability)
    assert item.explanation["headline"] == SHAP_HEADLINE
    assert "do not prove" in item.explanation["disclaimer"].lower()
    payload = ok(
        PredictionData(
            customer_id=item.customer_id,
            churn_probability=item.churn_probability,
            risk_level=item.risk_level,
            model_name=item.model_name,
            model_version=item.model_version,
            predicted_at=datetime.now(timezone.utc),
            revenue_at_risk=48.0,
            priority_score=0.4,
            priority_level="medium",
            explanation=Explanation.model_validate(item.explanation),
            features=item.features,
        )
    )
    dumped = payload.model_dump()
    assert dumped["success"] is True
    assert dumped["data"]["churn_probability"] == item.churn_probability
    assert dumped["data"]["risk_level"] == item.risk_level
    assert "accuracy" in bundle.metrics
    assert "confusion_matrix" in bundle.metrics
