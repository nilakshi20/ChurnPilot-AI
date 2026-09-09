from fastapi import APIRouter

from app.core.responses import ApiResponse, ok
from app.schemas.health import HealthData
from app.services.health import get_health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=ApiResponse[HealthData])
def health() -> ApiResponse[HealthData]:
    payload = get_health()
    return ok(payload)
