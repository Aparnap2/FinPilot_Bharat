"""Deterministic mock connectors. Prefer mockoon/seed/*.json when present, else inline fixtures."""
from __future__ import annotations

import json
import os


def _load_seed(filename: str) -> list[dict] | None:
    for candidate in (
        os.path.join("mockoon", "seed", filename),
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "mockoon", "seed", filename),
        f"/home/aparna/Desktop/cfo_agent/mockoon/seed/{filename}",
    ):
        try:
            if os.path.exists(candidate):
                with open(candidate) as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
        except Exception:
            continue
    return None


INLINE_BANK = [
    {"id": "txn-clean-001", "descriptor": "UPI/CR/100001/AMAZON PAY/OKHDFC", "amount": "2499.00", "currency": "INR", "direction": "credit", "type": "CR", "date": "2026-09-28T10:30:00+00:00", "merchant": "Amazon", "vpa": "OKHDFC"},
    {"id": "txn-udhaari-500", "descriptor": "UPI/CR/984372/RAHUL K/OKAXIS", "amount": "500.00", "currency": "INR", "direction": "credit", "type": "CR", "date": "2026-09-29T09:15:00+00:00", "merchant": "RAHUL K", "vpa": "OKAXIS"},
    {"id": "txn-swiggy-899", "descriptor": "UPI/DR/100003/SWIGGY/OKICICI", "amount": "899.00", "currency": "INR", "direction": "debit", "type": "DR", "date": "2026-09-29T13:00:00+00:00", "merchant": "Swiggy", "vpa": "OKICICI"},
    {"id": "txn-high-125k", "descriptor": "NEFT/CR/100004/ABC CORP/HDFC0001", "amount": "125000.00", "currency": "INR", "direction": "credit", "type": "CR", "date": "2026-09-27T11:00:00+00:00", "merchant": "ABC CORP"},
    {"id": "txn-zomato-649a", "descriptor": "UPI/DR/100005/ZOMATO/OKSBI", "amount": "649.00", "currency": "INR", "direction": "debit", "type": "DR", "date": "2026-09-29T19:00:00+00:00", "merchant": "Zomato", "vpa": "OKSBI"},
    {"id": "txn-zomato-649b", "descriptor": "UPI/DR/100005/ZOMATO/OKSBI", "amount": "649.00", "currency": "INR", "direction": "debit", "type": "DR", "date": "2026-09-29T19:00:00+00:00", "merchant": "Zomato", "vpa": "OKSBI"},
    {"id": "txn-refund-649", "descriptor": "REFUND/ZOMATO/100006", "amount": "649.00", "currency": "INR", "direction": "credit", "type": "CR", "date": "2026-09-29T20:00:00+00:00", "merchant": "Zomato"},
    {"id": "txn-gst-5000", "descriptor": "UPI/DR/100007/GST PAYMENT/OKSBI", "amount": "5000.00", "currency": "INR", "direction": "debit", "type": "DR", "date": "2026-09-28T15:00:00+00:00", "merchant": "GST PAYMENT"},
    {"id": "txn-ambig-1200", "descriptor": "UPI/CR/100008/UNKNOWN/OKPAY", "amount": "1200.00", "currency": "INR", "direction": "credit", "type": "CR", "date": "2026-09-29T08:00:00+00:00", "merchant": ""},
    {"id": "txn-cash-sale", "descriptor": "CASH SALE - counter", "amount": "1800.00", "currency": "INR", "direction": "credit", "type": "CR", "date": "2026-09-29T18:00:00+00:00", "merchant": "Counter Sale"},
]

INLINE_GATEWAY = [
    {"id": "gw-settle-001", "descriptor": "GATEWAY SETTLEMENT RAZORPAY", "amount": "7450.00", "currency": "INR", "direction": "credit", "type": "CR", "date": "2026-09-29T06:00:00+00:00", "merchant": "Razorpay Settlement"},
]

INLINE_INBOX = [
    {"id": "rcpt-amazon-2499", "merchant": "Amazon", "amount": "2499.00", "date": "2026-09-28T10:35:00+00:00", "kind": "receipt", "subject": "Amazon order receipt Rs.2499", "summary": "Amazon receipt dated 2026-09-28 for Rs.2499"},
    {"id": "rcpt-gw-7450", "merchant": "Razorpay", "amount": "7450.00", "date": "2026-09-29T06:05:00+00:00", "kind": "gateway_settlement", "subject": "Razorpay settlement Rs.7450", "summary": "Razorpay settlement dated 2026-09-29 for Rs.7450"},
    {"id": "rcpt-zomato-649", "merchant": "Zomato", "amount": "649.00", "date": "2026-09-29T19:05:00+00:00", "kind": "receipt", "subject": "Zomato refund Rs.649", "summary": "Zomato refund dated 2026-09-29 for Rs.649"},
]

INLINE_LEDGER_CHART = [
    {"code": c, "name": c} for c in [
        "sales", "food-delivery", "shopping", "gateway-settlement", "refunds",
        "tax", "udhaari-receipt", "udhaari-sale", "uncategorized", "cash-sale",
        "transfer", "other",
    ]
]


class MockBankConnector:
    name = "bank"

    def fetch(self) -> list[dict]:
        return list(_load_seed("bank_transactions.json") or INLINE_BANK)


class MockGatewayConnector:
    name = "gateway"

    def fetch(self) -> list[dict]:
        return list(_load_seed("gateway_settlements.json") or INLINE_GATEWAY)


class MockInboxConnector:
    name = "inbox"

    def fetch(self) -> list[dict]:
        return list(_load_seed("inbox_receipts.json") or INLINE_INBOX)


class MockLedgerConnector:
    name = "ledger"

    def fetch(self) -> list[dict]:
        return list(_load_seed("chart_of_accounts.json") or INLINE_LEDGER_CHART)
