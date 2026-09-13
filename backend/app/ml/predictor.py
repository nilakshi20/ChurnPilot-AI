from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from app.core.risk import clamp_probability, risk_level_from_probability
from app.ml.explainer import explain_contributions, format_explanation
from app.ml.features import FEATURE_COLUMNS, CustomerFeatureRow
from app.ml.model_loader import model_loader
from app.ml.trainer import TrainedModel


@dataclass
class PredictionResult:
    customer_id: Any
    churn_probability: float
    risk_level: str
    model_name: str
    model_version: str
    features: dict[str, float]
    explanation: dict[str, Any]


class Predictor:
    def __init__(self, bundle: TrainedModel | None = None) -> None:
        self._bundle = bundle

    def bundle(self) -> TrainedModel:
        if self._bundle is None:
            self._bundle = model_loader.load()
        return self._bundle

    def predict_rows(self, rows: list[CustomerFeatureRow]) -> list[PredictionResult]:
        if not rows:
            return []
        bundle = self.bundle()
        feature_dicts = [row.to_feature_dict() for row in rows]
        X = np.array([[item[name] for name in FEATURE_COLUMNS] for item in feature_dicts], dtype=float)
        probabilities = bundle.pipeline.predict_proba(X)[:, 1]
        transformed = bundle.transform(X)
        explanations = explain_contributions(bundle.estimator, bundle.model_name, transformed, FEATURE_COLUMNS)

        results: list[PredictionResult] = []
        for row, probability, factors, features in zip(
            rows,
            probabilities,
            explanations,
            feature_dicts,
            strict=True,
        ):
            score = clamp_probability(float(probability))
            results.append(
                PredictionResult(
                    customer_id=row.customer_id,
                    churn_probability=round(score, 6),
                    risk_level=risk_level_from_probability(score),
                    model_name=bundle.model_name,
                    model_version=bundle.model_version,
                    features=features,
                    explanation=format_explanation(factors),
                )
            )
        return results


predictor = Predictor()
