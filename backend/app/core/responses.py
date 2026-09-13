from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    message: str | None = None
    error_code: str | None = None


class ErrorDetail(BaseModel):
    code: str
    details: Any | None = Field(default=None)


def ok(data: T | None = None, message: str | None = None) -> ApiResponse[T]:
    return ApiResponse(success=True, data=data, message=message, error_code=None)


def fail(
    message: str,
    *,
    error_code: str | None = None,
    data: T | None = None,
) -> ApiResponse[T]:
    return ApiResponse(success=False, data=data, message=message, error_code=error_code)
