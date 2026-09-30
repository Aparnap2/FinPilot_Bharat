"""Central configuration — plain pydantic (pydantic-settings style)."""
from pydantic import BaseModel
import os


class Settings(BaseModel):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./backend/data/finpilot.db")
    TENANT_ID: str = os.getenv("TENANT_ID", "demo")
    AUTO_POST_CONFIDENCE: float = float(os.getenv("AUTO_POST_CONFIDENCE", "0.90"))
    MAX_AUTO_POST_AMOUNT: float = float(os.getenv("MAX_AUTO_POST_AMOUNT", "10000"))
    HIGH_VALUE_THRESHOLD: float = float(os.getenv("HIGH_VALUE_THRESHOLD", "100000"))
    QUICK_CONFIRM_THRESHOLD: float = float(os.getenv("QUICK_CONFIRM_THRESHOLD", "0.60"))


settings = Settings()
