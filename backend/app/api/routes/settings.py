from fastapi import APIRouter

from app.core.config import settings
from app.core.responses import ApiResponse, ok
from app.core.risk import HIGH_MAX, LOW_MAX, MEDIUM_MAX
from app.ml.model_loader import model_loader
from app.schemas.platform import PlatformSettingsData
from app.services.scoring import SEGMENT_LABELS, SEGMENT_ORDER

router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=ApiResponse[PlatformSettingsData])
def platform_settings() -> ApiResponse[PlatformSettingsData]:
    model = None
    if model_loader.is_ready():
        bundle = model_loader.load()
        model = {
            "name": bundle.model_name,
            "version": bundle.model_version,
            "trained_at": bundle.trained_at,
            "feature_names": bundle.feature_names,
            "metrics": {
                key: bundle.metrics.get(key)
                for key in ("accuracy", "precision", "recall", "f1", "roc_auc", "sample_count")
            },
        }
    data = PlatformSettingsData(
        risk_thresholds={"low_max": LOW_MAX, "medium_max": MEDIUM_MAX, "high_max": HIGH_MAX},
        priority_weights={
            "churn_probability": 0.45,
            "customer_value": 0.25,
            "revenue_contribution": 0.15,
            "retention_opportunity": 0.15,
        },
        message_channels=["email", "whatsapp", "sms", "sales_call"],
        message_tones=["professional", "friendly", "concise", "premium"],
        retention_actions=[
            "discount",
            "outreach",
            "product_education",
            "winback",
            "pause_plan",
            "upgrade",
        ],
        segments=[{"key": key, "label": SEGMENT_LABELS[key]} for key in SEGMENT_ORDER],
        model=model,
        demo_seed=settings.DEMO_SEED,
        demo_customer_count=settings.DEMO_CUSTOMER_COUNT,
    )
    return ok(data)
