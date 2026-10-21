import { expect, test } from "@playwright/test";

test("home page shows greeting", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello, World!");
});
