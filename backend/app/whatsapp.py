"""WhatsApp nudge outbox + response state machine. Blocks sensitive data."""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .db import WhatsAppRow

SENSITIVE_RE = re.compile(r"\b(?:\d{12,16}|\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}|ACC:? ?\d{6,}|CARD:? ?\d{6,}|CVV:? ?\d{3}|OTP:? ?\d{4,6})\b", re.IGNORECASE)


def _assert_no_sensitive(text: str) -> None:
    if SENSITIVE_RE.search(text or ""):
        raise ValueError("Message contains sensitive data (account/card pattern) — blocked")


def send_nudge(
    session: Session,
    to: str,
    body: str,
    quick_replies: list[str] | None,
    txn_id: str,
    tenant_id: str = "demo",
) -> str:
    _assert_no_sensitive(body)
    mid = f"wa-{uuid.uuid4().hex[:12]}"
    session.add(
        WhatsAppRow(
            id=mid,
            tenant_id=tenant_id,
            to=to,
            body=body,
            quick_replies_json=list(quick_replies or []),
            txn_id=txn_id,
            status="pending",
            reply="",
            created_at=datetime.now(timezone.utc),
        )
    )
    session.flush()
    return mid


def handle_response(session: Session, message_id: str, reply: str) -> str:
    row: WhatsAppRow | None = session.get(WhatsAppRow, message_id)
    if row is None:
        raise ValueError(f"message {message_id} not found")
    _assert_no_sensitive(reply)
    r = (reply or "").strip().lower()
    if r in ("timeout", "expire"):
        row.status = "timeout"
    else:
        row.status = "responded"
    row.reply = reply
    session.flush()
    return row.status
