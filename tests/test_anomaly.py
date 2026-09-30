"""Unit tests for deterministic anomaly detection rules."""
from backend.app.anomaly import detect_anomalies
from backend.app.normalize import normalize_transaction


def _txn(**over):
    raw = {
        "id": "t1",
        "descriptor": "UPI/CR/1/AMAZON PAY/OKHDFC",
        "amount": "2499.00",
        "direction": "credit",
        "type": "CR",
        "date": "2026-09-28T10:30:00+00:00",
        "merchant": "Amazon",
    }
    raw.update(over)
    return normalize_transaction(raw, "bank")


def _types(anomalies):
    return {a["type"] for a in anomalies}


def test_high_value_flagged_critical():
    # Arrange
    txn = _txn(
        id="txn-high-125k",
        descriptor="NEFT/CR/100004/ABC CORP/HDFC0001",
        amount="125000.00",
        merchant="ABC CORP",
    )
    # Act
    out = detect_anomalies(txn, {})
    # Assert
    assert "high_value" in _types(out)
    assert next(a for a in out if a["type"] == "high_value")["severity"] == "critical"


def test_suspected_duplicate_flagged_high():
    # Arrange
    txn = _txn(
        id="txn-zomato-649a",
        descriptor="UPI/DR/100005/ZOMATO/OKSBI",
        amount="649.00",
        direction="debit",
        type="DR",
        merchant="Zomato",
    )
    # Act
    out = detect_anomalies(txn, {"suspected_duplicate": True})
    # Assert
    assert "suspected_duplicate" in _types(out)
    assert next(a for a in out if a["type"] == "suspected_duplicate")["severity"] == "high"


def test_refund_flow_detected():
    # Arrange
    txn = _txn(
        id="txn-refund-649",
        descriptor="REFUND/ZOMATO/100006",
        amount="649.00",
        merchant="Zomato",
    )
    # Act
    out = detect_anomalies(txn, {})
    # Assert
    assert "refund_or_reversal" in _types(out)


def test_missing_receipt_for_food_delivery_debit():
    # Arrange
    txn = _txn(
        id="txn-swiggy-899",
        descriptor="UPI/DR/100003/SWIGGY/OKICICI",
        amount="899.00",
        direction="debit",
        type="DR",
        merchant="Swiggy",
    )
    # Act
    without_receipt = detect_anomalies(txn, {})
    with_receipt = detect_anomalies(txn, {"has_receipt": True})
    # Assert
    assert "missing_receipt" in _types(without_receipt)
    assert "missing_receipt" not in _types(with_receipt)


def test_tax_sensitive_gst_payment():
    # Arrange
    txn = _txn(
        id="txn-gst-5000",
        descriptor="UPI/DR/100007/GST PAYMENT/OKSBI",
        amount="5000.00",
        direction="debit",
        type="DR",
        merchant="GST PAYMENT",
    )
    # Act
    out = detect_anomalies(txn, {})
    # Assert
    assert "tax_sensitive" in _types(out)


def test_ambiguous_unknown_merchant():
    # Arrange
    txn = _txn(
        id="txn-ambig-1200",
        descriptor="UPI/CR/100008/UNKNOWN/OKPAY",
        amount="1200.00",
        merchant="",
    )
    # Act
    out = detect_anomalies(txn, {})
    # Assert
    assert "uncategorized" in _types(out)
    assert "ambiguous_merchant" in _types(out)


def test_clean_txn_has_no_high_severity():
    # Arrange
    txn = _txn()
    # Act
    out = detect_anomalies(txn, {"has_receipt": True})
    # Assert
    assert all(a["severity"] not in ("high", "critical") for a in out)
