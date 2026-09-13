import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.responses import fail

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "APP_ERROR",
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", error_code: str = "NOT_FOUND") -> None:
        super().__init__(message, status.HTTP_404_NOT_FOUND, error_code)


class CustomerNotFoundError(NotFoundError):
    def __init__(self) -> None:
        super().__init__("Customer not found", "CUSTOMER_NOT_FOUND")


def _json(
    status_code: int,
    message: str,
    *,
    data: Any | None = None,
    error_code: str | None = None,
) -> JSONResponse:
    payload = fail(message=message, data=data, error_code=error_code).model_dump()
    return JSONResponse(status_code=status_code, content=payload)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return _json(exc.status_code, exc.message, error_code=exc.error_code)

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
        return _json(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Request validation failed",
            data=exc.errors(),
            error_code="VALIDATION_ERROR",
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return _json(exc.status_code, detail, error_code="HTTP_ERROR")

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_handler(_request: Request, exc: SQLAlchemyError) -> JSONResponse:
        logger.exception("Database error: %s", exc)
        return _json(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Database error",
            error_code="DATABASE_ERROR",
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error: %s", exc)
        return _json(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Internal server error",
            error_code="INTERNAL_ERROR",
        )
