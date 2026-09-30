"""Deterministic guardrail engine."""
from __future__ import annotations

from decimal import Decimal

from .config import settings
from .models import CanonicalTransaction, ClassificationProposal, Evidence, GuardrailVerdict

ALLOWLIST = {
    "sales", "food-delivery", "shopping", "gateway-settlement", "refunds",
    "tax", "udhaari-receipt", "udhaari-sale", "uncategorized", "cash-sale",
    "transfer", "other",
}


def run_guardrails(
    txn: CanonicalTransaction,
    proposal: ClassificationProposal,
    ctx: dict | None = None,
) -> GuardrailVerdict:
    ctx = ctx or {}
    violations: list[str] = []
    checks: dict[str, bool] = {}

    # schema
    ok_schema = bool(txn.id and txn.amount is not None and txn.currency)
    checks["schema"] = ok_schema
    if not ok_schema:
        violations.append("schema_invalid")

    # currency INR
    ok_ccy = txn.currency == "INR"
    checks["currency_inr"] = ok_ccy
    if not ok_ccy:
        violations.append("currency_not_inr")

    # category allowlist
    ok_cat = proposal.proposed_category in ALLOWLIST
    checks["category_allowlisted"] = ok_cat
    if not ok_cat:
        violations.append(f"category_not_allowlisted:{proposal.proposed_category}")

    # amount == evidence amount (if evidence claimed)
    ev_amounts: list[Decimal] = [Decimal(str(e.get("amount"))) for e in ctx.get("evidence_amounts", [])] if ctx.get("evidence_amounts") else []
    evidences: list[Evidence] = ctx.get("evidences", []) or []
    if proposal.evidence_ids and evidences:
        match = any(e.amount == txn.amount for e in evidences if e.id in proposal.evidence_ids)
        checks["amount_matches_evidence"] = match
        if not match:
            violations.append("amount_mismatch_evidence")
    else:
        checks["amount_matches_evidence"] = True

    # high-value needs review
    if txn.amount >= Decimal(str(settings.HIGH_VALUE_THRESHOLD)):
        checks["high_value_review"] = False
        violations.append("high_value_requires_review")
    else:
        checks["high_value_review"] = True

    # auto-post amount cap
    if proposal.recommended_action == "auto_post" and txn.amount > Decimal(str(settings.MAX_AUTO_POST_AMOUNT)):
        checks["auto_post_cap"] = False
        violations.append("exceeds_auto_post_cap")
    else:
        checks["auto_post_cap"] = True

    # confidence gate for auto_post
    if proposal.recommended_action == "auto_post" and proposal.confidence < settings.AUTO_POST_CONFIDENCE:
        checks["confidence_gate"] = False
        violations.append("confidence_below_auto_post_threshold")
    else:
        checks["confidence_gate"] = True

    # evidence required if high confidence
    if proposal.confidence >= settings.AUTO_POST_CONFIDENCE and not proposal.evidence_ids:
        checks["evidence_required"] = False
        violations.append("high_confidence_requires_evidence")
    else:
        checks["evidence_required"] = True

    # duplicate risk
    if ctx.get("suspected_duplicate"):
        checks["duplicate"] = False
        violations.append("suspected_duplicate")
    else:
        checks["duplicate"] = True

    # tax sensitive
    if "tax" in proposal.proposed_category or ctx.get("tax_sensitive"):
        checks["tax_review"] = False
        violations.append("tax_sensitive_requires_review")
    else:
        checks["tax_review"] = True

    # consent (always true mocked)
    checks["consent_valid"] = True

    # user approval
    if ctx.get("user_approval") is False:
        checks["user_approval"] = False
        violations.append("user_rejected")
    else:
        checks["user_approval"] = True

    allowed = len(violations) == 0
    safe = allowed and proposal.recommended_action == "auto_post" and proposal.confidence >= settings.AUTO_POST_CONFIDENCE
    return GuardrailVerdict(
        txn_id=txn.id,
        allowed=allowed,
        safe_to_post=safe,
        human_review=(not safe),
        violations=violations,
        checks=checks,
    )
