from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.core.responses import ApiResponse, ok
from app.schemas.platform import ChurnAnalyticsData, DashboardSummary, RevenueRiskData, SegmentListData
from app.services import analytics_service

router = APIRouter(tags=["analytics"])


@router.get("/dashboard/summary", response_model=ApiResponse[DashboardSummary])
def dashboard_summary(db: Session = Depends(db_session)) -> ApiResponse[DashboardSummary]:
    return ok(analytics_service.dashboard_summary(db))


@router.get("/segments", response_model=ApiResponse[SegmentListData])
def segments(db: Session = Depends(db_session)) -> ApiResponse[SegmentListData]:
    return ok(analytics_service.segment_snapshot(db))


@router.get("/analytics/churn", response_model=ApiResponse[ChurnAnalyticsData])
def churn_analytics(db: Session = Depends(db_session)) -> ApiResponse[ChurnAnalyticsData]:
    return ok(analytics_service.churn_analytics(db))


@router.get("/analytics/revenue-risk", response_model=ApiResponse[RevenueRiskData])
def revenue_risk(db: Session = Depends(db_session)) -> ApiResponse[RevenueRiskData]:
    return ok(analytics_service.revenue_risk(db))
