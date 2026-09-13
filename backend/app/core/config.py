from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "ChurnPilot AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    SQL_ECHO: bool = False

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/churnpilot_ai"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.6-flash"
    # Free-tier daily quotas are per model, so exhausting the primary should not disable
    # the AI features while another model still has headroom.
    GEMINI_FALLBACK_MODELS: str = "gemini-3.5-flash,gemini-3.1-flash-lite"
    GEMINI_TIMEOUT_SECONDS: float = 30.0
    GEMINI_MAX_ATTEMPTS: int = 3
    CORS_ORIGINS: str = "http://localhost:5173"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    MODEL_DIR: str = str(BACKEND_ROOT / "models")
    DEMO_SEED: int = 42
    DEMO_CUSTOMER_COUNT: int = 1200

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def gemini_model_chain(self) -> list[str]:
        candidates = [self.GEMINI_MODEL, *self.GEMINI_FALLBACK_MODELS.split(",")]
        chain: list[str] = []
        for name in candidates:
            cleaned = name.strip()
            if cleaned and cleaned not in chain:
                chain.append(cleaned)
        return chain

    @property
    def model_dir_path(self) -> Path:
        return Path(self.MODEL_DIR)


settings = Settings()
