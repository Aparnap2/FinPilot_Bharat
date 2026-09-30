"""Seed deterministic demo data: 1 tenant, 3 customers (Rahul owes 1200), chart, inbox receipts."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from .connectors.mocked import INLINE_BANK, INLINE_GATEWAY, INLINE_INBOX
from .db import CustomerRow

CUSTOMERS = [
    {"id": "cust-rahul", "name": "Rahul Kumar", "phone": "9843720001", "vpa": "rahul@okaxis", "balance_owed": Decimal("1200.00")},
    {"id": "cust-priya", "name": "Priya Sharma", "phone": "9811111111", "vpa": "priya@okhdfc", "balance_owed": Decimal("0.00")},
    {"id": "cust-abc", "name": "ABC Corp", "phone": "", "vpa": "", "balance_owed": Decimal("3500.00")},
]


def seed_demo_data(session: Session, tenant_id: str = "demo") -> dict:
    for c in CUSTOMERS:
        if session.get(CustomerRow, c["id"]) is None:
            session.add(CustomerRow(
                id=c["id"], tenant_id=tenant_id, name=c["name"],
                phone=c["phone"], vpa=c["vpa"], balance_owed=c["balance_owed"],
            ))
    session.commit()
    return {
        "tenant_id": tenant_id,
        "customers": len(CUSTOMERS),
        "bank_fixtures": len(INLINE_BANK),
        "gateway_fixtures": len(INLINE_GATEWAY),
        "inbox_fixtures": len(INLINE_INBOX),
    }
