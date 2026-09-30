"""Unit tests for the UPI descriptor parser (Arrange-Act-Assert, no I/O)."""
from backend.app.upi import parse_upi_descriptor


def test_parse_standard_credit_upi():
    # Arrange
    descriptor = "UPI/CR/984372/RAHUL K/OKAXIS"
    # Act
    out = parse_upi_descriptor(descriptor)
    # Assert
    assert out["ref"] == "984372"
    assert out["name"] == "RAHUL K"
    assert out["vpa_handle"] == "OKAXIS"
    assert out["direction"] == "credit"


def test_parse_debit_upi():
    # Arrange
    descriptor = "UPI/DR/100003/SWIGGY/OKICICI"
    # Act
    out = parse_upi_descriptor(descriptor)
    # Assert
    assert out["direction"] == "debit"
    assert out["ref"] == "100003"
    assert out["name"] == "SWIGGY"


def test_parse_neft_credit():
    # Arrange
    descriptor = "NEFT/CR/100004/ABC CORP/HDFC0001"
    # Act
    out = parse_upi_descriptor(descriptor)
    # Assert
    assert out["direction"] == "credit"
    assert out["ref"] == "100004"
    assert out["name"] == "ABC CORP"


def test_parse_refund_maps_to_credit():
    # Arrange
    descriptor = "REFUND/ZOMATO/100006"
    # Act
    out = parse_upi_descriptor(descriptor)
    # Assert: refund/reversal always settles as credit; positional ref/name kept as-is
    assert out["direction"] == "credit"
    assert out["ref"] == "ZOMATO"
    assert out["name"] == "100006"


def test_parse_empty_string_returns_blanks():
    # Arrange + Act
    out = parse_upi_descriptor("")
    # Assert
    assert out == {"ref": "", "name": "", "vpa_handle": "", "direction": ""}


def test_parse_none_safe():
    # Arrange + Act
    out = parse_upi_descriptor(None)  # type: ignore[arg-type]
    # Assert: never raises, blanks returned
    assert out["ref"] == "" and out["direction"] == ""


def test_parse_garbage_without_slashes_kept_as_name():
    # Arrange
    descriptor = "CASH SALE - counter"
    # Act
    out = parse_upi_descriptor(descriptor)
    # Assert
    assert out["name"] == "CASH SALE - counter"
    assert out["ref"] == ""


def test_parse_short_upi_missing_handle():
    # Arrange
    descriptor = "UPI/CR/100008/UNKNOWN"
    # Act
    out = parse_upi_descriptor(descriptor)
    # Assert
    assert out["ref"] == "100008"
    assert out["name"] == "UNKNOWN"
    assert out["vpa_handle"] == ""
    assert out["direction"] == "credit"


def test_parse_case_insensitive_dr():
    # Arrange
    descriptor = "upi/dr/555/Swiggy/okicici"
    # Act
    out = parse_upi_descriptor(descriptor)
    # Assert
    assert out["direction"] == "debit"
    assert out["name"] == "Swiggy"
