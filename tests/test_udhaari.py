"""Unit tests for udhaari matching, partial payments, and reminder rate limits."""
from decimal import Decimal
from types import SimpleNamespace

from sqlalchemy import select

from backend.app.db import CreditLedgerRow, CustomerRow
from backend.app.udhaari import (
    _REMINDER_TS,
    apply_partial_payment,
    can_send_reminder,
    match_udhaari_payment,
)


def _customers():
    return [
        {"id": "cust-rahul", "name": "Rahul Kumar", "phone": "9843720001", "vpa": "rahul@okaxis"},
        {"id": "cust-priya", "name": "Priya Sharma", "phone": "9811111111", "vpa": "priya@okhdfc"},
    ]


def test_partial_payment_1200_minus_500_equals_700(db_session):
    # Arrange: Rahul owes 1200.00 (seeded)
    before = db_session.get(CustomerRow, "cust-rahul")
    assert Decimal(str(before.balance_owed)) == Decimal("1200.00")
    # Act
    new_bal = apply_partial_payment(db_session, "cust-rahul", Decimal("500.00"), "txn-udhaari-500")
    # Assert
    assert new_bal == Decimal("700.00")
    assert Decimal(str(db_session.get(CustomerRow, "cust-rahul").balance_owed)) == Decimal("700.00")
    entries = db_session.execute(
        select(CreditLedgerRow).where(CreditLedgerRow.customer_id == "cust-rahul")
    ).scalars().all()
    assert len(entries) == 1 and entries[0].balance_after == Decimal("700.00")


def test_overpayment_floors_at_zero(db_session):
    # Arrange
    # Act
    new_bal = apply_partial_payment(db_session, "cust-rahul", Decimal("5000.00"), "txn-big")
    # Assert
    assert new_bal == Decimal("0.00")


def test_match_by_customer_first_name():
    # Arrange
    txn = SimpleNamespace(merchant="RAHUL K", descriptor="UPI/CR/984372/RAHUL K/OKAXIS", vpa_handle="OKAXIS")
    # Act
    match = match_udhaari_payment(txn, _customers())
    # Assert
    assert match is not None and match["id"] == "cust-rahul"


def test_match_by_phone_in_descriptor():
    # Arrange
    txn = SimpleNamespace(merchant="", descriptor="UPI payment 9843720001 received", vpa_handle="")
    # Act
    match = match_udhaari_payment(txn, _customers())
    # Assert
    assert match is not None and match["id"] == "cust-rahul"


def test_match_by_vpa_handle():
    # Arrange
    txn = SimpleNamespace(merchant="", descriptor="upi collect", vpa_handle="rahul@okaxis")
    # Act
    match = match_udhaari_payment(txn, _customers())
    # Assert
    assert match is not None and match["id"] == "cust-rahul"


def test_no_match_for_unknown_counterparty():
    # Arrange
    txn = SimpleNamespace(merchant="UNKNOWN", descriptor="UPI/CR/9/UNKNOWN/OKPAY", vpa_handle="OKPAY")
    # Act
    match = match_udhaari_payment(txn, _customers())
    # Assert
    assert match is None


def test_reminder_rate_limit_one_per_hour():
    # Arrange
    _REMINDER_TS.clear()
    # Act + Assert: first send allowed…
    assert can_send_reminder("cust-rahul") is True
    import time as _time

    _REMINDER_TS["cust-rahul"] = _time.time()
    # …second send within the hour blocked
    assert can_send_reminder("cust-rahul") is False
