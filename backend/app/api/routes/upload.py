from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import db_session
from app.core.exceptions import AppError
from app.core.responses import ApiResponse, ok
from app.schemas.platform import CsvValidationData
from app.services.demo_service import persist_validated_csv

router = APIRouter(tags=["upload"])


@router.post("/upload/csv", response_model=ApiResponse[CsvValidationData])
async def upload_csv(
    file: UploadFile = File(...),
    persist: bool = False,
    db: Session = Depends(db_session),
) -> ApiResponse[CsvValidationData]:
    if file.filename and not file.filename.lower().endswith(".csv"):
        raise AppError("Only CSV files are accepted", error_code="INVALID_FILE_TYPE")
    content = await file.read()
    if not content:
        raise AppError("Uploaded file is empty", error_code="EMPTY_FILE")
    result = persist_validated_csv(db, content, persist=persist)
    if not persist:
        return ok(result, message="Validation only. Nothing was written to the database.")
    return ok(result, message="Valid rows were persisted. Invalid rows were skipped.")
