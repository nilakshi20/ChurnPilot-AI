import logging

from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine
from app.schemas.health import HealthData

logger = logging.getLogger(__name__)


def get_health() -> HealthData:
    database_status = "disconnected"
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception as exc:
        logger.warning("Health check could not reach the database: %s", exc)

    return HealthData(
        status="healthy" if database_status == "connected" else "degraded",
        database=database_status,
        version=settings.APP_VERSION,
    )
