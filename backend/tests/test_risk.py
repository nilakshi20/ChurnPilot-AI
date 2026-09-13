from app.core.risk import risk_level_from_probability


def test_risk_thresholds() -> None:
    assert risk_level_from_probability(0.0) == "low"
    assert risk_level_from_probability(0.249) == "low"
    assert risk_level_from_probability(0.25) == "medium"
    assert risk_level_from_probability(0.49) == "medium"
    assert risk_level_from_probability(0.50) == "high"
    assert risk_level_from_probability(0.74) == "high"
    assert risk_level_from_probability(0.75) == "critical"
    assert risk_level_from_probability(1.0) == "critical"
