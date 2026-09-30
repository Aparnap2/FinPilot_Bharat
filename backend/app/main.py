"""FastAPI app: CORS open, all routers included."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .db import get_engine, init_db

app = FastAPI(title="FinPilot Bharat v1 MVP (mocked)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)

# init file DB on startup (safe for tests too — they override dependency)
try:
    init_db(get_engine())
except Exception:
    pass
