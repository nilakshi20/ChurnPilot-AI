from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.core.responses import ApiResponse, ok
from app.schemas.platform import PredictionRunData
from app.services.prediction_service import run_predictions

router = APIRouter(tags=["predictions"])


@router.post("/predictions/run", response_model=ApiResponse[PredictionRunData])
def run_customer_predictions(db: Session = Depends(db_session)) -> ApiResponse[PredictionRunData]:
    return ok(run_predictions(db), message="Predictions scored from the current trained model.")
