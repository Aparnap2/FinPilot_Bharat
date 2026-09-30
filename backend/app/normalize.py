"""Normalize raw connector dicts -> CanonicalTransaction. Decimal + UTC, idempotent keys."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from .models import CanonicalTransaction
from .upi import parse_upi_descriptor


def _to_decimal(v: object) -> Decimal:
    try:
        if isinstance(v, Decimal):
            return v.quantize(Decimal("0.01"))
        return Decimal(str(v)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return Decimal("0.00")


def _to_utc(v: object) -> datetime:
    if isinstance(v, datetime):
        dt = v
    elif isinstance(v, str):
        s = v.strip()
        try:
            if s.endswith("Z"):
                s = s[:-1] + "+00:00"
            dt = datetime.fromisoformat(s)
        except ValueError:
            dt = datetime.now(timezone.utc)
    else:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def normalize_transaction(raw: dict, source: str) -> CanonicalTransaction:
    descriptor = str(raw.get("descriptor") or raw.get("narration") or raw.get("note") or "")
    parsed = parse_upi_descriptor(descriptor)
    direction_raw = str(raw.get("direction") or parsed.get("direction") or "credit").lower()
    direction = "debit" if direction_raw.startswith("debit") or direction_raw in ("dr", "out", "debit") else "credit"
    # explicit type field
    if str(raw.get("type", "")).upper() == "DR":
        direction = "debit"
    if str(raw.get("type", "")).upper() == "CR":
        direction = "credit"

    amount = _to_decimal(raw.get("amount", "0"))
    txn_date = _to_utc(raw.get("date") or raw.get("txn_date") or datetime.now(timezone.utc))
    source_ref = str(raw.get("id") or raw.get("ref") or raw.get("txn_id") or raw.get("upi_ref") or descriptor[:48] or "unknown")
    merchant = str(raw.get("merchant") or raw.get("counterparty") or parsed.get("name") or "").strip()
    tid = str(raw.get("txn_id") or raw.get("id") or f"{source}-{source_ref}")

    key_basis = f"{source}:{source_ref}:{amount}:{txn_date.date().isoformat()}"
    dedupe_key = hashlib.sha256(key_basis.encode()).hexdigest()[:32]

    return CanonicalTransaction(
        id=tid,
        tenant_id=str(raw.get("tenant_id", "demo")),
        source=source,
        source_ref=source_ref,
        amount=amount,
        currency=str(raw.get("currency", "INR")),
        direction=direction,  # type: ignore[arg-type]
        merchant=merchant,
        descriptor=descriptor,
        txn_date=txn_date,
        vpa_handle=str(raw.get("vpa") or parsed.get("vpa_handle") or ""),
        upi_ref=str(raw.get("upi_ref") or parsed.get("ref") or ""),
        dedupe_key=dedupe_key,
        raw=dict(raw),
    )
