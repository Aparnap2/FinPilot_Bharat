# FinPilot Bharat — v1 MVP (fully mocked, e2e testable, no LLM)

Autonomous AI fractional CFO & reconciliation agent for Indian SMEs — v1 runs end-to-end with **deterministic mocks** (no LLM, no real bank/inbox/WhatsApp calls).

## What v1 does
- Ingests mocked bank/gateway/inbox/ledger data → normalizes (Decimal ₹, UTC, UPI parser) → deterministic anomaly detection → bounded evidence match → **rule-based mocked classifier** (structured proposal + confidence) → guardrail engine (3 autonomy levels) → idempotent ledger post or WhatsApp quick-reply nudge → udhaari partial-payment reconciliation → audit log + deterministic digest/runway.
- Mobile-first Next.js UI: dashboard, udhaari ledger, quick-sale keypad, AI action center, transactions feed, explainability view, settings/consent. Works standalone with mock fallback when backend is down.
- Eval harness: 21-case golden dataset (33% adversarial), regression gates (false-auto-post ≤1%, 100% must-block caught).

## Quickstart (3 terminals)
```bash
# 1. Backend (http://localhost:8000)
pip install -r backend/requirements.txt
python3 -m uvicorn backend.app.main:app --port 8000

# 2. Frontend (http://localhost:3000)
cd frontend && pnpm install && NEXT_PUBLIC_API_URL=http://localhost:8000 pnpm dev

# 3. Trigger a sync run
curl -X POST http://localhost:8000/api/sync
```

## Verify e2e
```bash
python3 -m pytest tests/ -q          # 50 tests
python3 -m evals.harness             # eval gates, writes evals/report.json/.md
curl http://localhost:8000/api/digest/daily
cd frontend && pnpm build
bash scripts/run_all.sh              # pytest + eval
bash scripts/demo.sh                 # 15-step portfolio demo
```

## Mockoon sandbox
Import `mockoon/finpilot-mockoon.json` into Mockoon (port 3001) — bank, gateway, inbox, ledger, WhatsApp mocks mirroring `mockoon/seed/*.json`. Backend connectors read the same seed files, so e2e works with or without Mockoon running.

## Repo map
`backend/app/` pipeline (upi → normalize → anomaly → evidence → classifier → guardrails → ledger/udhaari/whatsapp → audit/digest/pipeline) · `backend/app/api/routes.py` (16 endpoints) · `frontend/app/` (7 screens) + `frontend/lib/api.ts` · `tests/` (50 e2e) · `evals/` (golden + harness) · `mockoon/` · `scripts/`

## Demo flow
Sync → 1 clean txn auto-posts → ambiguous UPI flagged → inbox receipt matched → proposal + guardrail verdict → WhatsApp nudge for ₹899 missing receipt → quick-reply updates state → ₹500 UPI clears Rahul's ₹1200 udhaari → ₹700 → explainability drawer + audit trail + eval report.
