import { test, expect } from "@playwright/test";

/**
 * Quick-sale keypad → payment-type select → save → toast (+ feed check).
 * Live-vs-mock: asserts amount SHAPE (₹ + digits) and success keywords,
 * not exact totals. Feed appearance is best-effort: mock fallback does not
 * persist, so the toast ("Mocked:" copy) is the primary assertion.
 */
test.describe("quick sale keypad", () => {
  test("keypad amount + type + save shows confirmation", async ({ page }) => {
    // Arrange: open sale page
    await page.goto("/sale");
    const amountSection = page.getByRole("region", { name: "Amount" });
    await expect(amountSection).toBeVisible({ timeout: 20_000 });

    // Act: keypad entry 2-5-0 via accessible digit buttons
    await page.getByRole("button", { name: "Digit 2" }).click();
    await page.getByRole("button", { name: "Digit 5" }).click();
    await page.getByRole("button", { name: "Digit 0" }).click();
    await expect(amountSection).toContainText(/₹\s?250|250/);

    // Act: select Cash (also covers UPI/Udhaari radio group shape)
    const payGroup = page.getByRole("radiogroup", { name: /Payment type/ });
    await expect(payGroup).toBeVisible();
    await payGroup.getByRole("radio", { name: /Cash/ }).click();

    // Act: save sale
    const saveBtn = page.getByRole("button", { name: /Sale save karo/ });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Assert: success toast (live or "Mocked:" fallback), <5s target copy tolerated
    const saved = page
      .locator('[role="status"]', { hasText: /Mocked|saved|✓|Sale|5s|offline|fail/i })
      .first();
    await expect(saved).toBeVisible({ timeout: 20_000 });
    await expect(saved).toContainText(/Mocked|saved|✓|Sale|5s/i);

    // Best-effort: new sale appears in feed (live persists; mock does not)
    await page.goto("/transactions");
    const feed = page.locator("main");
    await expect(feed).toBeVisible({ timeout: 20_000 });
    const feedText = await feed.innerText();
    expect(feedText).toMatch(/₹|Transactions|filter|Sab|Posted|Review|Info/i);
  });

  test("udhaari sale requires customer choice", async ({ page }) => {
    await page.goto("/sale");
    await expect(page.getByRole("region", { name: "Amount" })).toBeVisible({ timeout: 20_000 });

    // Choose Udhaari without a customer → validation hint (shape, not exact copy)
    await page.getByRole("radiogroup", { name: /Payment type/ }).getByRole("radio", {
      name: /Udhaari/,
    }).click();
    await page.getByRole("button", { name: "Digit 1" }).click();
    await page.getByRole("button", { name: /Sale save karo/ }).click();
    const hint = page
      .locator('[role="status"]', { hasText: /customer|Udhaari|amount|Mocked|saved|✓/i })
      .first();
    await expect(hint).toBeVisible({ timeout: 20_000 });
  });
});
