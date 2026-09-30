"""End-to-end pipeline test: run_sync over deterministic mocked connectors."""
from decimal import Decimal

from sqlalchemy import select

from backend.app.db import AuditRow, CustomerRow, LedgerRow, TransactionRow
from backend.app.pipeline import run_sync


def test_run_sync_ingests_all_sources(db_session):
    # Arrange: fresh seeded DB (Rahul owes 1200)
    # Act
    result = run_sync(db_session)
    # Assert: all three mocked sources touched, bank+gateway ingested
    assert result.ingested >= 3
    assert set(result.sources) == {"bank", "gateway"}
    assert sum(result.sources.values()) == result.ingested
    assert any("fetch:" in t for t in result.node_transitions)


def test_run_sync_auto_posts_and_nudges(db_session):
    # Arrange + Act
    result = run_sync(db_session)
    # Assert
    assert result.auto_posted >= 1
    assert result.nudges >= 1
    posted = db_session.execute(
        select(TransactionRow).where(TransactionRow.status == "posted")
    ).scalars().all()
    assert len(posted) == result.auto_posted
    ledger = db_session.execute(select(LedgerRow)).scalars().all()
    assert len(ledger) == result.auto_posted


def test_run_sync_applies_rahul_udhaari_payment(db_session):
    # Arrange: Rahul owes Rs.1200
    assert Decimal(str(db_session.get(CustomerRow, "cust-rahul").balance_owed)) == Decimal("1200.00")
    # Act
    run_sync(db_session)
    # Assert: Rs.500 UPI receipt applied -> Rs.700 remains
    assert Decimal(str(db_session.get(CustomerRow, "cust-rahul").balance_owed)) == Decimal("700.00")


def test_audit_covers_pipeline_stages(db_session):
    # Arrange + Act
    run_sync(db_session)
    # Assert: audit trail spans ingestion -> ledger routing
    actions = {
        r.action
        for r in db_session.execute(select(AuditRow)).scalars().all()
    }
    for expected in (
        "normalized",
        "anomalies_detected",
        "evidence_retrieved",
        "proposal",
        "verdict",
        "sync_completed",
    ):
        assert expected in actions
    assert actions & {"auto_posted", "nudge_sent", "manual_review_queued"}


def test_resync_is_idempotent_no_dupes(db_session):
    # Arrange
    first = run_sync(db_session)
    ledger_before = len(db_session.execute(select(LedgerRow)).scalars().all())
    txns_before = len(db_session.execute(select(TransactionRow)).scalars().all())
    # Act: second identical sync
    second = run_sync(db_session)
    # Assert: nothing new ingested, ledger unchanged, udhaari not double-applied
    assert second.ingested == 0
    assert len(db_session.execute(select(LedgerRow)).scalars().all()) == ledger_before
    assert len(db_session.execute(select(TransactionRow)).scalars().all()) == txns_before
    assert Decimal(str(db_session.get(CustomerRow, "cust-rahul").balance_owed)) == Decimal("700.00")
    assert first.ingested > 0
