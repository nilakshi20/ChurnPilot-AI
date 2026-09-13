from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import numpy as np

from app.db.session import SessionLocal
from app.ml.dataset import feature_frame, load_customer_feature_rows
from app.ml.features import FEATURE_COLUMNS
from app.ml.trainer import save_trained_model, train_from_arrays
from app.services.demo_generator import generate_demo_dataset
from app.services.demo_service import persist_demo_dataset


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the ChurnPilot churn model")
    parser.add_argument("--from-demo", action="store_true", help="Generate and persist demo data first")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.from_demo:
            persist_demo_dataset(db, generate_demo_dataset())
        rows = load_customer_feature_rows(db)
        if len(rows) < 20:
            raise SystemExit("Need at least 20 customers in the database to train. Run with --from-demo.")
        frame = feature_frame(rows)
        X = frame[FEATURE_COLUMNS].to_numpy(dtype=float)
        y = np.array([int(row.is_churned) for row in rows], dtype=int)
        bundle = train_from_arrays(X, y)
        path = save_trained_model(bundle)
        print(f"Saved model to {path}")
        print(json.dumps({
            "model_name": bundle.model_name,
            "model_version": bundle.model_version,
            "accuracy": bundle.metrics.get("accuracy"),
            "precision": bundle.metrics.get("precision"),
            "recall": bundle.metrics.get("recall"),
            "f1": bundle.metrics.get("f1"),
            "roc_auc": bundle.metrics.get("roc_auc"),
        }, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
