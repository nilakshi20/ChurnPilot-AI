"""Shared, short-lived snapshot of every scored customer.

Scoring the whole base means aggregating transactions, activity and support events for
each customer, which is far too expensive to repeat for every analytics endpoint on
every page load. The dashboard, segments, analytics, insights and customer list views
all describe the same population, so they share one snapshot.

Two properties matter here:

* the snapshot is rebuilt at most once per TTL window, and
* only one rebuild runs at a time. A dashboard page issues several analytics requests at
  once, and FastAPI serves sync endpoints from a thread pool, so without the build lock
  each of those requests would start its own full rebuild and they would compete for the
  database and the GIL.

Any write path that changes customers or predictions calls invalidate().
"""

from __future__ import annotations

import threading
import time

from sqlalchemy.orm import Session

from app.ml.dataset import load_customer_feature_rows
from app.services.scoring import ScoredCustomer

TTL_SECONDS = 120.0

_state_lock = threading.Lock()
_build_lock = threading.Lock()
_cached: tuple[float, list[ScoredCustomer]] | None = None


def _fresh() -> list[ScoredCustomer] | None:
    with _state_lock:
        if _cached is None:
            return None
        built_at, scored = _cached
        return scored if (time.monotonic() - built_at) < TTL_SECONDS else None


def scored_customers(db: Session, *, refresh: bool = False) -> list[ScoredCustomer]:
    global _cached

    if not refresh:
        cached = _fresh()
        if cached is not None:
            return cached

    with _build_lock:
        if not refresh:
            # Another request may have finished the rebuild while we waited.
            cached = _fresh()
            if cached is not None:
                return cached

        from app.services.customer_service import attach_stored_predictions

        scored = attach_stored_predictions(db, load_customer_feature_rows(db))
        with _state_lock:
            _cached = (time.monotonic(), scored)
        return scored


def invalidate() -> None:
    """Drop the snapshot after customers, predictions or imports change."""
    global _cached
    with _state_lock:
        _cached = None
