from fastapi import APIRouter

from app.api.routes.analytics import router as analytics_router
from app.api.routes.customers import router as customers_router
from app.api.routes.demo import router as demo_router
from app.api.routes.health import router as health_router
from app.api.routes.insights import router as insights_router
from app.api.routes.predictions import router as predictions_router
from app.api.routes.retention import router as retention_router
from app.api.routes.settings import router as settings_router
from app.api.routes.upload import router as upload_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(customers_router)
api_router.include_router(retention_router)
api_router.include_router(predictions_router)
api_router.include_router(analytics_router)
api_router.include_router(insights_router)
api_router.include_router(upload_router)
api_router.include_router(demo_router)
api_router.include_router(settings_router)
