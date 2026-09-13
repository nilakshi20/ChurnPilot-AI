from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
from sklearn.pipeline import Pipeline

from app.core.config import settings
from app.core.exceptions import AppError
from app.ml.trainer import MODEL_FILENAME, TrainedModel


class ModelLoader:
    def __init__(self, directory: Path | None = None) -> None:
        self.directory = directory or settings.model_dir_path
        self._bundle: TrainedModel | None = None

    def is_ready(self) -> bool:
        return (self.directory / MODEL_FILENAME).exists()

    def load(self, force: bool = False) -> TrainedModel:
        if self._bundle is not None and not force:
            return self._bundle
        path = self.directory / MODEL_FILENAME
        if not path.exists():
            raise AppError("Churn model is not trained yet", status_code=409, error_code="MODEL_NOT_TRAINED")
        payload: dict[str, Any] = joblib.load(path)
        pipeline = payload["pipeline"]
        if not isinstance(pipeline, Pipeline):
            raise AppError("Stored model artifact is invalid", error_code="MODEL_INVALID")
        self._bundle = TrainedModel(
            pipeline=pipeline,
            model_name=str(payload.get("model_name", "unknown")),
            model_version=str(payload.get("model_version", "unknown")),
            metrics=dict(payload.get("metrics") or {}),
            feature_names=list(payload.get("feature_names") or []),
            trained_at=str(payload.get("trained_at", "")),
        )
        return self._bundle

    def clear(self) -> None:
        self._bundle = None


model_loader = ModelLoader()
