import { expect, test } from "@playwright/test";
import { seedPortfolio } from "./fixtures";

test.afterEach(async ({ request }) => {
  await seedPortfolio(request, "default");
});

test("dashboard shows every block on one page", async ({ page, request }) => {
  await seedPortfolio(request, "default");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expect(page.getByTestId("portfolio-value")).toContainText("₹1,00,000");
  await expect(page.getByTestId("todays-change")).toContainText("+₹1,250");
  await expect(page.getByTestId("active-sips")).toContainText("2");
  await expect(page.getByRole("heading", { name: "Upcoming SIPs" })).toBeVisible();
  await expect(page.locator(".plain-list li")).toHaveCount(2);
  await expect(page.locator("tbody tr")).toHaveCount(3);
});

test("holdings rows are display only", async ({ page, request }) => {
  await seedPortfolio(request, "default");
  await page.goto("/");
  await expect(page.locator("tbody tr").first().locator("a, button")).toHaveCount(0);
  await page.locator("tbody tr").first().click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("shows a retryable failure when the API fails", async ({ page, request }) => {
  await seedPortfolio(request, "failing");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText("We couldn't load your dashboard.");
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
});
