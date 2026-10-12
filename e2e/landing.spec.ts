import { test, expect } from "@playwright/test";

test("landing links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("K200 Trading Journal")).toBeVisible();
});
