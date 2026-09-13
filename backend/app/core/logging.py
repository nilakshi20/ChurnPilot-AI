import logging
import sys

from app.core.config import settings

LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def setup_logging() -> None:
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    # SQLAlchemy echoes every statement once this logger accepts INFO, so it stays off
    # unless explicitly requested.
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.SQL_ECHO else logging.WARNING
    )
    # httpx logs full request URLs at INFO; keep third-party request lines out of the log.
    logging.getLogger("httpx").setLevel(logging.WARNING)
