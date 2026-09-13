from app.core.priority import priority_level_from_score, priority_score, value_score


def test_priority_score_weights() -> None:
    score = priority_score(
        churn_probability=1.0,
        customer_value_score=1.0,
        revenue_contribution_score=1.0,
        retention_opportunity=1.0,
    )
    assert score == 1.0
    mixed = priority_score(
        churn_probability=0.8,
        customer_value_score=0.5,
        revenue_contribution_score=0.5,
        retention_opportunity=0.2,
    )
    assert 0.0 < mixed < 1.0
    assert mixed == round(0.45 * 0.8 + 0.25 * 0.5 + 0.15 * 0.5 + 0.15 * 0.2, 6)


def test_priority_levels_and_value_score() -> None:
    assert priority_level_from_score(0.24) == "low"
    assert priority_level_from_score(0.25) == "medium"
    assert priority_level_from_score(0.75) == "urgent"
    assert value_score(50, 100) == 0.5
    assert value_score(200, 100) == 1.0
