"""Pytest fixtures: FastAPI TestClient + fresh temp SQLite per session.

The backend resolves its engine from DATABASE_URL, but API routes cache a
global engine — so we override the `get_session` dependency to serve sessions
from an isolated temp SQLite file. Tables are wiped + reseeded before every
test so tests stay order-independent with zero network calls.
"""
from __future__ import annotations

import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.api.routes import get_session
from backend.app.db import (
    AuditRow,
    Base,
    CreditLedgerRow,
    CustomerRow,
    EvidenceRow,
    IdempotencyRow,
    LedgerRow,
    TransactionRow,
    WhatsAppRow,
)
from backend.app.main import app
from backend.app.seed import seed_demo_data
from backend.app import udhaari as _udhaari_mod

_ALL_ROWS = (
    AuditRow,
    CreditLedgerRow,
    EvidenceRow,
    IdempotencyRow,
    LedgerRow,
    TransactionRow,
    WhatsAppRow,
    CustomerRow,
)


@pytest.fixture(scope="session")
def _test_db_url(tmp_path_factory):
    path = tmp_path_factory.mktemp("finpilot") / "test_finpilot.db"
    url = f"sqlite:///{path}"
    engine = create_engine(url, connect_args={"check_same_thread": False}, future=True)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    db = factory()
    try:
        seed_demo_data(db)
    finally:
        db.close()
    os.environ["FINPILOT_TEST_DB_URL"] = url
    return url


@pytest.fixture()
def db_session(_test_db_url):
    """Fresh seeded session per test (wipes all tables first)."""
    engine = create_engine(
        _test_db_url, connect_args={"check_same_thread": False}, future=True
    )
    factory = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    db = factory()
    try:
        for row in _ALL_ROWS:
            db.query(row).delete()
        db.commit()
        _udhaari_mod._REMINDER_TS.clear()
        seed_demo_data(db)
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture()
def client(db_session):
    """TestClient with get_session overridden to the isolated test DB."""

    def _override():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_session] = _override
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_session, None)
