from app.services.csv_validation import validate_customer_csv


def test_csv_missing_columns() -> None:
    result, rows = validate_customer_csv(b"name\nAda")
    assert rows == []
    assert result.issues[0].code == "MISSING_COLUMNS"


def test_csv_type_date_duplicate_and_missing() -> None:
    content = (
        "email,signup_date,monthly_spend\n"
        "ada@example.com,2024-01-01,99\n"
        "ada@example.com,2024-02-01,80\n"
        "bad-email,not-a-date,-5\n"
        ",2024-01-01,\n"
    ).encode()
    result, rows = validate_customer_csv(content)
    assert len(rows) == 1
    assert rows[0]["email"] == "ada@example.com"
    codes = {issue.code for issue in result.issues}
    assert "DUPLICATE" in codes
    assert "INVALID_EMAIL" in codes
    assert "INVALID_DATE" in codes
    assert "INVALID_NUMBER" in codes
    assert "MISSING_VALUE" in codes
    assert result.stats["row_count"] == 4
    assert result.stats["valid_count"] == 1
