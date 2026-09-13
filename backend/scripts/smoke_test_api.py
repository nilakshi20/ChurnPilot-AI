"""End-to-end smoke test against a running ChurnPilot AI backend.

Exercises every endpoint, including the Gemini-backed retention and message flows, and reports
per-call status and latency. Requires demo data to be loaded first (POST /api/demo/load).

Usage:
    python scripts/smoke_test_api.py [--base-url http://127.0.0.1:8000/api]
"""

from __future__ import annotations

import argparse
import json
import sys
import time

import httpx

CSV_SAMPLE = (
    "email,signup_date,monthly_spend,first_name,last_name,company,plan,status\n"
    "valid@example.com,2024-01-15,199.00,Ada,Lovelace,Analytical Engines,growth,active\n"
    "not-an-email,2024-02-01,abc,Bad,Row,Broken Co,growth,active\n"
)


class Runner:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(timeout=180.0)
        self.failures: list[str] = []

    def call(self, method: str, path: str, **kwargs) -> dict:
        started = time.perf_counter()
        try:
            response = self.client.request(method, f"{self.base_url}{path}", **kwargs)
        except httpx.HTTPError as exc:
            self.failures.append(f"{method} {path}: {exc}")
            print(f"FAIL  ---      -    {method:4} {path} :: {exc}")
            return {}
        elapsed = time.perf_counter() - started
        try:
            body = response.json()
        except ValueError:
            body = {"raw": response.text[:200]}
        ok = response.status_code == 200 and body.get("success") is True
        detail = "" if ok else f" :: {json.dumps(body)[:200]}"
        if not ok:
            self.failures.append(f"{method} {path}: HTTP {response.status_code}")
        print(f"{'PASS' if ok else 'FAIL'} {response.status_code} {elapsed:6.2f}s {method:4} {path}{detail}")
        return body


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000/api")
    args = parser.parse_args()

    runner = Runner(args.base_url)

    runner.call("GET", "/health")
    runner.call("GET", "/settings")
    runner.call("GET", "/dashboard/summary")
    runner.call("GET", "/segments")
    runner.call("GET", "/analytics/churn")
    runner.call("GET", "/analytics/revenue-risk")

    listing = runner.call(
        "GET",
        "/customers",
        params={"page": 1, "page_size": 5, "sort_by": "priority_score", "sort_dir": "desc"},
    )
    items = (listing.get("data") or {}).get("items") or []
    if not items:
        print("\nNo customers returned. Load demo data first: POST /api/demo/load")
        return 1

    customer_id = items[0]["id"]
    print(f"      using customer {customer_id} ({items[0].get('company')})")

    runner.call("GET", f"/customers/{customer_id}")
    runner.call("GET", f"/customers/{customer_id}/prediction")
    runner.call("GET", f"/customers/{customer_id}/risk-factors")
    runner.call("GET", f"/customers/{customer_id}/retention")

    retention = runner.call("POST", f"/customers/{customer_id}/generate-retention", json={})
    payload = retention.get("data") or {}
    print(f"      retention source={payload.get('source')} strategy={str(payload.get('strategy'))[:70]!r}")

    for channel in ("email", "whatsapp", "sms", "sales_call"):
        message = runner.call(
            "POST",
            f"/customers/{customer_id}/generate-message",
            json={"channel": channel, "tone": "professional"},
        )
        data = message.get("data") or {}
        print(
            f"      {channel:10} generated_by={data.get('generated_by')} "
            f"subject={str(data.get('subject'))[:40]!r} body_len={len(str(data.get('body') or ''))}"
        )

    insights = runner.call("GET", "/insights")
    insight_items = (insights.get("data") or {}).get("items") or []
    sources = sorted({str(item.get("source")) for item in insight_items})
    print(f"      insights: {len(insight_items)} items, sources={sources}")

    runner.call("GET", "/customers", params={"risk_level": "critical", "page_size": 3})
    runner.call("GET", "/customers", params={"segment": "high_value_high_risk", "page_size": 3})
    runner.call("GET", "/customers", params={"search": "a", "page_size": 3})
    runner.call("GET", "/customers", params={"high_value_only": "true", "page_size": 3})
    runner.call("POST", "/predictions/run", json={})
    runner.call(
        "POST",
        "/upload/csv",
        files={"file": ("customers.csv", CSV_SAMPLE.encode(), "text/csv")},
    )

    if runner.failures:
        print(f"\n{len(runner.failures)} failure(s):")
        for failure in runner.failures:
            print(f"  - {failure}")
        return 1
    print("\nAll endpoint checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
