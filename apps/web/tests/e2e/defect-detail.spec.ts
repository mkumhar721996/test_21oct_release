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

  test("posting a comment adds it to the list (AC 1, 6, 7)", async ({ page, request }) => {
    await page.goto("/defects/DEF-101");
    await page.getByLabel("Add a comment").fill("Looks fixed on my side");
    await page.getByRole("button", { name: "Post comment" }).click();
    const list = page.getByRole("list").filter({ hasText: "Reproduced on 17.1" });
    await expect(list.getByText("Looks fixed on my side")).toBeVisible();
    await expect(list.getByRole("button")).toHaveCount(0);
    await page.reload();
    await expect(list.getByText("Looks fixed on my side")).toBeVisible();
    await expect(list.getByRole("button")).toHaveCount(0);
    const requests = await (await request.get("http://localhost:3101/__requests")).json();
    expect(requests).toContain("POST /defects/DEF-101/comments");
    expect(requests.filter((r: string) => !/^GET \/defects\/DEF-101$|^POST \/defects\/DEF-101\/comments$/.test(r))).toEqual([]);
  });

  test("a failed post keeps the text and the defect unchanged (AC 2-5)", async ({ page }) => {
    await page.goto("/defects/DEF-NOCOMMENT");
    const meta = ["Open", "High", "Assignee: Dana Lee", "Area: Login"];
    for (const m of meta) await expect(page.getByText(m, { exact: true })).toBeVisible();
    await page.getByLabel("Add a comment").fill("Needs a retry");
    await page.getByRole("button", { name: "Post comment" }).click();
    const alert = page.getByRole("alert").filter({ hasText: /couldn't post your comment/i });
    await expect(alert).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(alert).toBeVisible();
    await expect(page.getByLabel("Add a comment")).toHaveValue("Needs a retry");
    await expect(page.getByRole("list").getByText("Needs a retry")).toHaveCount(0);
    for (const m of meta) await expect(page.getByText(m, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("list").getByText("Needs a retry")).toHaveCount(0);
  });
});
