# FinPilot Bharat — Playwright e2e (mock-tolerant)

Browser end-to-end specs for the v1 MVP. They run against the **live FastAPI
backend** when it is up, and degrade to the **`api.ts` mock fallback**
(copy prefixed `Mocked:`) when it is down — assertions check contract
**shape** (₹ symbol, badge keywords, status words), never exact rupee values.

## Run steps

```bash
# 1. Backend deps (first choice uv, fallback pip3 — python3 only)
uv pip install -r backend/requirements.txt   # or: pip3 install --break-system-packages -r backend/requirements.txt

# 2. Start backend (:8000) + frontend (:3000) — or let Playwright boot them
python3 -m uvicorn backend.app.main:app --port 8000 &
cd frontend && pnpm install && pnpm dev --port 3000 &

# 3. Install browsers once
pnpm exec playwright install chromium

# 4. Run headless Chromium e2e (GREEN gate)
pnpm exec playwright test
# or: pnpm test:e2e
```

`playwright.config.ts` boots both servers itself (`reuseExistingServer: true`),
so step 2 is optional when running via Playwright.

## Flows (4 specs)

| Spec | Route(s) | What it proves |
|---|---|---|
| `e2e/home-sync.spec.ts` | `/` | Earnings ₹, runway banner, Sync → counts/actions update |
| `e2e/transactions.spec.ts` | `/transactions`, `/transactions/[id]` | Feed badges → explainability (proposal/confidence/evidence/guardrail/audit) → approve |
| `e2e/udhaari-whatsapp.spec.ts` | `/udhaari`, `/actions` | Rahul listed → ₹500 payment toast + same-or-lower balance → remind → outbox → quick-reply resolve |
| `e2e/quick-sale.spec.ts` | `/sale`, `/transactions` | Keypad 250 + Cash/UPI/Udhaari → save toast (+ best-effort feed check) |

Rules: no flaky `sleep` (expect polling only), `workers: 1`, screenshot on
failure, trace on first retry.

## Live-vs-mock notes

- **Live** (`NEXT_PUBLIC_API_URL=http://localhost:8000`, backend up):
  `api.ts` normalizes the FastAPI shapes (`{count, transactions|customers|
  actions|messages}`, string amounts, `{id,status,…}` mutations) into the UI
  contract. Balances persist (payment lowers udhaari), quick-sales appear in
  the feed, approve flips status to `posted`.
- **Mock** (backend down): every `api.ts` call returns inline fixtures
  (`mockDigest`, `mockTransactions`, …) with messages like
  `Mocked: ₹250 cash sale saved ✓`. Nothing persists — payment does **not**
  lower the fixture balance, quick-sales do **not** appear in the feed — so
  specs assert the **toast** plus a same-or-decreased balance, never a strict
  delta or exact total.
- If you see `Mocked:` toasts with the backend running, check
  `NEXT_PUBLIC_API_URL` and `GET /health`.
