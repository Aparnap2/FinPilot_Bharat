#!/usr/bin/env bash
# FinPilot Bharat v1 MVP demo (all mocked, no network).
# Starts the API, runs a sync, and walks demo steps 1-15.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${API_PORT:-8000}"
BASE="http://127.0.0.1:${PORT}"

echo "[1/15] Starting API on :${PORT} ..."
python -m uvicorn backend.app.main:app --port "${PORT}" >/tmp/finpilot_demo.log 2>&1 &
API_PID=$!
trap 'kill ${API_PID} 2>/dev/null || true' EXIT
sleep 3

echo "[2/15] Health check"
curl -s "${BASE}/health"; echo
echo "[3/15] Running sync (ingest bank+gateway -> classify -> guardrails -> route)"
curl -s -X POST "${BASE}/api/sync" | head -c 600; echo
echo "[4/15] Listing transactions"
curl -s "${BASE}/api/transactions" | head -c 300; echo
echo "[5/15] Daily digest (runway + udhaari)"
curl -s "${BASE}/api/digest/daily"; echo
echo "[6/15] Customers (Rahul owes Rs.1200 -> Rs.700 after sync)"
curl -s "${BASE}/api/customers"; echo
echo "[7/15] Pending WhatsApp nudges"
curl -s "${BASE}/api/actions" | head -c 300; echo
echo "[8/15] WhatsApp outbox"
curl -s "${BASE}/api/whatsapp/outbox" | head -c 300; echo
echo "[9/15] Audit trail (first events)"
curl -s "${BASE}/api/audit?limit=5" | head -c 300; echo
echo "[10/15] Quick cash sale Rs.250"
curl -s -X POST "${BASE}/api/quick-sale" -H 'Content-Type: application/json' -d '{"amount":"250","payment_type":"cash","note":"Counter"}'; echo
echo "[11/15] Udhaari credit sale Rs.300 to Priya"
curl -s -X POST "${BASE}/api/quick-sale" -H 'Content-Type: application/json' -d '{"amount":"300","payment_type":"udhaari","customer_id":"cust-priya","note":"Rice bag"}'; echo
echo "[12/15] Priya partial payment Rs.100"
curl -s -X POST "${BASE}/api/customers/cust-priya/payment" -H 'Content-Type: application/json' -d '{"amount":"100"}'; echo
echo "[13/15] Polite reminder to Rahul (rate-limited 1/hour)"
curl -s -X POST "${BASE}/api/customers/cust-rahul/remind"; echo
echo "[14/15] Eval harness gate (golden dataset)"
python -m evals.harness | head -c 400; echo
echo "[15/15] Done. API log: /tmp/finpilot_demo.log (killed on exit)"
