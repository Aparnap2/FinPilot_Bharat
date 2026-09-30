# FinPilot Bharat — Frontend (v1 MVP, mocked)

Mobile-first Next.js 16 (App Router) + Tailwind v4. Works **standalone against mock fixtures** when the backend is offline, and live when `NEXT_PUBLIC_API_URL` is reachable.

## Run

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
pnpm dev --port 3000          # http://localhost:3000
pnpm build                    # quality gate — must pass
```

## Routes

| Route | Screen |
|---|---|
| `/` | Home dashboard: earnings, UPI/cash/udhaari split, AI actions, runway banner, Sync now |
| `/udhaari` | Customer ledger, balances, due dates, remind, payment, add customer |
| `/sale` | Calculator quick-sale: keypad, cash/UPI/udhaari, customer picker, note |
| `/actions` | AI action center: pending quick-replies, resolutions, WhatsApp outbox |
| `/transactions` | Feed with status/category/confidence/guardrail badges |
| `/transactions/[id]` | Explainability: proposal, rationale, evidence, guardrail, audit timeline, approve/reject |
| `/settings` | Connected sources (mocked), consent toggles, notification prefs, revoke |

## API client

`lib/api.ts` — typed fetch client for the fixed backend contract (`http://localhost:8000`):
`GET /health`, `POST /api/sync`, `GET /api/transactions`, `GET /api/transactions/{id}`,
`POST /api/transactions/{id}/approve`, `POST /api/quick-sale`, `GET|POST /api/customers`,
`POST /api/customers/{id}/payment`, `POST /api/customers/{id}/remind`,
`GET /api/actions`, `POST /api/actions/{id}/respond`, `GET /api/whatsapp/outbox`,
`GET /api/digest/daily`, `GET /api/audit?entity_id=`.

Every call has a **4s timeout + inline mock fallback** matching the contract, so the UI is always demoable. No `any`, no `console.log`, strict TS.

## PWA

- `app/manifest.ts` + `public/manifest.webmanifest`, `themeColor #047857`, viewport-fit cover.
- Offline note on Home + Settings: mock shell renders without network.

## Design

- `max-w-md` centered shell, bottom nav, min 44–56px tap targets, high-contrast, Hinglish copy, one-thumb primary actions.
