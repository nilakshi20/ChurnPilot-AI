from app.core.revenue import annualized_revenue_at_risk, revenue_at_risk


def test_revenue_at_risk_is_spend_times_probability() -> None:
    assert revenue_at_risk(120, 0.4) == 48.0
    assert revenue_at_risk(0, 0.9) == 0.0
    assert revenue_at_risk(80, 0) == 0.0


def test_annualized_revenue_at_risk() -> None:
    assert annualized_revenue_at_risk(50) == 600.0
