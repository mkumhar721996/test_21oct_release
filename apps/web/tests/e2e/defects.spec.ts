import { expect, test } from "@playwright/test";
import { seedDefects } from "./fixtures";

const rows = (page: import("@playwright/test").Page) => page.locator("tbody tr");
const firstTitle = (page: import("@playwright/test").Page) => rows(page).first().locator("a.row-link");

test.describe("defect list, 45 defects", () => {
  test.beforeEach(async ({ request }) => {
    await seedDefects(request, 45);
  });

  test("top bar, New defect and Reports navigation (AC 1, 2, 12)", async ({ page }) => {
    await page.goto("/defects");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Defects" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
    await page.getByRole("link", { name: "New defect" }).click();
    await expect(page).toHaveURL(/\/defects\/new$/);

    await page.goto("/defects");
    await nav.getByRole("link", { name: "Reports" }).click();
    await expect(page.getByRole("heading", { name: "Reports coming soon" })).toBeVisible();
  });

  test("counts are over all defects and stable across page and sort (AC 3)", async ({ page }) => {
    await page.goto("/defects");
    const counts = page.getByLabel("Defect counts");
    const first = await counts.innerText();
    await page.goto("/defects?page=3");
    await expect(counts).toHaveText(first);
    await page.getByRole("link", { name: /Reported date/ }).click();
    await expect(counts).toHaveText(first);
  });

  test("first page has 20 rows, newest first, with all columns (AC 4, 5, 9)", async ({ page }) => {
    await page.goto("/defects");
    await expect(rows(page)).toHaveCount(20);
    const row = rows(page).first();
    await expect(row.locator("td").nth(4)).toHaveText("20 Oct 2026");
    await expect(row.locator("td").nth(0)).toContainText("DEF-101");
    await expect(row.locator(".badge")).toHaveCount(2);
  });

  test("Reported heading reverses order; other headings are not sortable (AC 10, 11)", async ({ page }) => {
    await page.goto("/defects");
    await page.getByRole("link", { name: /Reported date/ }).click();
    await expect(page.getByRole("columnheader", { name: /Reported/ })).toHaveAttribute("aria-sort", "ascending");
    await expect(rows(page).first().locator("td").nth(0)).toContainText("DEF-145");
    for (const name of ["Title", "Status", "Severity", "Area"]) {
      const th = page.getByRole("columnheader", { name, exact: true });
      await expect(th.locator("a, button")).toHaveCount(0);
    }
  });

  test("paging text and boundary states (AC 7, 13, 14, 15)", async ({ page }) => {
    await page.goto("/defects");
    await expect(page.getByRole("button", { name: /Previous page/ })).toBeDisabled();
    const pageOneFirst = await firstTitle(page).innerText();

    await page.getByRole("link", { name: /Next page/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2 of 3")).toBeVisible();

    await page.getByRole("link", { name: /Previous page/ }).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(firstTitle(page)).toHaveText(pageOneFirst);

    await page.goto("/defects?page=3");
    await expect(page.getByRole("button", { name: /Next page/ })).toBeDisabled();
    await expect(rows(page)).toHaveCount(5);
  });

  test("clicking a row or its title opens the defect (AC 8)", async ({ page }) => {
    await page.goto("/defects");
    await rows(page).first().locator("td").nth(3).click();
    await expect(page).toHaveURL(/\/defects\/DEF-101$/);

    await page.goto("/defects");
    await firstTitle(page).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/defects\/DEF-101$/);
  });
});

test("21 defects page as 20 + 1 with every defect once (AC 6)", async ({ page, request }) => {
  await seedDefects(request, 21);
  await page.goto("/defects");
  const titles: string[] = [];
  for (;;) {
    titles.push(...(await rows(page).locator("a.row-link").allInnerTexts()));
    const next = page.getByRole("link", { name: /Next page/ });
    if (!(await next.count())) break;
    await next.click();
    await expect(page.getByText(/Page 2 of 2/)).toBeVisible();
  }
  expect(titles).toHaveLength(21);
  expect(new Set(titles).size).toBe(21);
});
