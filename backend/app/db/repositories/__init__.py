from app.db.repositories.base import BaseRepository
from app.db.repositories.customer import CustomerRepository
from app.db.repositories.prediction import PredictionRepository
from app.db.repositories.retention import MessageRepository, RetentionRepository

__all__ = [
    "BaseRepository",
    "CustomerRepository",
    "PredictionRepository",
    "RetentionRepository",
    "MessageRepository",
]
