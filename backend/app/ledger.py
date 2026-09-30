"""Idempotent deterministic ledger posting."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from .db import IdempotencyRow, LedgerRow, TransactionRow
from .models import CanonicalTransaction, ClassificationProposal, GuardrailVerdict


def post_ledger_update(
    session: Session,
    txn: CanonicalTransaction,
    proposal: ClassificationProposal,
    verdict: GuardrailVerdict,
    category_override: str | None = None,
) -> str:
    if not verdict.safe_to_post and category_override is None:
        raise ValueError(f"Blocked: not safe_to_post for {txn.id}: {verdict.violations}")
    category = category_override or proposal.proposed_category
    entry_id = f"le-{txn.id}"
    # idempotency: skip if key exists
    existing = session.get(LedgerRow, entry_id)
    if existing is not None:
        return entry_id
    key = f"ledger:{entry_id}"
    if session.get(IdempotencyRow, key) is not None:
        return entry_id
    row = LedgerRow(
        id=entry_id,
        tenant_id=txn.tenant_id,
        txn_id=txn.id,
        category=category,
        merchant=proposal.proposed_merchant or txn.merchant,
        amount=txn.amount,
        direction=txn.direction,
        posted_at=datetime.now(timezone.utc),
        provenance_json={
            "confidence": proposal.confidence,
            "rationale": proposal.rationale,
            "evidence_ids": proposal.evidence_ids,
            "verdict_checks": verdict.checks,
            "category_override": category_override,
        },
    )
    session.add(row)
    session.add(IdempotencyRow(key=key, tenant_id=txn.tenant_id))
    # mark txn posted
    trow = session.get(TransactionRow, txn.id)
    if trow is not None:
        trow.status = "posted"
        trow.category = category
    session.flush()
    return entry_id
