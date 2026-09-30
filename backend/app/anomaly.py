"""Anomaly detection — deterministic rule set."""
from __future__ import annotations

from decimal import Decimal

from .config import settings
from .models import CanonicalTransaction

REFUND_KEYWORDS = ("refund", "reversal", "chargeback", "return")
TAX_KEYWORDS = ("gst", "tax", "tds", "cgst", "sgst")


def detect_anomalies(txn: CanonicalTransaction, ledger_ctx: dict | None = None) -> list[dict]:
    ctx = ledger_ctx or {}
    out: list[dict] = []
    desc = f"{txn.descriptor} {txn.merchant}".lower()

    if not txn.merchant or txn.merchant.strip().lower() in ("unknown", ""):
        out.append({"type": "uncategorized", "severity": "medium"})
    if any(k in desc for k in ("swiggy", "zomato")) and txn.direction == "debit":
        # missing receipt checked against evidence later; flag heuristically when no context
        if not ctx.get("has_receipt"):
            out.append({"type": "missing_receipt", "severity": "medium"})
    if "unknown" in desc or (not txn.merchant and "upi" in desc):
        out.append({"type": "ambiguous_merchant", "severity": "medium"})
    if ctx.get("suspected_duplicate"):
        out.append({"type": "suspected_duplicate", "severity": "high"})
    if txn.amount >= Decimal(str(settings.HIGH_VALUE_THRESHOLD)):
        out.append({"type": "high_value", "severity": "critical"})
    if any(k in desc for k in REFUND_KEYWORDS):
        out.append({"type": "refund_or_reversal", "severity": "low"})
    if "rahul" in desc or (txn.vpa_handle and "rahu" in txn.merchant.lower()):
        out.append({"type": "partial_udhaari_match", "severity": "low"})
    if ctx.get("amount_mismatch"):
        out.append({"type": "amount_mismatch", "severity": "high"})
    if any(k in desc for k in TAX_KEYWORDS):
        out.append({"type": "tax_sensitive", "severity": "high"})
    if ctx.get("unknown_customer"):
        out.append({"type": "unknown_customer", "severity": "medium"})
    return out
