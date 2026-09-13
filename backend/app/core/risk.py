from typing import Literal

RiskLevel = Literal["low", "medium", "high", "critical"]

LOW_MAX = 0.25
MEDIUM_MAX = 0.50
HIGH_MAX = 0.75


def risk_level_from_probability(probability: float) -> RiskLevel:
    score = max(0.0, min(1.0, float(probability)))
    if score < LOW_MAX:
        return "low"
    if score < MEDIUM_MAX:
        return "medium"
    if score < HIGH_MAX:
        return "high"
    return "critical"


def clamp_probability(value: float) -> float:
    return max(0.0, min(1.0, float(value)))
