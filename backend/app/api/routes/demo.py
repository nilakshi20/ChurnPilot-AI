from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.core.responses import ApiResponse, ok
from app.schemas.platform import DemoLoadData
from app.services.demo_service import load_demo

router = APIRouter(tags=["demo"])


@router.post("/demo/load", response_model=ApiResponse[DemoLoadData])
def load_demo_data(db: Session = Depends(db_session)) -> ApiResponse[DemoLoadData]:
    result = load_demo(db)
    return ok(result, message="Demo data loaded and predictions scored from a newly trained model.")
