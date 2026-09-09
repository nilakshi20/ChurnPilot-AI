from pydantic import BaseModel, Field


class HealthData(BaseModel):
    status: str = Field(examples=["healthy"])
    database: str = Field(examples=["connected"])
    version: str = Field(examples=["1.0.0"])
