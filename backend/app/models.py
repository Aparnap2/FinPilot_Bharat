"""Canonical Pydantic v2 schemas. Decimal for money, UTC datetimes only."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Literal
from pydantic import BaseModel, Field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CanonicalTransaction(BaseModel):
    id: str
    tenant_id: str = "demo"
    source: str  # bank | gateway | inbox | ledger | manual
    source_ref: str
    amount: Decimal = Field(decimal_places=2)
    currency: str = "INR"
    direction: Literal["credit", "debit"]
    merchant: str = ""
    descriptor: str = ""
    txn_date: datetime
    vpa_handle: str = ""
    upi_ref: str = ""
    customer_id: str | None = None
    dedupe_key: str = ""
    raw: dict[str, Any] = Field(default_factory=dict)


class Evidence(BaseModel):
    id: str
    txn_id: str
    kind: Literal["receipt", "invoice", "ledger_note", "gateway_settlement"]
    merchant: str = ""
    amount: Decimal = Field(decimal_places=2)
    txn_date: datetime
    match_score: float = Field(ge=0.0, le=1.0)
    summary_redacted: str = ""  # NEVER raw body


class ClassificationProposal(BaseModel):
    txn_id: str
    proposed_merchant: str = ""
    proposed_category: str = "uncategorized"
    confidence: float = Field(ge=0.0, le=1.0)
    rationale: str = ""
    evidence_ids: list[str] = Field(default_factory=list)
    requires_review: bool = True
    recommended_action: Literal["auto_post", "quick_confirm", "manual_review"] = "manual_review"


class GuardrailVerdict(BaseModel):
    txn_id: str
    allowed: bool = False
    safe_to_post: bool = False
    human_review: bool = True
    violations: list[str] = Field(default_factory=list)
    checks: dict[str, bool] = Field(default_factory=dict)


class LedgerEntry(BaseModel):
    id: str
    tenant_id: str = "demo"
    txn_id: str
    category: str
    merchant: str = ""
    amount: Decimal = Field(decimal_places=2)
    direction: Literal["credit", "debit"] = "credit"
    posted_at: datetime = Field(default_factory=_utc_now)
    provenance: dict[str, Any] = Field(default_factory=dict)


class Customer(BaseModel):
    id: str
    tenant_id: str = "demo"
    name: str
    phone: str = ""
    vpa: str = ""
    balance_owed: Decimal = Field(default=Decimal("0.00"), decimal_places=2)


class CreditLedgerEntry(BaseModel):
    id: str
    tenant_id: str = "demo"
    customer_id: str
    txn_id: str = ""
    amount: Decimal = Field(decimal_places=2)
    kind: Literal["sale_on_credit", "payment", "reminder"] = "payment"
    balance_after: Decimal = Field(decimal_places=2)
    created_at: datetime = Field(default_factory=_utc_now)


class WhatsAppMessage(BaseModel):
    id: str
    tenant_id: str = "demo"
    to: str = ""
    body: str = ""
    quick_replies: list[str] = Field(default_factory=list)
    txn_id: str = ""
    status: Literal["pending", "responded", "timeout", "sent"] = "pending"
    reply: str = ""
    created_at: datetime = Field(default_factory=_utc_now)


class AuditEvent(BaseModel):
    id: str = ""
    tenant_id: str = "demo"
    entity_type: str = ""
    entity_id: str = ""
    actor: str = "system"
    action: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=_utc_now)


class SyncRunResult(BaseModel):
    tenant_id: str = "demo"
    ingested: int = 0
    sources: dict[str, int] = Field(default_factory=dict)
    auto_posted: int = 0
    nudges: int = 0
    manual_review: int = 0
    node_transitions: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
