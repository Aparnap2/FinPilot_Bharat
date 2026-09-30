import { defineConfig, devices } from "@playwright/test";

/**
 * FinPilot Bharat v1 MVP — Playwright e2e (mock-tolerant).
 * - baseURL: http://localhost:3000 (Next.js dev)
 * - webServer: backend (uvicorn :8000) + frontend (next dev :3000)
 * - reuseExistingServer: true so local `python3 -m uvicorn ...` + `pnpm dev`
 *   sessions are reused in dev; CI boots both from scratch.
 * - Live-vs-mock: specs assert on contract SHAPE (regex/contains, ₹ symbol,
 *   badge keywords) not exact rupee values, so they pass against the live
 *   FastAPI backend AND the api.ts mock fallback (copy prefixed "Mocked:").
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "python3 -m uvicorn backend.app.main:app --port 8000",
      cwd: "..",
      port: 8000,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm dev --port 3000",
      port: 3000,
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { NEXT_PUBLIC_API_URL: "http://localhost:8000" },
    },
  ],
});
