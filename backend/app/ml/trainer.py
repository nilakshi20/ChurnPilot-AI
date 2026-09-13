from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.core.config import settings
from app.ml.evaluation import evaluate_classifier
from app.ml.features import FEATURE_COLUMNS

MODEL_FILENAME = "churn_model.joblib"
METRICS_FILENAME = "metrics.json"
METADATA_FILENAME = "metadata.json"


@dataclass
class TrainedModel:
    pipeline: Pipeline
    model_name: str
    model_version: str
    metrics: dict[str, Any]
    feature_names: list[str]
    trained_at: str

    @property
    def estimator(self) -> Any:
        return self.pipeline.named_steps["model"]

    def transform(self, features: np.ndarray) -> np.ndarray:
        preprocessor = Pipeline(self.pipeline.steps[:-1])
        return preprocessor.transform(features)


def train_from_arrays(
    X: np.ndarray,
    y: np.ndarray,
    *,
    model_version: str | None = None,
    test_size: float = 0.2,
    random_state: int = 42,
) -> TrainedModel:
    if len(X) < 20:
        raise ValueError("Need at least 20 labeled rows to train a churn model")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=random_state,
        stratify=y if len(np.unique(y)) > 1 else None,
    )

    model_name, estimator = _build_estimator(y_train)
    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", estimator),
        ]
    )
    pipeline.fit(X_train, y_train)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    metrics = evaluate_classifier(y_test, y_prob)
    trained_at = datetime.now(timezone.utc).isoformat()
    version = model_version or trained_at.replace(":", "").replace("-", "")[:15]
    metrics["model_name"] = model_name
    metrics["model_version"] = version
    metrics["feature_names"] = FEATURE_COLUMNS
    return TrainedModel(
        pipeline=pipeline,
        model_name=model_name,
        model_version=version,
        metrics=metrics,
        feature_names=FEATURE_COLUMNS,
        trained_at=trained_at,
    )


def save_trained_model(bundle: TrainedModel, directory: Path | None = None) -> Path:
    directory = directory or settings.model_dir_path
    directory.mkdir(parents=True, exist_ok=True)
    payload = {
        "pipeline": bundle.pipeline,
        "model_name": bundle.model_name,
        "model_version": bundle.model_version,
        "metrics": bundle.metrics,
        "feature_names": bundle.feature_names,
        "trained_at": bundle.trained_at,
    }
    joblib.dump(payload, directory / MODEL_FILENAME)
    (directory / METRICS_FILENAME).write_text(json.dumps(bundle.metrics, indent=2), encoding="utf-8")
    metadata = {
        "model_name": bundle.model_name,
        "model_version": bundle.model_version,
        "trained_at": bundle.trained_at,
        "feature_names": bundle.feature_names,
        "metrics": {
            key: bundle.metrics[key]
            for key in ("accuracy", "precision", "recall", "f1", "roc_auc")
            if key in bundle.metrics
        },
    }
    (directory / METADATA_FILENAME).write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return directory / MODEL_FILENAME


def _build_estimator(y_train: np.ndarray) -> tuple[str, Any]:
    positives = max(int(np.sum(y_train)), 1)
    negatives = max(int(len(y_train) - np.sum(y_train)), 1)
    scale_pos_weight = negatives / positives
    try:
        from xgboost import XGBClassifier

        return (
            "xgboost",
            XGBClassifier(
                n_estimators=120,
                max_depth=4,
                learning_rate=0.08,
                subsample=0.85,
                colsample_bytree=0.85,
                objective="binary:logistic",
                eval_metric="logloss",
                n_jobs=4,
                random_state=42,
                scale_pos_weight=scale_pos_weight,
            ),
        )
    except Exception:
        return (
            "random_forest",
            RandomForestClassifier(
                n_estimators=200,
                max_depth=8,
                min_samples_leaf=4,
                class_weight="balanced",
                random_state=42,
                n_jobs=4,
            ),
        )
