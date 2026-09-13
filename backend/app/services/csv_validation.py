from __future__ import annotations

from io import StringIO
from typing import Any

import pandas as pd

from app.schemas.platform import CsvIssue, CsvValidationData

REQUIRED_COLUMNS = ["email", "signup_date", "monthly_spend"]
OPTIONAL_COLUMNS = ["first_name", "last_name", "company", "plan", "status", "country", "billing_interval"]
ALLOWED_STATUS = {"active", "trial", "inactive", "paused", "churned"}
ALLOWED_PLANS = {"starter", "growth", "professional", "enterprise"}
ALLOWED_INTERVALS = {"monthly", "annual", "weekly"}
PREVIEW_ROWS = 10


def validate_customer_csv(content: bytes, existing_emails: set[str] | None = None) -> tuple[CsvValidationData, list[dict[str, Any]]]:
    existing_emails = {email.lower() for email in (existing_emails or set())}
    issues: list[CsvIssue] = []
    valid_rows: list[dict[str, Any]] = []

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        stats = _empty_stats()
        stats["invalid_count"] = 1
        return (
            CsvValidationData(
                preview=[],
                stats=stats,
                issues=[CsvIssue(row_number=0, field=None, code="ENCODING", message="File must be UTF-8")],
                persisted=0,
            ),
            [],
        )

    try:
        frame = pd.read_csv(StringIO(text))
    except Exception:
        stats = _empty_stats()
        stats["invalid_count"] = 1
        return (
            CsvValidationData(
                preview=[],
                stats=stats,
                issues=[CsvIssue(row_number=0, field=None, code="MALFORMED_FILE", message="CSV could not be parsed")],
                persisted=0,
            ),
            [],
        )

    frame.columns = [str(column).strip() for column in frame.columns]
    missing = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
    if missing:
        issues.append(
            CsvIssue(
                row_number=0,
                field=",".join(missing),
                code="MISSING_COLUMNS",
                message=f"Missing required columns: {', '.join(missing)}",
            )
        )
        stats = _empty_stats()
        stats["row_count"] = int(len(frame))
        stats["invalid_count"] = int(len(frame))
        return CsvValidationData(preview=[], stats=stats, issues=issues, persisted=0), []

    seen_in_file: set[str] = set()
    missing_value_count = 0
    type_error_count = 0
    duplicate_count = 0
    invalid_count = 0

    for offset, raw in enumerate(frame.to_dict(orient="records"), start=2):
        row_issues: list[CsvIssue] = []
        parsed: dict[str, Any] = {}
        email = _clean(raw.get("email"))
        if not email:
            missing_value_count += 1
            row_issues.append(CsvIssue(row_number=offset, field="email", code="MISSING_VALUE", message="email is required"))
        elif "@" not in email or "." not in email.split("@")[-1]:
            type_error_count += 1
            row_issues.append(CsvIssue(row_number=offset, field="email", code="INVALID_EMAIL", message="email is invalid"))
        else:
            lowered = email.lower()
            if lowered in seen_in_file:
                duplicate_count += 1
                row_issues.append(CsvIssue(row_number=offset, field="email", code="DUPLICATE", message="Duplicate email in file"))
            elif lowered in existing_emails:
                duplicate_count += 1
                row_issues.append(CsvIssue(row_number=offset, field="email", code="DUPLICATE", message="Email already exists"))
            else:
                parsed["email"] = lowered
                seen_in_file.add(lowered)

        signup = _clean(raw.get("signup_date"))
        if not signup:
            missing_value_count += 1
            row_issues.append(CsvIssue(row_number=offset, field="signup_date", code="MISSING_VALUE", message="signup_date is required"))
        else:
            parsed_date = pd.to_datetime(signup, utc=True, errors="coerce")
            if pd.isna(parsed_date):
                type_error_count += 1
                row_issues.append(CsvIssue(row_number=offset, field="signup_date", code="INVALID_DATE", message="signup_date is not a valid date"))
            else:
                parsed["signup_date"] = parsed_date.to_pydatetime()

        spend_raw = _clean(raw.get("monthly_spend"))
        if spend_raw is None:
            missing_value_count += 1
            row_issues.append(CsvIssue(row_number=offset, field="monthly_spend", code="MISSING_VALUE", message="monthly_spend is required"))
        else:
            try:
                spend = float(spend_raw)
                if spend < 0:
                    raise ValueError("negative")
                parsed["monthly_spend"] = spend
            except (TypeError, ValueError):
                type_error_count += 1
                row_issues.append(
                    CsvIssue(row_number=offset, field="monthly_spend", code="INVALID_NUMBER", message="monthly_spend must be a non-negative number")
                )

        status = _clean(raw.get("status")) if "status" in raw else "active"
        if status:
            status = status.lower()
            if status not in ALLOWED_STATUS:
                type_error_count += 1
                row_issues.append(CsvIssue(row_number=offset, field="status", code="INVALID_VALUE", message="status is not allowed"))
            else:
                parsed["status"] = status
        plan = _clean(raw.get("plan"))
        if plan:
            plan = plan.lower()
            if plan not in ALLOWED_PLANS:
                type_error_count += 1
                row_issues.append(CsvIssue(row_number=offset, field="plan", code="INVALID_VALUE", message="plan is not allowed"))
            else:
                parsed["plan"] = plan
        interval = _clean(raw.get("billing_interval"))
        if interval:
            interval = interval.lower()
            if interval not in ALLOWED_INTERVALS:
                type_error_count += 1
                row_issues.append(CsvIssue(row_number=offset, field="billing_interval", code="INVALID_VALUE", message="billing_interval is not allowed"))
            else:
                parsed["billing_interval"] = interval

        for field_name in ("first_name", "last_name", "company", "country"):
            value = _clean(raw.get(field_name))
            if value:
                parsed[field_name] = value[:2] if field_name == "country" else value

        if row_issues:
            invalid_count += 1
            issues.extend(row_issues)
        else:
            valid_rows.append(parsed)

    stats = {
        "row_count": int(len(frame)),
        "valid_count": len(valid_rows),
        "invalid_count": invalid_count,
        "duplicate_count": duplicate_count,
        "missing_value_count": missing_value_count,
        "type_error_count": type_error_count,
        "malformed_row_count": invalid_count,
    }
    preview = [_preview_row(row) for row in valid_rows[:PREVIEW_ROWS]]
    return CsvValidationData(preview=preview, stats=stats, issues=issues[:200], persisted=0), valid_rows


def _preview_row(row: dict[str, Any]) -> dict[str, Any]:
    payload = dict(row)
    if payload.get("signup_date"):
        payload["signup_date"] = payload["signup_date"].isoformat()
    return payload


def _clean(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip()
    return text or None


def _empty_stats() -> dict[str, int]:
    return {
        "row_count": 0,
        "valid_count": 0,
        "invalid_count": 0,
        "duplicate_count": 0,
        "missing_value_count": 0,
        "type_error_count": 0,
        "malformed_row_count": 0,
    }
