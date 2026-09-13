from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.core.responses import ApiResponse, ok
from app.schemas.platform import InsightsData
from app.services.insights_service import list_insights

router = APIRouter(tags=["insights"])


@router.get("/insights", response_model=ApiResponse[InsightsData])
def insights(db: Session = Depends(db_session)) -> ApiResponse[InsightsData]:
    return ok(list_insights(db))
