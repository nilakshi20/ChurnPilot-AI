from __future__ import annotations

import numpy as np
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.db.models import ChurnPrediction
from app.ml.dataset import feature_frame, load_customer_feature_rows
from app.ml.features import FEATURE_COLUMNS
from app.ml.model_loader import model_loader
from app.ml.predictor import predictor
from app.ml.trainer import save_trained_model, train_from_arrays
from app.schemas.platform import PredictionRunData
from app.services import snapshot
from app.utils.time import utcnow


def run_predictions(db: Session, *, train_if_missing: bool = True) -> PredictionRunData:
    rows = load_customer_feature_rows(db)
    if not rows:
        raise AppError("No customers available to score", error_code="NO_CUSTOMERS")

    if not model_loader.is_ready():
        if not train_if_missing:
            raise AppError("Churn model is not trained yet", status_code=409, error_code="MODEL_NOT_TRAINED")
        train_model_from_database(db)

    results = predictor.predict_rows(rows)
    now = utcnow()
    for result in results:
        db.add(
            ChurnPrediction(
                customer_id=result.customer_id,
                risk_score=result.churn_probability,
                risk_level=result.risk_level,
                model_name=result.model_name,
                model_version=result.model_version,
                explanation={
                    **result.explanation,
                    "features": result.features,
                },
                predicted_at=now,
            )
        )
    db.commit()
    snapshot.invalidate()
    bundle = model_loader.load()
    return PredictionRunData(
        scored_customers=len(results),
        model_name=bundle.model_name,
        model_version=bundle.model_version,
        metrics=bundle.metrics,
    )


def train_model_from_database(db: Session):
    rows = load_customer_feature_rows(db)
    if len(rows) < 20:
        raise AppError("Not enough labeled customers to train a model", error_code="INSUFFICIENT_TRAINING_DATA")
    frame = feature_frame(rows)
    X = frame[FEATURE_COLUMNS].to_numpy(dtype=float)
    y = np.array([int(row.is_churned) for row in rows], dtype=int)
    if len(np.unique(y)) < 2:
        raise AppError("Training data must include both churned and retained customers", error_code="INSUFFICIENT_TRAINING_DATA")
    bundle = train_from_arrays(X, y)
    save_trained_model(bundle)
    model_loader.clear()
    predictor._bundle = None
    return bundle
