import { expect, test } from "@playwright/test";
import { bumpDefect, resetDefects, seedDefects, setSession } from "./fixtures";

test.describe("assign a defect and change its status", () => {
  test.beforeEach(async ({ request }) => {
    await seedDefects(request, 45);
    await resetDefects(request);
  });

  test("assigns a person, listing only tester/manager/lead plus Unassigned (AC 1, 2, 14-16)", async ({ page }) => {
    await page.goto("/defects/DEF-101");
    await page.getByRole("button", { name: "Assign" }).click();
    await expect(page.getByRole("menu", { name: /assign/i })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Unassigned" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Dev Dan" })).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Sam Ortiz" }).click();
    await expect(page.getByText("Assignee: Sam Ortiz")).toBeVisible();
    await page.getByRole("button", { name: "Assign" }).click();
    await page.getByRole("menuitem", { name: "Unassigned" }).click();
    await expect(page.getByText("Assignee: Unassigned")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Assignee: Unassigned")).toBeVisible();
  });

  test("changes status with exactly three choices, including closed to open (AC 3, 4, 8, 9)", async ({ page }) => {
    await page.goto("/defects/DEF-101");
    await page.getByRole("button", { name: "Change status" }).click();
    await expect(page.getByRole("menuitem")).toHaveText(["Open", "In progress", "Closed"]);
    await page.getByRole("menuitem", { name: "Closed" }).click();
    await expect(page.getByTestId("defect-status")).toHaveText(/Closed/);
    await page.getByRole("button", { name: "Change status" }).click();
    await page.getByRole("menuitem", { name: "Open" }).click();
    await expect(page.getByTestId("defect-status")).toHaveText(/Open/);
  });

  test("a viewer without a role cannot use the controls (AC 5)", async ({ page, request }) => {
    await setSession(request, "developer");
    await page.goto("/defects/DEF-101");
    await expect(page.getByRole("button", { name: "Assign" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Change status" })).toBeDisabled();
    await expect(page.getByText(/only testers, managers and leads/i)).toBeVisible();
  });

  test("a failed save shows a persistent alert and changes nothing (AC 6, 7)", async ({ page }) => {
    await page.goto("/defects/DEF-FAIL");
    await page.getByRole("button", { name: "Change status" }).click();
    await page.getByRole("menuitem", { name: "Closed" }).click();
    const alert = page.getByTestId("status-group").getByRole("alert");
    await expect(alert).toContainText(/couldn't save the status/i);
    await page.waitForTimeout(1000);
    await expect(alert).toBeVisible();
    await page.getByRole("button", { name: "Assign" }).click();
    await page.getByRole("menuitem", { name: "Sam Ortiz" }).click();
    await expect(page.getByTestId("assign-group").getByRole("alert")).toContainText(/couldn't save the assignee/i);
    await page.reload();
    await expect(page.getByText("Assignee: Dana Lee")).toBeVisible();
    await expect(page.getByTestId("defect-status")).toHaveText(/Open/);
  });

  test("a stale save warns and keeps the other person's change (AC 10, 11)", async ({ page, request }) => {
    await page.goto("/defects/DEF-101");
    await bumpDefect(request, "DEF-101", { assignee: "Lee Chen" });
    await page.getByRole("button", { name: "Assign" }).click();
    await page.getByRole("menuitem", { name: "Sam Ortiz" }).click();
    await expect(page.getByRole("alert")).toContainText(/someone else changed this defect/i);
    await expect(page.getByText("Assignee: Lee Chen")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Assignee: Lee Chen")).toBeVisible();
  });

  test("an expired session disables the controls and explains why (AC 12, 13)", async ({ page, request }) => {
    await page.goto("/defects/DEF-101");
    await setSession(request, "expired");
    await page.getByRole("button", { name: "Assign" }).click();
    await page.getByRole("menuitem", { name: "Sam Ortiz" }).click();
    await expect(page.getByRole("alert")).toContainText(/can no longer assign this defect or change its status/i);
    await expect(page.getByRole("button", { name: "Assign" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Change status" })).toBeDisabled();
  });

  test("works by keyboard and fits a phone (accessibility)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/defects/DEF-101");
    const trigger = page.getByRole("button", { name: "Assign" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Unassigned" })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem").nth(1)).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
