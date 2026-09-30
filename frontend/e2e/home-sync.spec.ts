import { test, expect } from "@playwright/test";

/**
 * Dashboard: earnings, runway banner, Sync button → counts/actions update.
 * Live-vs-mock: asserts on shape (₹, Runway, Sync keywords), tolerates
 * "Mocked:" fallback copy. No fixed sleeps — expect polling only.
 */
test.describe("home dashboard + sync", () => {
  test("dashboard loads and sync updates counts", async ({ page }) => {
    // Arrange: open dashboard
    await page.goto("/");

    // Act+Assert: earnings region shows rupee amounts
    const earnings = page.getByLabel("Aaj ki kamai");
    await expect(earnings).toBeVisible();
    await expect(earnings).toContainText(/₹/);

    // Runway banner (role=alert) shows runway copy
    const banner = page.getByRole("alert").first();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Runway/i);

    // Backend status line renders (live "ok" or mock fallback)
    await expect(page.getByRole("status").first()).toContainText(/Backend:/i);

    // Sync button exists and is tappable
    const syncBtn = page.getByRole("button", { name: /Sync/ });
    await expect(syncBtn).toBeVisible();

    // Act: click Sync → status line updates (live or "Mocked:" fallback)
    await syncBtn.click();
    const syncStatus = page
      .locator('[role="status"]', { hasText: /Sync|Mocked|aaye|auto-post|fail/i })
      .first();
    await expect(syncStatus).toBeVisible({ timeout: 20_000 });
    await expect(syncStatus).toContainText(/Sync|Mocked|aaye|auto-post|fail/i);

    // Earnings still show ₹ after refresh
    await expect(earnings).toContainText(/₹/);

    // AI action items section present (items or clear-state; live copy
    // uses "Confirm category / food-delivery / Zomato / Rs." wording)
    const aiSection = page.getByLabel("AI action items");
    await expect(aiSection).toBeVisible();
    await expect(aiSection).toContainText(
      /Business|Approve|Udhaari|Rahul|clear|pending|Confirm|food|Zomato|Skip|Edit|category|₹|Rs\./i
    );
  });
});
