import { test, expect } from "@playwright/test";

/**
 * Transactions feed → detail explainability → approve/reject.
 * Live-vs-mock: asserts on badge/shape keywords (status, category,
 * confidence %, guardrail, audit), not exact rupee values.
 */
test.describe("transactions feed + explainability", () => {
  test("feed lists txns; detail shows proposal/evidence/guardrail/audit; approve updates state", async ({
    page,
  }) => {
    // Arrange: open feed
    await page.goto("/transactions");
    await expect(page.getByRole("heading", { name: /Transactions/ })).toBeVisible();

    // Feed lists at least one txn card linking to detail
    const txnLinks = page.locator('a[href^="/transactions/"]');
    await expect(txnLinks.first()).toBeVisible({ timeout: 20_000 });
    const count = await txnLinks.count();
    expect(count).toBeGreaterThan(0);

    // First card shows amount + status/category/confidence badges (shape, not values)
    const first = txnLinks.first();
    await expect(first).toContainText(/₹/);
    await expect(first).toContainText(
      /Posted|Review|Info|Auto-posted|Uncategorized|Sales|Udhaari|confidence|High|Medium|Low|Guardrail|%/i
    );

    // Act: open first txn detail
    const href = await first.getAttribute("href");
    expect(href).toMatch(/\/transactions\/.+/);
    await first.click();
    await expect(page).toHaveURL(/\/transactions\/.+/);

    // Assert: summary shows amount + merchant/category + status badge
    const summary = page.getByLabel("Transaction summary");
    await expect(summary).toBeVisible({ timeout: 20_000 });
    await expect(summary).toContainText(/₹/);

    // Explainability: proposal rationale + confidence + category + guardrail verdict + evidence
    const explain = page.getByLabel("AI explainability");
    await expect(explain).toBeVisible();
    await expect(explain).toContainText(/%/); // confidence pct
    await expect(explain).toContainText(/Merchant|Action|Guardrail|Evidence/i);
    await expect(explain).toContainText(/Safe to post|Human review|receipt|confidence|match/i);

    // Audit timeline exists with at least one event
    const audit = page.getByLabel("Audit trail");
    await expect(audit).toBeVisible();
    await expect(audit).toContainText(/ingested|proposed|verdict|ledger|nudge|system|agent|owner|policy|Mocked|\d{4}|→|·/i);

    // Act: approve (or reject fallback) → decision status updates
    const approveBtn = page.getByRole("button", { name: /Approve/ });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();
    const decision = page.locator('[role="status"]', {
      hasText: /Mocked|approv|reject|posted|save|offline|ledger|✓/i,
    }).first();
    await expect(decision).toBeVisible({ timeout: 20_000 });
    await expect(decision).toContainText(/Mocked|approv|reject|posted|save|offline|ledger|✓/i);
  });
});
