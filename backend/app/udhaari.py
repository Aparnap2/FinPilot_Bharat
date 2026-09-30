"""Udhaari (customer credit) matching + polite reminders with in-memory rate limit."""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from .db import CreditLedgerRow, CustomerRow

_REMINDER_TS: dict[str, float] = {}
RATE_LIMIT_SECONDS = 3600


def _norm(s: str) -> str:
    return (s or "").strip().lower()


def match_udhaari_payment(txn: object, customers: list[dict]) -> dict | None:
    merchant = _norm(str(getattr(txn, "merchant", "") or ""))
    desc = _norm(str(getattr(txn, "descriptor", "") or ""))
    vpa = _norm(str(getattr(txn, "vpa_handle", "") or ""))
    hay = f"{merchant} {desc} {vpa}"
    for c in customers:
        name = _norm(str(c.get("name", "")))
        if not name:
            continue
        first = name.split()[0]
        phone = str(c.get("phone", ""))
        vpa_c = _norm(str(c.get("vpa", "")))
        if (first and first in hay) or (phone and phone in hay) or (vpa_c and vpa_c in hay and vpa_c not in ("", "okhdfc", "oksbi", "okicici", "okaxis", "okpay")):
            return c
        # also match raw vpa handle token like OKAXIS shared — require name too
        if first and first in hay:
            return c
    return None


def apply_partial_payment(session: Session, customer_id: str, amount: Decimal, txn_id: str) -> Decimal:
    cust: CustomerRow | None = session.get(CustomerRow, customer_id)
    if cust is None:
        raise ValueError(f"customer {customer_id} not found")
    owed = Decimal(str(cust.balance_owed))
    new_bal = (owed - Decimal(str(amount))).quantize(Decimal("0.01"))
    if new_bal < Decimal("0.00"):
        new_bal = Decimal("0.00")
    cust.balance_owed = new_bal
    entry = CreditLedgerRow(
        id=f"cl-{uuid.uuid4().hex[:12]}",
        tenant_id=cust.tenant_id,
        customer_id=customer_id,
        txn_id=txn_id,
        amount=Decimal(str(amount)),
        kind="payment",
        balance_after=new_bal,
        created_at=datetime.now(timezone.utc),
    )
    session.add(entry)
    session.flush()
    return new_bal


def record_credit_sale(session: Session, customer_id: str, amount: Decimal, txn_id: str = "") -> Decimal:
    cust: CustomerRow | None = session.get(CustomerRow, customer_id)
    if cust is None:
        raise ValueError(f"customer {customer_id} not found")
    new_bal = (Decimal(str(cust.balance_owed)) + Decimal(str(amount))).quantize(Decimal("0.01"))
    cust.balance_owed = new_bal
    session.add(
        CreditLedgerRow(
            id=f"cl-{uuid.uuid4().hex[:12]}",
            tenant_id=cust.tenant_id,
            customer_id=customer_id,
            txn_id=txn_id,
            amount=Decimal(str(amount)),
            kind="sale_on_credit",
            balance_after=new_bal,
            created_at=datetime.now(timezone.utc),
        )
    )
    session.flush()
    return new_bal


def reminder_template(customer_name: str, balance: Decimal) -> str:
    return (
        f"Namaste {customer_name} ji, gentle reminder: Rs.{balance} is pending. "
        "Please pay at your convenience. Thank you!"
    )


def can_send_reminder(customer_id: str) -> bool:
    last = _REMINDER_TS.get(customer_id, 0.0)
    return (time.time() - last) >= RATE_LIMIT_SECONDS
