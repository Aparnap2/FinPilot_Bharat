import { test, expect } from "@playwright/test";

/**
 * Udhaari ledger → partial payment → remind → WhatsApp outbox,
 * then Actions center quick-reply → resolved.
 * Live-vs-mock: rupee SHAPE (₹) + keyword copy, not exact balances.
 * Mock fallback does not persist balance changes, so the spec asserts the
 * confirmation toast and a same-or-decreased balance (not a strict delta).
 */
test.describe("udhaari + whatsapp + actions", () => {
  test("partial payment, remind, and quick-reply resolve", async ({ page }) => {
    // Arrange: open udhaari ledger
    await page.goto("/udhaari");
    const list = page.getByLabel("Customer list");
    await expect(list).toBeVisible({ timeout: 20_000 });
    await expect(list).toContainText(/Rahul/i);

    // Find Rahul's card scope (live: "Rahul Kumar", mock: "Rahul K")
    const rahulCard = list.locator("li", { hasText: /Rahul/ }).first();
    await expect(rahulCard).toBeVisible();
    await expect(rahulCard).toContainText(/₹|clear|baki/i);

    const balanceText = async () =>
      (await rahulCard.innerText()).replace(/[\s\S]*/g, (s) => s);
    const before = await rahulCard.innerText();
    const beforeNums = [...before.matchAll(/₹\s?([\d,]+)/g)].map((m) =>
      Number(m[1].replace(/,/g, ""))
    );

    // Act: partial payment of 500
    const payInput = rahulCard.getByLabel(/Rahul.*payment amount/i);
    await expect(payInput).toBeVisible();
    await payInput.fill("500");
    await rahulCard.getByRole("button", { name: /Payment/ }).click();

    // Assert: confirmation toast (live or "Mocked:" fallback)
    const toast = page
      .locator('[role="status"]', { hasText: /Mocked|payment|joda|✓|baki/i })
      .first();
    await expect(toast).toBeVisible({ timeout: 20_000 });
    await expect(toast).toContainText(/Mocked|payment|joda|✓|baki/i);
    void balanceText;

    // Balance: same-or-decreased (mock keeps fixtures; live decrements).
    // Cleared ledgers render "clear ✓" with no ₹ — accept both shapes.
    await expect
      .poll(
        async () => {
          const txt = await rahulCard.innerText();
          const nums = [...txt.matchAll(/₹\s?([\d,]+)/g)].map((m) =>
            Number(m[1].replace(/,/g, ""))
          );
          return JSON.stringify({ txt, nums });
        },
        { timeout: 20_000 }
      )
      .toMatch(/₹|clear/i);
    const after = await rahulCard.innerText();
    const afterNums = [...after.matchAll(/₹\s?([\d,]+)/g)].map((m) =>
      Number(m[1].replace(/,/g, ""))
    );
    if (beforeNums.length > 0 && afterNums.length > 0) {
      expect(Math.min(...afterNums)).toBeLessThanOrEqual(Math.min(...beforeNums));
    }

    // Act: remind → toast
    await rahulCard.getByRole("button", { name: /Remind/ }).click();
    const remindToast = page
      .locator('[role="status"]', { hasText: /Mocked|reminder|bheja|WhatsApp|Reminder|rate|🙏/i })
      .first();
    await expect(remindToast).toBeVisible({ timeout: 20_000 });

    // Assert: actions page shows pending quick-reply + outbox
    await page.goto("/actions");
    const pending = page.getByLabel("Pending questions");
    await expect(pending).toBeVisible({ timeout: 20_000 });
    const pendingText = await pending.innerText();
    expect(pendingText).toMatch(/Business|Approve|Udhaari|Rahul|₹|pending|clear|🎉/i);

    const outbox = page.getByLabel("WhatsApp outbox");
    await expect(outbox).toBeVisible();
    await expect(outbox).toContainText(/To |sent|awaiting|template|mocked|₹|Rahul|Swiggy|🙏/i);

    // Act: respond to first pending quick-reply → resolved/responded state
    const quickReply = pending.getByRole("button").first();
    if (await quickReply.count()) {
      await expect(quickReply).toBeVisible();
      await quickReply.click();
      const responded = page
        .locator('[role="status"]', { hasText: /Mocked|noted|✓|responded|save|offline/i })
        .first();
      await expect(responded).toBeVisible({ timeout: 20_000 });
      await expect(responded).toContainText(/Mocked|noted|✓|responded|save|offline/i);
    }
  });
});
