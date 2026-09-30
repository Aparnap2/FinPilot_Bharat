"""Audit log — append-only."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .db import AuditRow


def log_event(
    session: Session,
    tenant_id: str,
    entity_type: str,
    entity_id: str,
    actor: str,
    action: str,
    metadata: dict | None = None,
) -> str:
    eid = f"aud-{uuid.uuid4().hex[:12]}"
    row = AuditRow(
        id=eid,
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        actor=actor,
        action=action,
        meta_json=metadata or {},
        created_at=datetime.now(timezone.utc),
    )
    session.add(row)
    session.flush()
    return eid
