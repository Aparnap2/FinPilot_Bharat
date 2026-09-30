"""Daily digest: inflows/outflows/UPI vs cash/credit/overdue/uncategorized/missing/runway."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import CustomerRow, LedgerRow, TransactionRow


def daily_digest(session: Session, tenant_id: str = "demo") -> dict:
    txns = session.execute(
        select(TransactionRow).where(TransactionRow.tenant_id == tenant_id)
    ).scalars().all()
    ledger = session.execute(
        select(LedgerRow).where(LedgerRow.tenant_id == tenant_id)
    ).scalars().all()
    customers = session.execute(
        select(CustomerRow).where(CustomerRow.tenant_id == tenant_id)
    ).scalars().all()

    inflows = sum((Decimal(str(t.amount)) for t in txns if t.direction == "credit"), Decimal("0.00"))
    outflows = sum((Decimal(str(t.amount)) for t in txns if t.direction == "debit"), Decimal("0.00"))
    upi_count = sum(1 for t in txns if "upi" in (t.descriptor or "").lower())
    cash_count = sum(1 for t in txns if "cash" in (t.descriptor or "").lower())

    open_udhaari = sum((Decimal(str(c.balance_owed)) for c in customers), Decimal("0.00"))
    overdue = sum(1 for c in customers if Decimal(str(c.balance_owed)) > 0)
    uncategorized = sum(1 for t in txns if not t.category)
    missing_receipts = sum(1 for t in txns if t.direction == "debit" and not t.category)

    # runway: avg daily burn from last 30d outflows
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)
    recent_out = Decimal("0.00")
    for t in txns:
        d = t.txn_date
        if d is None:
            continue
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        if d >= cutoff and t.direction == "debit":
            recent_out += Decimal(str(t.amount))
    avg_burn = (recent_out / Decimal("30")).quantize(Decimal("0.01")) if recent_out > 0 else Decimal("0.00")
    balance = inflows - outflows
    runway_days = int(balance // avg_burn) if avg_burn > 0 and balance > 0 else (999 if balance > 0 else 0)
    alert = runway_days < 45

    return {
        "tenant_id": tenant_id,
        "inflows": str(inflows),
        "outflows": str(outflows),
        "balance": str(balance),
        "upi_count": upi_count,
        "cash_count": cash_count,
        "ledger_posted": len(ledger),
        "open_udhaari": str(open_udhaari),
        "overdue_customers": overdue,
        "uncategorized": uncategorized,
        "missing_receipts": missing_receipts,
        "avg_daily_burn": str(avg_burn),
        "runway_days": runway_days,
        "runway_alert": alert,
        "generated_at": now.isoformat(),
    }
