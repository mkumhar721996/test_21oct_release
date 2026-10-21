import { expect, test } from "@playwright/test";
import { seedDefects, setApiFailing } from "./fixtures";

test.afterEach(async ({ request }) => {
  await seedDefects(request, 45);
});

test.describe("empty state", () => {
  test("guides the user to report the first defect", async ({ page, request }) => {
    await seedDefects(request, 0);
    await page.goto("/defects");
    await expect(page.getByRole("heading", { level: 1, name: "Defect list, nothing reported" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Defects" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.getByRole("link", { name: "Report a defect" }).click();
    await expect(page).toHaveURL(/\/defects\/new$/);
  });
});

test.describe("load failure", () => {
  test("replaces the table with a message, keeps the top bar and New defect", async ({ page, request }) => {
    await setApiFailing(request, "on");
    await page.goto("/defects?page=3&sort=asc");
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("We couldn't load the defect list.");
    await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.locator("table")).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Defects" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
    await page.getByRole("link", { name: "New defect" }).click();
    await expect(page).toHaveURL(/\/defects\/new$/);
  });

  test("a malformed response is a load failure too", async ({ page, request }) => {
    await setApiFailing(request, "malformed");
    await page.goto("/defects");
    await expect(page.getByRole("alert")).toContainText("We couldn't load the defect list.");
  });

  test("Try again says so when it still fails, then loads once the API recovers", async ({ page, request }) => {
    await setApiFailing(request, "on");
    await page.goto("/defects?page=3&sort=asc");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("alert")).toContainText("It still didn't load");
    await setApiFailing(request, "off");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(5);
    await expect(page).toHaveURL(/page=3/);
  });

  test("Try again moves to the empty state when nothing is reported", async ({ page, request }) => {
    await setApiFailing(request, "on");
    await page.goto("/defects");
    await seedDefects(request, 0);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Defect list, nothing reported" })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("fits a phone width", async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await setApiFailing(request, "on");
    await page.goto("/defects");
    await expect(page.getByRole("button", { name: "Try again" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
