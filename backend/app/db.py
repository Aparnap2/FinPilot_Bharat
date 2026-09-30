"""SQLAlchemy SQLite store. File: backend/data/finpilot.db (overridable)."""
from __future__ import annotations

import os
from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Numeric,
    String,
    Text,
    create_engine,
    func,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

Base = declarative_base()


class TransactionRow(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, default="demo")
    source = Column(String, default="")
    source_ref = Column(String, default="")
    amount = Column(Numeric(14, 2), default=0)
    currency = Column(String, default="INR")
    direction = Column(String, default="credit")
    merchant = Column(String, default="")
    descriptor = Column(String, default="")
    txn_date = Column(DateTime(timezone=True))
    vpa_handle = Column(String, default="")
    upi_ref = Column(String, default="")
    customer_id = Column(String, nullable=True)
    dedupe_key = Column(String, default="")
    raw_json = Column(JSON, default=dict)
    status = Column(String, default="ingested")  # ingested|posted|pending_review|nudged
    category = Column(String, default="")
    confidence = Column(Numeric(4, 3), default=0)


class LedgerRow(Base):
    __tablename__ = "ledger_entries"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, default="demo")
    txn_id = Column(String, default="")
    category = Column(String, default="")
    merchant = Column(String, default="")
    amount = Column(Numeric(14, 2), default=0)
    direction = Column(String, default="credit")
    posted_at = Column(DateTime(timezone=True), server_default=func.now())
    provenance_json = Column(JSON, default=dict)


class CustomerRow(Base):
    __tablename__ = "customers"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, default="demo")
    name = Column(String, default="")
    phone = Column(String, default="")
    vpa = Column(String, default="")
    balance_owed = Column(Numeric(14, 2), default=0)


class CreditLedgerRow(Base):
    __tablename__ = "credit_ledger"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, default="demo")
    customer_id = Column(String, default="")
    txn_id = Column(String, default="")
    amount = Column(Numeric(14, 2), default=0)
    kind = Column(String, default="payment")
    balance_after = Column(Numeric(14, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WhatsAppRow(Base):
    __tablename__ = "whatsapp_outbox"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, default="demo")
    to = Column(String, default="")
    body = Column(Text, default="")
    quick_replies_json = Column(JSON, default=list)
    txn_id = Column(String, default="")
    status = Column(String, default="pending")
    reply = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditRow(Base):
    __tablename__ = "audit_events"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, default="demo")
    entity_type = Column(String, default="")
    entity_id = Column(String, default="")
    actor = Column(String, default="system")
    action = Column(String, default="")
    meta_json = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class IdempotencyRow(Base):
    __tablename__ = "idempotency_keys"
    key = Column(String, primary_key=True)
    tenant_id = Column(String, default="demo")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EvidenceRow(Base):
    __tablename__ = "evidence"
    id = Column(String, primary_key=True)
    tenant_id = Column(String, default="demo")
    txn_id = Column(String, default="")
    kind = Column(String, default="receipt")
    merchant = Column(String, default="")
    amount = Column(Numeric(14, 2), default=0)
    txn_date = Column(DateTime(timezone=True))
    match_score = Column(Numeric(4, 3), default=0)
    summary_redacted = Column(Text, default="")


def resolve_db_path(explicit: str | None = None) -> str:
    return explicit or os.getenv("DATABASE_URL", "sqlite:///./backend/data/finpilot.db")


def get_engine(db_url: str | None = None):
    url = resolve_db_path(db_url)
    # support plain file path too
    if url.startswith("sqlite") is False and (url.endswith(".db") or "/" in url):
        url = f"sqlite:///{url}"
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, future=True)


def init_db(engine=None):
    eng = engine or get_engine()
    # ensure directory exists for file sqlite
    try:
        url = str(eng.url)
        if url.startswith("sqlite:///"):
            path = url.replace("sqlite:///", "")
            if path not in (":memory:", ""):
                d = os.path.dirname(path)
                if d:
                    os.makedirs(d, exist_ok=True)
    except Exception:
        pass
    Base.metadata.create_all(eng)
    return eng


def session_factory(engine=None) -> sessionmaker:
    eng = engine or get_engine()
    return sessionmaker(bind=eng, autoflush=False, autocommit=False, future=True)
