def revenue_at_risk(monthly_spend: float, churn_probability: float) -> float:
    return round(max(0.0, float(monthly_spend)) * max(0.0, min(1.0, float(churn_probability))), 2)


def annualized_revenue_at_risk(monthly_revenue_at_risk: float) -> float:
    return round(max(0.0, float(monthly_revenue_at_risk)) * 12.0, 2)
