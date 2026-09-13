from __future__ import annotations

from typing import Any

import numpy as np

from app.ml.features import FEATURE_COLUMNS, FEATURE_LABELS, SHAP_HEADLINE

TOP_FACTORS = 6


def explain_contributions(
    model: Any,
    model_name: str,
    transformed: np.ndarray,
    feature_names: list[str] | None = None,
) -> list[list[dict[str, Any]]]:
    names = feature_names or FEATURE_COLUMNS
    matrix = _contribution_matrix(model, model_name, transformed, names)
    explanations = []
    for row in matrix:
        ranked = sorted(row, key=lambda item: abs(float(item["contribution"])), reverse=True)
        explanations.append(ranked[:TOP_FACTORS])
    return explanations


def format_explanation(factors: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "headline": SHAP_HEADLINE,
        "disclaimer": (
            "These values describe how each feature contributed to this model's "
            "predicted churn probability. They do not prove that a feature caused churn."
        ),
        "factors": factors,
    }


def _contribution_matrix(
    model: Any,
    model_name: str,
    transformed: np.ndarray,
    names: list[str],
) -> list[list[dict[str, Any]]]:
    values = _shap_values(model, transformed)
    if values is None:
        values = _native_contributions(model, model_name, transformed)
    if values is None:
        values = _importance_fallback(model, transformed, names)

    rows: list[list[dict[str, Any]]] = []
    for row in np.asarray(values):
        factors = []
        for name, contribution in zip(names, row.tolist(), strict=False):
            numeric = float(contribution)
            factors.append(
                {
                    "feature": name,
                    "label": FEATURE_LABELS.get(name, name),
                    "contribution": round(numeric, 6),
                    "effect": (
                        "increases_predicted_risk" if numeric > 0 else "decreases_predicted_risk"
                    ),
                }
            )
        rows.append(factors)
    return rows


def _shap_values(model: Any, transformed: np.ndarray) -> np.ndarray | None:
    try:
        import shap

        explainer = shap.TreeExplainer(model)
        raw = explainer.shap_values(transformed)
        if isinstance(raw, list):
            raw = raw[1] if len(raw) > 1 else raw[0]
        array = np.asarray(raw)
        if array.ndim == 3:
            array = array[:, :, 1]
        return array
    except Exception:
        return None


def _native_contributions(model: Any, model_name: str, transformed: np.ndarray) -> np.ndarray | None:
    if model_name != "xgboost":
        return None
    try:
        import xgboost as xgb

        booster = model.get_booster() if hasattr(model, "get_booster") else model
        contribs = booster.predict(xgb.DMatrix(transformed), pred_contribs=True)
        array = np.asarray(contribs)
        if array.ndim == 2 and array.shape[1] == len(FEATURE_COLUMNS) + 1:
            return array[:, :-1]
        return array
    except Exception:
        return None


def _importance_fallback(model: Any, transformed: np.ndarray, names: list[str]) -> np.ndarray:
    importances = getattr(model, "feature_importances_", np.ones(len(names)))
    centered = transformed - np.mean(transformed, axis=0, keepdims=True)
    return centered * np.asarray(importances).reshape(1, -1)
