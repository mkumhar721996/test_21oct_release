import { expect, test, type Page } from "@playwright/test";
import { lastCreated, signInAs } from "./fixtures";

const exe = { name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") };
const failing = { name: "fail.png", mimeType: "image/png", buffer: Buffer.from("x") };
const good = { name: "ok.png", mimeType: "image/png", buffer: Buffer.from("x") };
const attach = (page: Page, file: typeof exe) => page.getByLabel("Attach file input").setInputFiles(file);

test.beforeEach(async ({ context, page }) => {
  await signInAs(context, "user-42");
  await page.goto("/defects/new");
});

test("shows all fields (AC 3)", async ({ page }) => {
  await expect(page.getByLabel("Title")).toBeVisible();
  await expect(page.getByRole("group", { name: "Severity" })).toBeVisible();
  await expect(page.getByLabel("Medium")).toBeChecked();
  await expect(page.getByLabel("Area")).toBeVisible();
  await expect(page.getByLabel("Steps to reproduce")).toBeVisible();
  await expect(page.getByRole("button", { name: "Attach file" })).toBeVisible();
});

test("submit creates the defect for the signed-in person and shows its page (AC 1, 2)", async ({
  page,
  request,
}) => {
  await page.getByLabel("Title").fill("Crash on login");
  await page.getByRole("button", { name: "Submit defect" }).click();
  await expect(page).toHaveURL(/\/defects\/DEF-NEW-\d+$/);
  const created = await lastCreated(request);
  expect(created?.reporterId).toBe("user-42");
  expect(created?.body).toMatchObject({ title: "Crash on login" });
});

test("missing title stays on the form, keeps entries (AC 4, 5, 6)", async ({ page }) => {
  await page.getByLabel("High").check();
  await page.getByLabel("Area").selectOption("Billing");
  await page.getByLabel("Steps to reproduce").fill("1. Open billing");
  await page.getByRole("button", { name: "Submit defect" }).click();
  await expect(page).toHaveURL(/\/defects\/new$/);
  await expect(page.getByText("Enter a title for the defect.")).toBeVisible();
  await expect(page.getByLabel("Title")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("High")).toBeChecked();
  await expect(page.getByLabel("Area")).toHaveValue("Billing");
  await expect(page.getByLabel("Steps to reproduce")).toHaveValue("1. Open billing");
});

for (const [label, file] of [
  ["rejected", exe],
  ["failed", failing],
] as const) {
  test(`attachment ${label}: message beside Attach file, entries kept, control usable (AC 7, 8, 9)`, async ({
    page,
  }) => {
    await page.getByLabel("Title").fill("Crash");
    await page.getByLabel("Critical").check();
    await page.getByLabel("Area").selectOption("Login");
    await page.getByLabel("Steps to reproduce").fill("Open page");
    await attach(page, file);
    await expect(page.locator("#attach-error")).toContainText("file");
    await expect(page.getByRole("button", { name: "Attach file" })).toHaveAttribute(
      "aria-describedby",
      "attach-error",
    );
    await expect(page.getByLabel("Title")).toHaveValue("Crash");
    await expect(page.getByLabel("Critical")).toBeChecked();
    await expect(page.getByLabel("Area")).toHaveValue("Login");
    await expect(page.getByLabel("Steps to reproduce")).toHaveValue("Open page");

    await expect(page.getByRole("button", { name: "Attach file" })).toBeEnabled();
    await attach(page, good);
    await expect(page.locator("#attach-error")).toHaveCount(0);
    await expect(page.getByText("ok.png")).toBeVisible();
  });
}

test("after an attachment error, Submit without a file shows the detail page (AC 10)", async ({
  page,
  request,
}) => {
  await page.getByLabel("Title").fill("Crash");
  await attach(page, failing);
  await expect(page.locator("#attach-error")).toBeVisible();
  await page.getByRole("button", { name: "Submit defect" }).click();
  await expect(page).toHaveURL(/\/defects\/DEF-NEW-\d+$/);
  expect((await lastCreated(request))?.body).not.toHaveProperty("attachmentId");
});

test("Cancel returns to the list (AC 11)", async ({ page }) => {
  await page.getByRole("link", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/defects$/);
});
