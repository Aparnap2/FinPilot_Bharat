"""All API routes for FinPilot Bharat v1 MVP."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import Depends, HTTPException, Query
from fastapi.routing import APIRouter
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import log_event
from ..classifier import classify
from ..config import settings
from ..connectors.mocked import MockInboxConnector, MockLedgerConnector
from ..db import (
    CreditLedgerRow,
    CustomerRow,
    EvidenceRow,
    LedgerRow,
    TransactionRow,
    WhatsAppRow,
    AuditRow,
    get_engine,
    init_db,
    session_factory,
)
from ..digest import daily_digest
from ..evidence import retrieve_evidence
from ..guardrails import run_guardrails
from ..ledger import post_ledger_update
from ..models import CanonicalTransaction
from ..normalize import normalize_transaction
from ..pipeline import run_sync
from ..seed import seed_demo_data
from ..udhaari import (
    apply_partial_payment,
    can_send_reminder,
    record_credit_sale,
    reminder_template,
)
from .. import udhaari as _udhaari_mod
from ..whatsapp import handle_response, send_nudge

router = APIRouter()

_ENGINE = None


def _engine():
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = get_engine()
        init_db(_ENGINE)
    return _ENGINE


def get_session() -> Any:
    factory = session_factory(_engine())
    db = factory()
    try:
        yield db
    finally:
        db.close()


def _ensure_seed(db: Session) -> None:
    if db.get(CustomerRow, "cust-rahul") is None:
        seed_demo_data(db)


# ---------- health / sync ----------

@router.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "finpilot-bharat-mvp", "mocked": True}


@router.post("/api/sync")
def api_sync(db: Session = Depends(get_session)) -> dict:
    _ensure_seed(db)
    result = run_sync(db)
    return result.model_dump()


# ---------- transactions ----------

@router.get("/api/transactions")
def list_txns(db: Session = Depends(get_session)) -> dict:
    rows = db.execute(select(TransactionRow)).scalars().all()
    return {"count": len(rows), "transactions": [
        {"id": r.id, "source": r.source, "amount": str(r.amount), "direction": r.direction,
         "merchant": r.merchant, "descriptor": r.descriptor, "status": r.status,
         "category": r.category or "", "txn_date": r.txn_date.isoformat() if r.txn_date else ""}
        for r in rows
    ]}


@router.get("/api/transactions/{txn_id}")
def txn_detail(txn_id: str, db: Session = Depends(get_session)) -> dict:
    r = db.get(TransactionRow, txn_id)
    if r is None:
        raise HTTPException(404, "transaction not found")
    evs = db.execute(select(EvidenceRow).where(EvidenceRow.txn_id == txn_id)).scalars().all()
    led = db.execute(select(LedgerRow).where(LedgerRow.txn_id == txn_id)).scalars().all()
    return {
        "id": r.id, "source": r.source, "amount": str(r.amount), "direction": r.direction,
        "merchant": r.merchant, "descriptor": r.descriptor, "status": r.status,
        "category": r.category or "",
        "evidence": [{"id": e.id, "match_score": float(str(e.match_score)), "summary": e.summary_redacted} for e in evs],
        "ledger": [{"id": l.id, "category": l.category} for l in led],
    }


class ApproveIn(BaseModel):
    approved: bool = True
    category_override: str | None = None


@router.post("/api/transactions/{txn_id}/approve")
def approve_txn(txn_id: str, body: ApproveIn, db: Session = Depends(get_session)) -> dict:
    r = db.get(TransactionRow, txn_id)
    if r is None:
        raise HTTPException(404, "transaction not found")
    if not body.approved:
        r.status = "rejected"
        log_event(db, r.tenant_id, "transaction", txn_id, "user", "rejected", {})
        db.commit()
        return {"id": txn_id, "status": "rejected"}
    # rebuild canonical + proposal for guardrail bypass via override
    txn = CanonicalTransaction(
        id=r.id, tenant_id=r.tenant_id, source=r.source, source_ref=r.source_ref,
        amount=Decimal(str(r.amount)), currency=r.currency, direction=r.direction,  # type: ignore[arg-type]
        merchant=r.merchant or "", descriptor=r.descriptor or "", txn_date=r.txn_date,
        vpa_handle=r.vpa_handle or "", upi_ref=r.upi_ref or "",
    )
    from ..models import ClassificationProposal, GuardrailVerdict

    cat = body.category_override or "sales"
    proposal = ClassificationProposal(txn_id=txn_id, proposed_merchant=r.merchant or "",
                                      proposed_category=cat, confidence=1.0, rationale="user approved",
                                      evidence_ids=[], requires_review=False, recommended_action="auto_post")
    verdict = GuardrailVerdict(txn_id=txn_id, allowed=True, safe_to_post=True, human_review=False,
                               violations=[], checks={"user_approval": True})
    entry_id = post_ledger_update(db, txn, proposal, verdict, category_override=cat)
    log_event(db, r.tenant_id, "transaction", txn_id, "user", "approved", {"category": cat})
    db.commit()
    return {"id": txn_id, "status": "posted", "ledger_entry": entry_id}


# ---------- quick sale ----------

class QuickSaleIn(BaseModel):
    amount: str | float
    payment_type: str = "cash"  # cash | udhaari | upi
    customer_id: str | None = None
    note: str = ""


@router.post("/api/quick-sale")
def quick_sale(body: QuickSaleIn, db: Session = Depends(get_session)) -> dict:
    _ensure_seed(db)
    amt = Decimal(str(body.amount)).quantize(Decimal("0.01"))
    tid = f"qs-{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    pt = body.payment_type.lower()
    if pt == "udhaari" and body.customer_id:
        row = TransactionRow(id=tid, tenant_id="demo", source="manual", source_ref=tid,
                             amount=amt, currency="INR", direction="credit",
                             merchant=body.note or "Quick sale", descriptor=f"UDHAARI SALE {body.note}",
                             txn_date=now, status="posted", category="udhaari-sale")
        db.add(row)
        record_credit_sale(db, body.customer_id, amt, tid)
        log_event(db, "demo", "transaction", tid, "user", "quick_sale_udhaari", {"amount": str(amt)})
        db.commit()
        return {"id": tid, "status": "posted", "kind": "udhaari-sale"}
    row = TransactionRow(id=tid, tenant_id="demo", source="manual", source_ref=tid,
                         amount=amt, currency="INR", direction="credit",
                         merchant=body.note or "Counter Sale", descriptor=f"CASH SALE {body.note}",
                         txn_date=now, status="posted", category="cash-sale" if pt == "cash" else "sales")
    db.add(row)
    db.add(LedgerRow(id=f"le-{tid}", tenant_id="demo", txn_id=tid,
                     category=row.category, merchant=row.merchant, amount=amt,
                     direction="credit", posted_at=now,
                     provenance_json={"quick_sale": True, "payment_type": pt}))
    log_event(db, "demo", "transaction", tid, "user", "quick_sale", {"amount": str(amt)})
    db.commit()
    return {"id": tid, "status": "posted", "kind": row.category}


# ---------- customers ----------

@router.get("/api/customers")
def list_customers(db: Session = Depends(get_session)) -> dict:
    _ensure_seed(db)
    rows = db.execute(select(CustomerRow)).scalars().all()
    return {"count": len(rows), "customers": [
        {"id": r.id, "name": r.name, "phone": r.phone, "vpa": r.vpa, "balance_owed": str(r.balance_owed)}
        for r in rows
    ]}


class CustomerIn(BaseModel):
    name: str
    phone: str = ""
    vpa: str = ""


@router.post("/api/customers")
def create_customer(body: CustomerIn, db: Session = Depends(get_session)) -> dict:
    cid = f"cust-{uuid.uuid4().hex[:8]}"
    db.add(CustomerRow(id=cid, tenant_id="demo", name=body.name, phone=body.phone,
                       vpa=body.vpa, balance_owed=Decimal("0.00")))
    log_event(db, "demo", "customer", cid, "user", "created", {"name": body.name})
    db.commit()
    return {"id": cid, "name": body.name}


class PaymentIn(BaseModel):
    amount: str | float


@router.post("/api/customers/{cid}/payment")
def customer_payment(cid: str, body: PaymentIn, db: Session = Depends(get_session)) -> dict:
    amt = Decimal(str(body.amount)).quantize(Decimal("0.01"))
    new_bal = apply_partial_payment(db, cid, amt, f"manual-{uuid.uuid4().hex[:8]}")
    log_event(db, "demo", "customer", cid, "user", "payment", {"amount": str(amt)})
    db.commit()
    return {"id": cid, "balance_owed": str(new_bal)}


@router.post("/api/customers/{cid}/remind")
def customer_remind(cid: str, db: Session = Depends(get_session)) -> dict:
    c = db.get(CustomerRow, cid)
    if c is None:
        raise HTTPException(404, "customer not found")
    if not can_send_reminder(cid):
        raise HTTPException(429, "reminder rate-limited: one per hour")
    body = reminder_template(c.name, Decimal(str(c.balance_owed)))
    mid = send_nudge(db, c.phone or "owner", body, ["Paid", "Remind later"], "", "demo")
    _udhaari_mod._REMINDER_TS[cid] = __import__("time").time()
    log_event(db, "demo", "customer", cid, "system", "reminder_sent", {"message_id": mid})
    db.commit()
    return {"message_id": mid, "body": body}


# ---------- actions / whatsapp ----------

@router.get("/api/actions")
def list_actions(db: Session = Depends(get_session)) -> dict:
    rows = db.execute(select(WhatsAppRow).where(WhatsAppRow.status == "pending")).scalars().all()
    return {"count": len(rows), "actions": [
        {"id": r.id, "body": r.body, "txn_id": r.txn_id, "status": r.status,
         "quick_replies": r.quick_replies_json or []} for r in rows
    ]}


class RespondIn(BaseModel):
    reply: str


@router.post("/api/actions/{mid}/respond")
def action_respond(mid: str, body: RespondIn, db: Session = Depends(get_session)) -> dict:
    status = handle_response(db, mid, body.reply)
    log_event(db, "demo", "whatsapp", mid, "user", "responded", {"reply": body.reply})
    db.commit()
    return {"id": mid, "status": status}


@router.get("/api/whatsapp/outbox")
def wa_outbox(db: Session = Depends(get_session)) -> dict:
    rows = db.execute(select(WhatsAppRow)).scalars().all()
    return {"count": len(rows), "messages": [
        {"id": r.id, "to": r.to, "body": r.body, "txn_id": r.txn_id,
         "status": r.status, "reply": r.reply or ""} for r in rows
    ]}


class WebhookIn(BaseModel):
    message_id: str
    reply: str


@router.post("/api/whatsapp/webhook")
def wa_webhook(body: WebhookIn, db: Session = Depends(get_session)) -> dict:
    status = handle_response(db, body.message_id, body.reply)
    log_event(db, "demo", "whatsapp", body.message_id, "user", "webhook_reply", {"reply": body.reply})
    db.commit()
    return {"id": body.message_id, "status": status}


# ---------- digest / audit / eval ----------

@router.get("/api/digest/daily")
def digest_daily(db: Session = Depends(get_session)) -> dict:
    _ensure_seed(db)
    return daily_digest(db)


@router.get("/api/audit")
def audit_list(
    entity_id: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_session),  # type: ignore[valid-type]
) -> dict:
    q = select(AuditRow).order_by(AuditRow.created_at.desc()).limit(limit)
    if entity_id:
        q = select(AuditRow).where(AuditRow.entity_id == entity_id).order_by(
            AuditRow.created_at.desc()).limit(limit)
    rows = db.execute(q).scalars().all()
    return {"count": len(rows), "events": [
        {"id": r.id, "entity_type": r.entity_type, "entity_id": r.entity_id,
         "actor": r.actor, "action": r.action, "metadata": r.meta_json or {}} for r in rows
    ]}


@router.get("/api/eval/run")
def eval_run() -> dict:
    from evals.harness import main as harness_main

    return harness_main()
