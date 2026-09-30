"""Unit tests for the deterministic guardrail engine."""
from datetime import datetime, timezone
from decimal import Decimal

from backend.app.guardrails import run_guardrails
from backend.app.models import (
    CanonicalTransaction,
    ClassificationProposal,
    Evidence,
)


def _txn(**over):
    base = dict(
        id="txn-clean-001",
        tenant_id="demo",
        source="bank",
        source_ref="txn-clean-001",
        amount=Decimal("2499.00"),
        currency="INR",
        direction="credit",
        merchant="Amazon",
        descriptor="UPI/CR/100001/AMAZON PAY/OKHDFC",
        txn_date=datetime(2026, 9, 28, 10, 30, tzinfo=timezone.utc),
    )
    base.update(over)
    return CanonicalTransaction(**base)


def _proposal(**over):
    base = dict(
        txn_id="txn-clean-001",
        proposed_merchant="Amazon",
        proposed_category="shopping",
        confidence=0.95,
        rationale="test",
        evidence_ids=["rcpt-amazon-2499"],
        requires_review=False,
        recommended_action="auto_post",
    )
    base.update(over)
    return ClassificationProposal(**base)


def _evidence(**over):
    base = dict(
        id="rcpt-amazon-2499",
        txn_id="txn-clean-001",
        kind="receipt",
        merchant="Amazon",
        amount=Decimal("2499.00"),
        txn_date=datetime(2026, 9, 28, 10, 35, tzinfo=timezone.utc),
        match_score=0.95,
        summary_redacted="Amazon receipt Rs.2499",
    )
    base.update(over)
    return Evidence(**base)


def test_blocks_high_value_auto_post():
    # Arrange
    txn = _txn(id="txn-high-125k", amount=Decimal("125000.00"), merchant="ABC CORP")
    proposal = _proposal(txn_id="txn-high-125k", confidence=0.95)
    # Act
    verdict = run_guardrails(txn, proposal, {"evidences": [_evidence()]})
    # Assert
    assert verdict.safe_to_post is False
    assert verdict.allowed is False
    assert "high_value_requires_review" in verdict.violations


def test_blocks_non_allowlisted_category():
    # Arrange
    txn = _txn()
    proposal = _proposal(proposed_category="crypto-scam")
    # Act
    verdict = run_guardrails(txn, proposal, {"evidences": [_evidence()]})
    # Assert
    assert verdict.safe_to_post is False
    assert any(v.startswith("category_not_allowlisted") for v in verdict.violations)


def test_allows_clean_high_confidence_post():
    # Arrange
    txn = _txn()
    proposal = _proposal()
    # Act
    verdict = run_guardrails(txn, proposal, {"evidences": [_evidence()]})
    # Assert
    assert verdict.allowed is True
    assert verdict.safe_to_post is True
    assert verdict.human_review is False
    assert verdict.violations == []


def test_blocks_suspected_duplicate():
    # Arrange
    txn = _txn(id="txn-zomato-649a", amount=Decimal("649.00"))
    proposal = _proposal(txn_id="txn-zomato-649a")
    # Act
    verdict = run_guardrails(
        txn, proposal, {"evidences": [_evidence()], "suspected_duplicate": True}
    )
    # Assert
    assert verdict.safe_to_post is False
    assert "suspected_duplicate" in verdict.violations


def test_blocks_tax_sensitive_without_review():
    # Arrange
    txn = _txn(id="txn-gst-5000", amount=Decimal("5000.00"), merchant="GST PAYMENT")
    proposal = _proposal(
        txn_id="txn-gst-5000",
        proposed_category="tax",
        confidence=0.55,
        recommended_action="manual_review",
        evidence_ids=[],
    )
    # Act
    verdict = run_guardrails(txn, proposal, {"tax_sensitive": True})
    # Assert
    assert verdict.safe_to_post is False
    assert "tax_sensitive_requires_review" in verdict.violations


def test_blocks_auto_post_above_amount_cap():
    # Arrange
    txn = _txn(amount=Decimal("15000.00"))
    proposal = _proposal()
    # Act
    verdict = run_guardrails(txn, proposal, {"evidences": [_evidence(amount=Decimal("15000.00"))]})
    # Assert
    assert verdict.safe_to_post is False
    assert "exceeds_auto_post_cap" in verdict.violations
