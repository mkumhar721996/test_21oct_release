import { expect, test } from "@playwright/test";
import { seedDefects } from "./fixtures";

test.describe("defect details", () => {
  test.beforeEach(async ({ request }) => {
    await seedDefects(request, 45);
  });

  test("opens from the list and goes back (AC 1-8, 12, 13)", async ({ page }) => {
    await page.goto("/defects");
    await page.locator("a.row-link").first().click();
    await expect(page).toHaveURL(/\/defects\/DEF-\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("DEF-");
    await expect(page.getByText("Assignee: Dana Lee")).toBeVisible();
    await expect(page.getByRole("link", { name: "screenshot.png" })).toBeVisible();
    await expect(page.getByText("Reproduced on 17.1")).toBeVisible();
    await expect(page.getByRole("button", { name: /assign|change status/i })).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(1);
    await page.getByRole("link", { name: /back to list/i }).click();
    await expect(page).toHaveURL(/\/defects$/);
    await expect(page.getByRole("heading", { name: "Defects", level: 1 })).toBeVisible();
  });

  test("empty states and Unassigned (AC 9, 15, 16)", async ({ page }) => {
    await page.goto("/defects/DEF-NOATT");
    await expect(page.getByText("No attachments yet")).toBeVisible();
    await expect(page.getByText("No comments yet")).toBeVisible();
    await expect(page.getByText("Assignee: Unassigned")).toBeVisible();
  });

  test("not found links back to the list (AC 11, 14)", async ({ page }) => {
    await page.goto("/defects/NOPE");
    await expect(page.getByText("Defect not found")).toBeVisible();
    await page.getByRole("alert").getByRole("link").click();
    await expect(page).toHaveURL(/\/defects$/);
  });

  test("load failure shows a persistent error (AC 17, 18)", async ({ page }) => {
    await page.goto("/defects/DEF-BOOM");
    const alert = page.getByRole("alert").filter({ hasText: /couldn't load/i });
    await expect(alert).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(alert).toBeVisible();
    await expect(alert.getByRole("link")).toHaveAttribute("href", "/defects");
  });
});
