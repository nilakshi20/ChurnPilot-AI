from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.session import SessionLocal
from app.services.demo_generator import generate_demo_dataset
from app.services.demo_service import persist_demo_dataset, _replace_operational_data


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate realistic ChurnPilot demo customers")
    parser.add_argument("--count", type=int, default=None)
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--replace", action="store_true", help="Replace existing operational rows")
    args = parser.parse_args()

    dataset = generate_demo_dataset(count=args.count, seed=args.seed)
    db = SessionLocal()
    try:
        if args.replace:
            _replace_operational_data(db)
        persist_demo_dataset(db, dataset)
        print(
            "Loaded "
            f"{len(dataset.customers)} customers, "
            f"{len(dataset.transactions)} transactions, "
            f"{len(dataset.activities)} activities, "
            f"{len(dataset.support_events)} support events."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
