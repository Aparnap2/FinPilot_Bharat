"""API end-to-end tests over the FastAPI TestClient (mocked, no network)."""


def test_health(client):
    # Arrange + Act
    resp = client.get("/health")
    # Assert
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_sync_lists_and_details(client):
    # Arrange + Act: run sync then list
    synced = client.post("/api/sync")
    assert synced.status_code == 200
    assert synced.json()["ingested"] >= 3

    listed = client.get("/api/transactions")
    # Assert
    assert listed.status_code == 200
    body = listed.json()
    assert body["count"] == synced.json()["ingested"]
    first_id = body["transactions"][0]["id"]

    detail = client.get(f"/api/transactions/{first_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == first_id
    assert "evidence" in detail.json() and "ledger" in detail.json()


def test_approve_posts_ledger(client):
    # Arrange
    client.post("/api/sync")
    pending = [
        t for t in client.get("/api/transactions").json()["transactions"]
        if t["status"] != "posted"
    ]
    assert pending, "expected at least one non-posted txn to approve"
    txn_id = pending[0]["id"]
    # Act
    resp = client.post(f"/api/transactions/{txn_id}/approve", json={"approved": True, "category_override": "sales"})
    # Assert
    assert resp.status_code == 200
    assert resp.json()["status"] == "posted"
    assert client.get(f"/api/transactions/{txn_id}").json()["status"] == "posted"


def test_quick_sale_cash_and_udhaari(client):
    # Arrange + Act: cash sale posts straight to ledger
    cash = client.post("/api/quick-sale", json={"amount": "250", "payment_type": "cash", "note": "Counter"})
    assert cash.status_code == 200
    assert cash.json()["status"] == "posted"

    # Act: udhaari sale raises Priya's balance 0 -> 300
    credit = client.post(
        "/api/quick-sale",
        json={"amount": "300", "payment_type": "udhaari", "customer_id": "cust-priya", "note": "Rice bag"},
    )
    # Assert
    assert credit.status_code == 200
    customers = {c["id"]: c for c in client.get("/api/customers").json()["customers"]}
    assert customers["cust-priya"]["balance_owed"] == "300.00"


def test_customer_payment_and_remind_rate_limit(client):
    # Arrange: Priya owes 300 after a credit sale
    client.post(
        "/api/quick-sale",
        json={"amount": "300", "payment_type": "udhaari", "customer_id": "cust-priya", "note": "Rice bag"},
    )
    # Act: partial payment 300 - 100 = 200
    paid = client.post("/api/customers/cust-priya/payment", json={"amount": "100"})
    # Assert
    assert paid.status_code == 200
    assert paid.json()["balance_owed"] == "200.00"

    # Act: first reminder ok, second within the hour rate-limited
    first = client.post("/api/customers/cust-rahul/remind")
    assert first.status_code == 200
    assert "message_id" in first.json()
    second = client.post("/api/customers/cust-rahul/remind")
    assert second.status_code == 429


def test_whatsapp_respond_transitions_state(client):
    # Arrange
    client.post("/api/sync")
    actions = client.get("/api/actions").json()
    assert actions["count"] >= 1
    mid = actions["actions"][0]["id"]
    # Act
    resp = client.post(f"/api/actions/{mid}/respond", json={"reply": "Confirm"})
    # Assert: pending -> responded
    assert resp.status_code == 200
    assert resp.json()["status"] == "responded"
    outbox = {m["id"]: m for m in client.get("/api/whatsapp/outbox").json()["messages"]}
    assert outbox[mid]["status"] == "responded"
    assert outbox[mid]["reply"] == "Confirm"


def test_digest_and_audit_filter(client):
    # Arrange
    client.post("/api/sync")
    # Act
    digest = client.get("/api/digest/daily")
    # Assert: runway math present
    assert digest.status_code == 200
    for key in ("inflows", "outflows", "balance", "runway_days", "open_udhaari"):
        assert key in digest.json()

    # Act: audit filtered to one entity only returns that entity
    audit = client.get("/api/audit", params={"entity_id": "txn-clean-001"})
    assert audit.status_code == 200
    assert audit.json()["count"] >= 1
    assert all(e["entity_id"] == "txn-clean-001" for e in audit.json()["events"])


def test_eval_endpoint_runs_harness(client):
    # Arrange + Act
    resp = client.get("/api/eval/run")
    # Assert
    assert resp.status_code == 200
    body = resp.json()
    for key in ("automation_rate", "classification_accuracy", "false_auto_post_rate", "guardrail_catch_rate"):
        assert key in body
