from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.core.responses import ApiResponse, ok
from app.schemas.platform import GenerateMessageRequest, GeneratedMessageData, RetentionListData, RetentionRecord
from app.services import retention_service

router = APIRouter(tags=["retention"])


@router.get("/customers/{customer_id}/retention", response_model=ApiResponse[RetentionListData])
def get_retention(customer_id: UUID, db: Session = Depends(db_session)) -> ApiResponse[RetentionListData]:
    return ok(retention_service.list_retention(db, customer_id))


@router.post("/customers/{customer_id}/generate-retention", response_model=ApiResponse[RetentionRecord])
def generate_retention(customer_id: UUID, db: Session = Depends(db_session)) -> ApiResponse[RetentionRecord]:
    record = retention_service.generate_retention(db, customer_id)
    return ok(record, message="Retention recommendation stored as a draft action. Nothing was sent.")


@router.post("/customers/{customer_id}/generate-message", response_model=ApiResponse[GeneratedMessageData])
def generate_message(
    customer_id: UUID,
    request: GenerateMessageRequest,
    db: Session = Depends(db_session),
) -> ApiResponse[GeneratedMessageData]:
    message = retention_service.generate_message(db, customer_id, request)
    return ok(message, message="Draft generated. Communications are never sent automatically.")
