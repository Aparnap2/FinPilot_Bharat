"""UPI descriptor parser. Malformed-safe, never raises."""
from __future__ import annotations


def parse_upi_descriptor(descriptor: str) -> dict[str, str]:
    """Parse e.g. 'UPI/CR/984372/RAHUL K/OKAXIS' -> ref, name, vpa_handle, direction.

    Handles DR/CR, NEFT/IMPS/REFUND variants. Malformed input returns blanks.
    """
    out = {"ref": "", "name": "", "vpa_handle": "", "direction": ""}
    if not descriptor or not isinstance(descriptor, str):
        return out
    try:
        parts = [p.strip() for p in descriptor.strip().split("/")]
        if len(parts) < 2:
            out["name"] = descriptor.strip()[:64]
            return out
        head = parts[0].upper()
        # direction detection: CR / DR / REFUND / REVERSAL tokens anywhere
        upper = descriptor.upper()
        if "/CR" in upper or upper.startswith("CR") or " CR " in upper:
            out["direction"] = "credit"
        elif "/DR" in upper or upper.startswith("DR") or " DR " in upper:
            out["direction"] = "debit"
        elif "REFUND" in upper or "REVERSAL" in upper:
            out["direction"] = "credit"
        # UPI pattern: UPI/<CR|DR>/<ref>/<name>/<handle...>
        if head == "UPI" and len(parts) >= 3:
            if parts[1].upper() in ("CR", "DR"):
                out["ref"] = parts[2] if len(parts) > 2 else ""
                out["name"] = parts[3] if len(parts) > 3 else ""
                out["vpa_handle"] = parts[4] if len(parts) > 4 else ""
            else:
                out["ref"] = parts[1]
                out["name"] = parts[2] if len(parts) > 2 else ""
                out["vpa_handle"] = parts[3] if len(parts) > 3 else ""
        elif head in ("NEFT", "IMPS", "RTGS", "REFUND", "REVERSAL") and len(parts) >= 2:
            # e.g. NEFT/CR/100004/ABC CORP/HDFC0001
            rest = parts[1:]
            if rest and rest[0].upper() in ("CR", "DR"):
                out["ref"] = rest[1] if len(rest) > 1 else ""
                out["name"] = rest[2] if len(rest) > 2 else ""
                out["vpa_handle"] = rest[3] if len(rest) > 3 else ""
            else:
                out["ref"] = rest[0] if rest else ""
                out["name"] = rest[1] if len(rest) > 1 else ""
        else:
            # generic: treat whole as name
            out["name"] = descriptor.strip()[:64]
        return out
    except Exception:
        return {"ref": "", "name": "", "vpa_handle": "", "direction": ""}
