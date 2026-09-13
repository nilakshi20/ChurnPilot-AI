from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.core.responses import ApiResponse, ok
from app.schemas.platform import CustomerDetail, CustomerListData, PredictionData, RiskFactorsData
from app.services import customer_service

router = APIRouter(tags=["customers"])


@router.get("/customers", response_model=ApiResponse[CustomerListData])
def list_customers(
    search: str | None = None,
    status: str | None = None,
    plan: str | None = None,
    risk_level: str | None = None,
    segment: str | None = None,
    high_value_only: bool = False,
    sort_by: str = "priority_score",
    sort_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(db_session),
) -> ApiResponse[CustomerListData]:
    data = customer_service.list_customers(
        db,
        search=search,
        status=status,
        plan=plan,
        risk_level=risk_level,
        segment=segment,
        high_value_only=high_value_only,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )
    return ok(data)


@router.get("/customers/{customer_id}", response_model=ApiResponse[CustomerDetail])
def get_customer(customer_id: UUID, db: Session = Depends(db_session)) -> ApiResponse[CustomerDetail]:
    return ok(customer_service.get_customer(db, customer_id))


@router.get("/customers/{customer_id}/prediction", response_model=ApiResponse[PredictionData])
def get_customer_prediction(
    customer_id: UUID,
    db: Session = Depends(db_session),
) -> ApiResponse[PredictionData]:
    return ok(customer_service.get_prediction(db, customer_id))


@router.get("/customers/{customer_id}/risk-factors", response_model=ApiResponse[RiskFactorsData])
def get_customer_risk_factors(
    customer_id: UUID,
    db: Session = Depends(db_session),
) -> ApiResponse[RiskFactorsData]:
    return ok(customer_service.get_risk_factors(db, customer_id))
