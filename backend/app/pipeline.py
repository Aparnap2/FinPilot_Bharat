"""Pipeline orchestrator: fetch->normalize->dedupe->anomaly->evidence->classify->guardrails->route.

Plain functions with dict state + node transition logging. NO LangGraph.
"""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from .anomaly import detect_anomalies
from .audit import log_event
from .classifier import classify
from .config import settings
from .connectors.mocked import (
    MockBankConnector,
    MockGatewayConnector,
    MockInboxConnector,
    MockLedgerConnector,
)
from .db import CustomerRow, EvidenceRow, IdempotencyRow, TransactionRow
from .evidence import retrieve_evidence
from .guardrails import run_guardrails
from .ledger import post_ledger_update
from .models import SyncRunResult
from .normalize import normalize_transaction
from .udhaari import apply_partial_payment, match_udhaari_payment
from .whatsapp import send_nudge


def _customers_for(session: Session, tenant_id: str) -> list[dict]:
    rows = session.execute(
        select(CustomerRow).where(CustomerRow.tenant_id == tenant_id)
    ).scalars().all()
    return [{"id": r.id, "name": r.name, "phone": r.phone, "vpa": r.vpa} for r in rows]


def run_sync(session: Session, tenant_id: str = "demo") -> SyncRunResult:
    transitions: list[str] = []
    errors: list[str] = []
    sources: dict[str, int] = {}
    auto_posted = 0
    nudges = 0
    manual = 0
    ingested = 0

    def hop(msg: str) -> None:
        transitions.append(msg)

    bank_items = MockBankConnector().fetch()
    gw_items = MockGatewayConnector().fetch()
    inbox_items = MockInboxConnector().fetch()
    chart = MockLedgerConnector().fetch()
    hop(f"fetch: bank={len(bank_items)} gateway={len(gw_items)} inbox={len(inbox_items)}")

    raw_by_source: dict[str, list[dict]] = {"bank": bank_items, "gateway": gw_items}
    # dedupe tracking within run
    seen_in_run: set[str] = set()
    for source, raws in raw_by_source.items():
        sources[source] = len(raws)
        for raw in raws:
            try:
                txn = normalize_transaction(raw, source)
                txn.tenant_id = tenant_id
                hop(f"normalize:{txn.id}")
                log_event(session, tenant_id, "transaction", txn.id, "pipeline", "normalized",
                          {"source": source, "amount": str(txn.amount)})
                # dedupe via idempotency_keys + existing row
                key = f"ingest:{txn.dedupe_key}"
                if key in seen_in_run or session.get(IdempotencyRow, key) is not None \
                        or session.get(TransactionRow, txn.id) is not None:
                    hop(f"dedupe:skip:{txn.id}")
                    log_event(session, tenant_id, "transaction", txn.id, "pipeline", "duplicate_skipped", {})
                    continue
                seen_in_run.add(key)
                session.add(IdempotencyRow(key=key, tenant_id=tenant_id))
                session.add(TransactionRow(
                    id=txn.id, tenant_id=tenant_id, source=source, source_ref=txn.source_ref,
                    amount=txn.amount, currency=txn.currency, direction=txn.direction,
                    merchant=txn.merchant, descriptor=txn.descriptor, txn_date=txn.txn_date,
                    vpa_handle=txn.vpa_handle, upi_ref=txn.upi_ref, dedupe_key=txn.dedupe_key,
                    raw_json=txn.raw, status="ingested",
                ))
                session.flush()
                ingested += 1
                hop(f"dedupe:ingested:{txn.id}")

                # duplicate heuristic: same amount+merchant+date appearing twice in raw batch
                dup = sum(1 for r in bank_items + gw_items
                          if str(r.get("amount")) == str(raw.get("amount"))
                          and str(r.get("descriptor")) == str(raw.get("descriptor"))) > 1
                anomalies = detect_anomalies(txn, {"suspected_duplicate": dup})
                hop(f"anomaly:{txn.id}:{len(anomalies)}")
                log_event(session, tenant_id, "transaction", txn.id, "pipeline", "anomalies_detected",
                          {"anomalies": anomalies})

                evidences = retrieve_evidence(txn, inbox_items)
                hop(f"evidence:{txn.id}:{len(evidences)}")
                for ev in evidences:
                    if session.get(EvidenceRow, ev.id) is None:
                        session.add(EvidenceRow(
                            id=ev.id, tenant_id=tenant_id, txn_id=txn.id, kind=ev.kind,
                            merchant=ev.merchant, amount=ev.amount, txn_date=ev.txn_date,
                            match_score=ev.match_score, summary_redacted=ev.summary_redacted,
                        ))
                session.flush()
                log_event(session, tenant_id, "transaction", txn.id, "pipeline", "evidence_retrieved",
                          {"count": len(evidences)})

                customers = _customers_for(session, tenant_id)
                proposal = classify(txn, evidences, customers, chart)
                hop(f"classify:{txn.id}:{proposal.recommended_action}:{proposal.confidence}")
                log_event(session, tenant_id, "transaction", txn.id, "classifier", "proposal",
                          {"category": proposal.proposed_category, "confidence": proposal.confidence,
                           "action": proposal.recommended_action})

                tax_sensitive = any(a["type"] == "tax_sensitive" for a in anomalies)
                verdict = run_guardrails(txn, proposal, {
                    "suspected_duplicate": dup,
                    "tax_sensitive": tax_sensitive,
                    "evidences": evidences,
                })
                hop(f"guardrails:{txn.id}:safe={verdict.safe_to_post}")
                log_event(session, tenant_id, "transaction", txn.id, "guardrails", "verdict",
                          {"safe": verdict.safe_to_post, "violations": verdict.violations})

                # udhaari auto-apply: credit txn matching customer with outstanding balance
                if txn.direction == "credit":
                    m = match_udhaari_payment(txn, customers)
                    if m is not None:
                        try:
                            cust_row = session.get(CustomerRow, m["id"])
                            if cust_row is not None and Decimal(str(cust_row.balance_owed)) > 0:
                                new_bal = apply_partial_payment(session, m["id"], txn.amount, txn.id)
                                hop(f"udhaari:applied:{m['id']}:{new_bal}")
                                log_event(session, tenant_id, "customer", m["id"], "pipeline", "udhaari_payment",
                                          {"txn_id": txn.id, "balance_after": str(new_bal)})
                        except Exception as e:
                            errors.append(str(e))

                # route
                if verdict.safe_to_post and proposal.confidence >= settings.AUTO_POST_CONFIDENCE:
                    post_ledger_update(session, txn, proposal, verdict)
                    auto_posted += 1
                    hop(f"route:posted:{txn.id}")
                    log_event(session, tenant_id, "transaction", txn.id, "pipeline", "auto_posted", {})
                elif proposal.confidence >= settings.QUICK_CONFIRM_THRESHOLD and not verdict.safe_to_post:
                    # whatsapp nudge (also for udhaari quick_confirm)
                    try:
                        body = (f"FinPilot: Rs.{txn.amount} from {txn.merchant or 'unknown'} "
                                f"({txn.descriptor[:40]}). Confirm category: {proposal.proposed_category}?")
                        send_nudge(session, "owner", body, ["Confirm", "Edit", "Skip"], txn.id, tenant_id)
                        nudges += 1
                        trow = session.get(TransactionRow, txn.id)
                        if trow is not None:
                            trow.status = "nudged"
                            trow.confidence = proposal.confidence
                        hop(f"route:nudged:{txn.id}")
                        log_event(session, tenant_id, "transaction", txn.id, "pipeline", "nudge_sent", {})
                    except Exception as e:
                        errors.append(str(e))
                        manual += 1
                elif proposal.recommended_action == "quick_confirm" and proposal.confidence >= settings.QUICK_CONFIRM_THRESHOLD:
                    try:
                        body = (f"FinPilot: Rs.{txn.amount} from {txn.merchant or 'unknown'}. "
                                f"Is this {proposal.proposed_category}?")
                        send_nudge(session, "owner", body, ["Confirm", "Edit", "Skip"], txn.id, tenant_id)
                        nudges += 1
                        trow = session.get(TransactionRow, txn.id)
                        if trow is not None:
                            trow.status = "nudged"
                            trow.confidence = proposal.confidence
                        hop(f"route:nudged:{txn.id}")
                        log_event(session, tenant_id, "transaction", txn.id, "pipeline", "nudge_sent", {})
                    except Exception as e:
                        errors.append(str(e))
                        manual += 1
                else:
                    manual += 1
                    trow = session.get(TransactionRow, txn.id)
                    if trow is not None:
                        trow.status = "pending_review"
                        trow.confidence = proposal.confidence
                    hop(f"route:manual:{txn.id}")
                    log_event(session, tenant_id, "transaction", txn.id, "pipeline", "manual_review_queued", {})
                session.flush()
            except Exception as e:
                errors.append(f"{raw.get('id')}: {e}")
    session.commit()
    log_event(session, tenant_id, "sync", tenant_id, "pipeline", "sync_completed",
              {"ingested": ingested, "auto_posted": auto_posted})
    session.commit()
    return SyncRunResult(
        tenant_id=tenant_id, ingested=ingested, sources=sources,
        auto_posted=auto_posted, nudges=nudges, manual_review=manual,
        node_transitions=transitions, errors=errors,
    )
