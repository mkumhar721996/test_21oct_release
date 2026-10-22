import { expect, test } from "@playwright/test";
import { getWrites, seedDefects, setCommentPostFailing } from "./fixtures";

const META = ["Open", "High", "Assignee: Dana Lee"];

test.describe("commenting on a defect", () => {
  test.beforeEach(async ({ request }) => {
    await seedDefects(request, 45);
  });

  test("a posted comment appears, survives a reload and sends nothing else (AC 1, 6, 7)", async ({ page, request }) => {
    await page.goto("/defects/DEF-101");
    await page.getByLabel("Add a comment").fill("Looks fixed in 17.2");
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText("Looks fixed in 17.2")).toBeVisible();
    await expect(page.getByLabel("Add a comment")).toHaveValue("");
    await page.reload();
    await expect(page.getByText("Looks fixed in 17.2")).toBeVisible();
    await expect(page.getByRole("button", { name: /edit|delete|remove/i })).toHaveCount(0);
    await expect(page.locator("#comments-title ~ ul").getByRole("button")).toHaveCount(0);
    expect(await getWrites(request)).toEqual([{ method: "POST", url: "/defects/DEF-101/comments" }]);
  });

  test("a failed post shows a persistent alert, keeps the text and changes nothing (AC 2-5)", async ({ page, request }) => {
    await setCommentPostFailing(request, true);
    await page.goto("/defects/DEF-101");
    const area = (await page.getByText(/^Area: /).textContent()) ?? "";
    for (const m of [...META, area]) await expect(page.getByText(m, { exact: true })).toBeVisible();
    await page.getByLabel("Add a comment").fill("Draft text");
    await page.getByRole("button", { name: "Post comment" }).click();
    const alert = page.getByRole("alert").filter({ hasText: /couldn't post your comment/i });
    await expect(alert).toBeVisible();
    await page.waitForTimeout(1000);
    await expect(alert).toBeVisible();
    await expect(page.getByLabel("Add a comment")).toHaveValue("Draft text");
    await expect(page.locator("#comments-title ~ ul li")).toHaveCount(1);
    for (const m of [...META, area]) await expect(page.getByText(m, { exact: true })).toBeVisible();
    expect(await getWrites(request)).toEqual([{ method: "POST", url: "/defects/DEF-101/comments" }]);
    await setCommentPostFailing(request, false);
    await page.reload();
    await expect(page.locator("#comments-title ~ ul li")).toHaveCount(1);
  });
});
