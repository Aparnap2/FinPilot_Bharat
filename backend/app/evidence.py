"""Bounded evidence retrieval. No raw body storage — redacted summary only."""
from __future__ import annotations

import re
from datetime import timedelta
from decimal import Decimal

from .models import CanonicalTransaction, Evidence


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def retrieve_evidence(txn: CanonicalTransaction, inbox_items: list[dict]) -> list[Evidence]:
    results: list[Evidence] = []
    txn_words = set(_norm(f"{txn.merchant} {txn.descriptor}").split())
    for item in inbox_items:
        try:
            amt = Decimal(str(item.get("amount", "0"))).quantize(Decimal("0.01"))
        except Exception:
            continue
        if amt != txn.amount:
            continue
        # date window ±3 days
        try:
            from .normalize import _to_utc  # local import to avoid cycle at module load

            idate = _to_utc(item.get("date"))
        except Exception:
            continue
        if abs((idate - txn.txn_date).days) > 3:
            continue
        merchant = str(item.get("merchant", ""))
        mwords = set(_norm(merchant).split())
        overlap = len(txn_words & mwords) if mwords else 0
        if mwords and overlap == 0:
            # allow gateway settlement fuzzy: check substring
            hay = _norm(f"{txn.merchant} {txn.descriptor}")
            if _norm(merchant).split()[0] not in hay:
                continue
        score = 0.95 if overlap >= 1 else 0.75
        # exact merchant + amount + same-day boosts to 0.95+
        if merchant and merchant.lower() in f"{txn.merchant} {txn.descriptor}".lower():
            score = 0.95
        summary = str(item.get("summary") or item.get("subject") or f"{merchant} receipt Rs.{amt}")
        # redact: strip anything looking like account/card numbers
        summary = re.sub(r"\b\d{6,}\b", "****", summary)[:200]
        results.append(
            Evidence(
                id=str(item.get("id", f"ev-{txn.id}")),
                txn_id=txn.id,
                kind=item.get("kind", "receipt"),  # type: ignore[arg-type]
                merchant=merchant,
                amount=amt,
                txn_date=idate,
                match_score=score,
                summary_redacted=summary,
            )
        )
    # bound: top 3 by score
    results.sort(key=lambda e: e.match_score, reverse=True)
    return results[:3]
