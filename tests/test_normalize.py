"""Unit tests for normalize_transaction: Decimal, UTC, dedupe stability."""
from datetime import datetime, timezone
from decimal import Decimal

from backend.app.normalize import normalize_transaction


def _raw(**over):
    base = {
        "id": "txn-clean-001",
        "descriptor": "UPI/CR/100001/AMAZON PAY/OKHDFC",
        "amount": "2499.00",
        "currency": "INR",
        "direction": "credit",
        "type": "CR",
        "date": "2026-09-28T10:30:00+00:00",
        "merchant": "Amazon",
        "vpa": "OKHDFC",
    }
    base.update(over)
    return base


def test_amount_is_decimal_quantized():
    # Arrange
    raw = _raw(amount="2499.5")
    # Act
    txn = normalize_transaction(raw, "bank")
    # Assert
    assert isinstance(txn.amount, Decimal)
    assert txn.amount == Decimal("2499.50")


def test_bad_amount_falls_back_to_zero():
    # Arrange
    raw = _raw(amount="not-a-number")
    # Act
    txn = normalize_transaction(raw, "bank")
    # Assert
    assert txn.amount == Decimal("0.00")


def test_naive_datetime_assumed_utc():
    # Arrange
    raw = _raw(date="2026-09-28T10:30:00")
    # Act
    txn = normalize_transaction(raw, "bank")
    # Assert
    assert txn.txn_date.tzinfo is not None
    assert txn.txn_date.astimezone(timezone.utc).utcoffset() == timezone.utc.utcoffset(None)


def test_z_suffix_parsed_as_utc():
    # Arrange
    raw = _raw(date="2026-09-28T10:30:00Z")
    # Act
    txn = normalize_transaction(raw, "bank")
    # Assert
    assert txn.txn_date == datetime(2026, 9, 28, 10, 30, tzinfo=timezone.utc)


def test_dedupe_key_stable_for_same_input():
    # Arrange
    raw_a, raw_b = _raw(), _raw()
    # Act
    key_a = normalize_transaction(raw_a, "bank").dedupe_key
    key_b = normalize_transaction(raw_b, "bank").dedupe_key
    # Assert
    assert key_a == key_b and len(key_a) == 32


def test_dedupe_key_changes_with_amount():
    # Arrange
    # Act
    key_a = normalize_transaction(_raw(amount="100.00"), "bank").dedupe_key
    key_b = normalize_transaction(_raw(amount="200.00"), "bank").dedupe_key
    # Assert
    assert key_a != key_b


def test_dr_type_forces_debit_direction():
    # Arrange
    raw = _raw(type="DR", direction="credit")
    # Act
    txn = normalize_transaction(raw, "bank")
    # Assert
    assert txn.direction == "debit"


def test_upi_ref_and_vpa_extracted():
    # Arrange
    raw = _raw(descriptor="UPI/CR/984372/RAHUL K/OKAXIS", merchant="RAHUL K", vpa="OKAXIS")
    # Act
    txn = normalize_transaction(raw, "bank")
    # Assert
    assert txn.upi_ref == "984372"
    assert txn.vpa_handle == "OKAXIS"
    assert txn.merchant == "RAHUL K"
