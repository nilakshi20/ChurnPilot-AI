from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppError, CustomerNotFoundError
from app.db.models import GeneratedMessage, RetentionRecommendation
from app.db.repositories.customer import CustomerRepository
from app.db.repositories.prediction import PredictionRepository
from app.db.repositories.retention import RetentionRepository
from app.ml.dataset import load_customer_feature_rows
from app.schemas.platform import (
    GeneratedMessageData,
    GenerateMessageRequest,
    RetentionListData,
    RetentionRecord,
)
from app.services.gemini_service import gemini_service
from app.services.scoring import score_rows


def list_retention(db: Session, customer_id: UUID) -> RetentionListData:
    _require_customer(db, customer_id)
    rows = RetentionRepository(db).list_for_customer(customer_id)
    return RetentionListData(items=[_retention_record(row) for row in rows])


def generate_retention(db: Session, customer_id: UUID) -> RetentionRecord:
    customer = _require_customer(db, customer_id)
    rows = load_customer_feature_rows(db, [customer_id])
    if not rows:
        raise CustomerNotFoundError()
    latest = PredictionRepository(db).latest_for_customer(customer_id)
    prediction_map = {}
    if latest:
        from app.ml.predictor import PredictionResult

        prediction_map[customer_id] = PredictionResult(
            customer_id=customer_id,
            churn_probability=latest.risk_score,
            risk_level=latest.risk_level,
            model_name=latest.model_name,
            model_version=latest.model_version,
            features=(latest.explanation or {}).get("features") or rows[0].to_feature_dict(),
            explanation=latest.explanation or {},
        )
    scored = score_rows(rows, prediction_map)[0]
    facts = _customer_facts(scored, latest.explanation if latest else None)
    try:
        parsed, source = gemini_service.generate_retention(facts)
    except AppError as exc:
        if exc.error_code in {"GEMINI_UNAVAILABLE", "GEMINI_INVALID_JSON", "GEMINI_INVALID_SCHEMA", "GEMINI_RETENTION_FAILED"}:
            parsed, source = _rule_based_retention(facts), "rules_fallback"
        else:
            raise

    record = RetentionRecommendation(
        customer_id=customer.id,
        prediction_id=latest.id if latest else None,
        action_type=parsed.recommended_action,
        title=parsed.strategy[:255],
        description=parsed.reasoning,
        priority=parsed.priority,
        status="pending",
        payload=parsed.model_dump() | {"source": source},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _retention_record(record)


def generate_message(db: Session, customer_id: UUID, request: GenerateMessageRequest) -> GeneratedMessageData:
    _require_customer(db, customer_id)
    rows = load_customer_feature_rows(db, [customer_id])
    if not rows:
        raise CustomerNotFoundError()
    latest = PredictionRepository(db).latest_for_customer(customer_id)
    facts = {
        "known_name": rows[0].display_name(),
        "company": rows[0].company,
        "plan": rows[0].plan,
        "status": rows[0].status,
        "monthly_spend": rows[0].monthly_spend,
        "tenure_months": rows[0].tenure_months,
        "support_tickets": rows[0].support_tickets,
        "complaint_count": rows[0].complaint_count,
        "days_since_last_order": rows[0].days_since_last_order,
        "churn_probability": latest.risk_score if latest else None,
        "risk_level": latest.risk_level if latest else None,
        "channel": request.channel,
        "tone": request.tone,
        "instruction": "Never invent missing names or facts. Never say the message was sent.",
    }
    try:
        generated = gemini_service.generate_message(facts)
        generated_by = "gemini"
    except AppError:
        generated = _rule_based_message(facts, request)
        generated_by = "rules_fallback"

    message = GeneratedMessage(
        customer_id=customer_id,
        channel=request.channel,
        tone=request.tone,
        subject=generated.get("subject"),
        body=generated["body"],
        status="draft",
        generated_by=generated_by,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return GeneratedMessageData(
        id=message.id,
        customer_id=message.customer_id,
        channel=message.channel,
        tone=message.tone,
        subject=message.subject,
        body=message.body,
        status=message.status,
        generated_by=message.generated_by,
        send_status="not_sent",
        created_at=message.created_at,
    )


def _require_customer(db: Session, customer_id: UUID):
    customer = CustomerRepository(db).get_or_none(customer_id)
    if customer is None:
        raise CustomerNotFoundError()
    return customer


def _retention_record(row: RetentionRecommendation) -> RetentionRecord:
    payload = row.payload or {}
    return RetentionRecord(
        id=row.id,
        customer_id=row.customer_id,
        prediction_id=row.prediction_id,
        action_type=row.action_type,
        title=row.title,
        description=row.description,
        priority=row.priority,
        status=row.status,
        source=str(payload.get("source") or "stored"),
        strategy=payload.get("strategy") or row.title,
        reasoning=payload.get("reasoning") or row.description,
        recommended_action=payload.get("recommended_action") or row.action_type,
        channel=payload.get("channel"),
        incentive=payload.get("incentive"),
        created_at=row.created_at,
    )


def _customer_facts(scored, explanation) -> dict:
    row = scored.features
    factors = []
    if explanation and isinstance(explanation, dict):
        factors = explanation.get("factors") or []
    return {
        "profile": {
            "name": row.display_name(),
            "email": row.email,
            "company": row.company,
            "plan": row.plan,
            "status": row.status,
            "country": row.country,
            "segment": scored.segment,
        },
        "value": {
            "monthly_spend": row.monthly_spend,
            "average_order_value": row.average_order_value,
            "total_orders": row.total_orders,
        },
        "churn_probability": scored.churn_probability,
        "risk_level": scored.risk_level,
        "risk_factors": factors,
        "recent_activity": {
            "login_frequency": row.login_frequency,
            "email_engagement": row.email_engagement,
            "days_since_last_order": row.days_since_last_order,
            "last_seen_at": row.last_seen_at.isoformat() if row.last_seen_at else None,
        },
        "purchase_behavior": {
            "purchase_frequency": row.purchase_frequency,
            "discount_usage": row.discount_usage,
            "payment_failures": row.payment_failures,
        },
        "support_history": {
            "support_tickets": row.support_tickets,
            "complaint_count": row.complaint_count,
        },
        "segment": scored.segment,
        "priority_score": scored.priority_score,
    }


def _rule_based_retention(facts: dict) -> "GeminiRetentionOutput":
    from app.schemas.platform import GeminiRetentionOutput

    probability = float(facts.get("churn_probability") or 0)
    value = float((facts.get("value") or {}).get("monthly_spend") or 0)
    complaints = int((facts.get("support_history") or {}).get("complaint_count") or 0)
    inactivity = float((facts.get("recent_activity") or {}).get("days_since_last_order") or 0)
    if complaints >= 2:
        action, strategy = "outreach", "Resolve outstanding support friction before offering an incentive"
        channel = "sales_call"
    elif inactivity >= 45:
        action, strategy = "winback", "Re-engage a dormant account with a usage-based check-in"
        channel = "email"
    elif value >= 500 and probability >= 0.5:
        action, strategy = "discount", "Protect high-value predicted risk with a scoped retention offer"
        channel = "email"
    elif probability >= 0.5:
        action, strategy = "product_education", "Increase product adoption on the features this account already uses"
        channel = "email"
    else:
        action, strategy = "outreach", "Keep the relationship warm with a low-pressure success check-in"
        channel = "email"
    priority = "urgent" if probability >= 0.75 else "high" if probability >= 0.5 else "medium" if probability >= 0.25 else "low"
    return GeminiRetentionOutput(
        strategy=strategy,
        priority=priority,
        reasoning=(
            "Fallback rules used the provided spend, predicted risk, inactivity, and support counts. "
            "This is not a causal claim about why the customer might leave."
        ),
        recommended_action=action,
        channel=channel,
        incentive="scoped expansion credit" if action == "discount" else None,
    )


def _rule_based_message(facts: dict, request: GenerateMessageRequest) -> dict[str, str]:
    name = facts.get("known_name")
    greeting = f"Hi {name}," if name else "Hello,"
    company = facts.get("company") or "your team"
    plan = facts.get("plan") or "your current plan"
    body = (
        f"{greeting}\n\n"
        f"I wanted to check in with {company} on {plan}. "
        "If there is anything getting in the way of value, we can help without assuming a reason. "
        "This draft has not been sent.\n\n"
        "Best regards\nChurnPilot AI"
    )
    if request.tone == "concise":
        body = f"{greeting} Checking in on {plan} for {company}. This draft has not been sent."
    if request.tone == "friendly":
        body = body.replace("I wanted to check in", "Just a quick, friendly check-in")
    if request.tone == "premium":
        body = body.replace("I wanted to check in", "I'm reaching out with a high-touch check-in")
    subject = None if request.channel in {"sms", "whatsapp"} else f"Checking in with {company}"
    return {"subject": subject, "body": body}
