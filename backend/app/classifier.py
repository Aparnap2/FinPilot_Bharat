"""MOCKED AI classifier — rule-based, never invents data."""
from __future__ import annotations

from decimal import Decimal

from .config import settings
from .models import CanonicalTransaction, ClassificationProposal, Evidence

KNOWN_VENDORS = {
    "amazon": ("shopping", 0.95),
    "swiggy": ("food-delivery", 0.80),
    "zomato": ("food-delivery", 0.80),
    "razorpay": ("gateway-settlement", 0.90),
    "counter sale": ("cash-sale", 0.70),
    "cash sale": ("cash-sale", 0.70),
}

CATEGORY_BY_KEYWORD = [
    ("gst", "tax"),
    ("refund", "refunds"),
    ("reversal", "refunds"),
    ("rahul", "udhaari-receipt"),
    ("abc corp", "sales"),
    ("gateway", "gateway-settlement"),
    ("razorpay", "gateway-settlement"),
]


def classify(
    txn: CanonicalTransaction,
    evidence: list[Evidence],
    customers: list[dict],
    chart: list[dict],
) -> ClassificationProposal:
    valid_categories = {str(c.get("code") or c.get("name")) for c in chart} or {"uncategorized"}
    desc = f"{txn.merchant} {txn.descriptor}".lower()
    best_ev = max(evidence, key=lambda e: e.match_score, default=None)

    # udhaari match: name in customers
    for c in customers:
        nm = str(c.get("name", "")).lower()
        if nm and nm.split()[0] in desc and txn.direction == "credit":
            conf = 0.72 if best_ev is None else min(0.85, best_ev.match_score)
            return ClassificationProposal(
                txn_id=txn.id,
                proposed_merchant=txn.merchant or c.get("name", ""),
                proposed_category="udhaari-receipt" if "udhaari-receipt" in valid_categories else "sales",
                confidence=conf,
                rationale=f"Customer name match '{c.get('name')}' suggests udhaari payment; evidence={len(evidence)}",
                evidence_ids=[e.id for e in evidence],
                requires_review=True,
                recommended_action="quick_confirm",
            )

    # known vendor + strong evidence -> high confidence auto_post candidate
    for vendor, (cat, base) in KNOWN_VENDORS.items():
        if vendor in desc:
            if best_ev is not None and best_ev.match_score >= 0.9:
                conf = base
                action = "auto_post" if conf >= settings.AUTO_POST_CONFIDENCE else "quick_confirm"
                return ClassificationProposal(
                    txn_id=txn.id,
                    proposed_merchant=txn.merchant,
                    proposed_category=cat if cat in valid_categories else "uncategorized",
                    confidence=conf,
                    rationale=f"Known vendor '{vendor}' with evidence match_score={best_ev.match_score}",
                    evidence_ids=[e.id for e in evidence],
                    requires_review=(action != "auto_post"),
                    recommended_action=action,  # type: ignore[arg-type]
                )
            # known vendor but no evidence -> lower confidence
            return ClassificationProposal(
                txn_id=txn.id,
                proposed_merchant=txn.merchant,
                proposed_category=cat if cat in valid_categories else "uncategorized",
                confidence=0.55,
                rationale=f"Known vendor '{vendor}' but no receipt evidence; needs confirmation",
                evidence_ids=[],
                requires_review=True,
                recommended_action="manual_review",
            )

    for kw, cat in CATEGORY_BY_KEYWORD:
        if kw in desc:
            c2 = cat if cat in valid_categories else "uncategorized"
            if kw in ("refund", "reversal"):
                return ClassificationProposal(
                    txn_id=txn.id, proposed_merchant=txn.merchant, proposed_category=c2,
                    confidence=0.65, rationale=f"Keyword '{kw}' indicates refund flow",
                    evidence_ids=[e.id for e in evidence], requires_review=True,
                    recommended_action="quick_confirm",
                )
            if kw == "gst":
                return ClassificationProposal(
                    txn_id=txn.id, proposed_merchant=txn.merchant, proposed_category=c2,
                    confidence=0.55, rationale="Tax-sensitive keyword; manual review required",
                    evidence_ids=[], requires_review=True, recommended_action="manual_review",
                )
            return ClassificationProposal(
                txn_id=txn.id, proposed_merchant=txn.merchant, proposed_category=c2,
                confidence=0.70 if best_ev else 0.55,
                rationale=f"Keyword '{kw}' mapping",
                evidence_ids=[e.id for e in evidence], requires_review=True,
                recommended_action="quick_confirm" if best_ev else "manual_review",
            )

    # high value -> manual regardless
    if txn.amount >= Decimal(str(settings.HIGH_VALUE_THRESHOLD)):
        return ClassificationProposal(
            txn_id=txn.id, proposed_merchant=txn.merchant, proposed_category="uncategorized",
            confidence=0.40, rationale="High-value transaction requires manual review",
            evidence_ids=[], requires_review=True, recommended_action="manual_review",
        )

    # fallback: unknown
    return ClassificationProposal(
        txn_id=txn.id, proposed_merchant=txn.merchant, proposed_category="uncategorized",
        confidence=0.35, rationale="No vendor/keyword match and no strong evidence",
        evidence_ids=[e.id for e in evidence], requires_review=True,
        recommended_action="manual_review",
    )
