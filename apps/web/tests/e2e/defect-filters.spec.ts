import { expect, test } from "@playwright/test";
import { seedDefects } from "./fixtures";

test.describe("defect list filters, 45 defects", () => {
  test.beforeEach(async ({ page, request }) => {
    await seedDefects(request, 45);
    await page.goto("/defects");
  });

  test("search updates per keystroke with no Apply button (AC 1, 5, 14)", async ({ page }) => {
    const rows = page.locator("tbody tr");
    await expect(page.getByRole("button", { name: /apply/i })).toHaveCount(0);
    await expect(rows).toHaveCount(20);
    await page.getByRole("searchbox", { name: "Search defects" }).pressSequentially("DEF-10");
    await expect(rows.first()).toContainText("DEF-10");
    expect(await rows.count()).toBeLessThan(20);
  });

  test("Open and Closed chips together exclude in progress (AC 15, 19)", async ({ page }) => {
    await page.getByRole("button", { name: "Closed" }).click();
    await page.getByRole("button", { name: "Open" }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible();
    await expect(page.locator("tbody").getByText("In progress")).toHaveCount(0);
  });

  test("severity and area combine with status (AC 3, 4, 6, 7)", async ({ page }) => {
    await page.getByRole("combobox", { name: "Severity" }).selectOption("high");
    await page.getByRole("combobox", { name: "Area" }).selectOption("Login");
    await page.getByRole("button", { name: "Open" }).click();
    const rows = page.locator("tbody tr");
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      const cells = rows.nth(i).locator("td");
      await expect(cells.nth(1)).toContainText("Open");
      await expect(cells.nth(2)).toContainText("High");
      await expect(cells.nth(3)).toContainText("Login");
    }
  });

  test("no match shows a message and Clear filters resets (AC 9, 10, 16-18)", async ({ page }) => {
    const search = page.getByRole("searchbox", { name: "Search defects" });
    await search.fill("payroll");
    await page.getByRole("button", { name: "Closed" }).click();
    await expect(page.getByRole("heading", { name: "No defects match your search." })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(search).toHaveValue("");
    await expect(page.locator("button[aria-pressed='true']")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Severity" })).toHaveValue("");
    await expect(page.getByRole("combobox", { name: "Area" })).toHaveValue("");
    await expect(page.locator("tbody tr")).toHaveCount(20);
  });

  test("counts do not change while filtering (AC 11)", async ({ page }) => {
    const counts = page.getByLabel("Defect counts");
    const before = await counts.textContent();
    await page.getByRole("searchbox", { name: "Search defects" }).fill("DEF-1");
    await page.getByRole("button", { name: "Open" }).click();
    await expect(counts).toHaveText(before ?? "");
  });

  test("select options are the fixed lists (AC 12, 13)", async ({ page }) => {
    const opts = (name: string) => page.getByRole("combobox", { name }).locator("option").allTextContents();
    expect(await opts("Severity")).toEqual(["All", "Low", "Medium", "High", "Critical"]);
    expect(await opts("Area")).toEqual(["All", "Login", "Billing", "Reports", "Other"]);
  });
});
