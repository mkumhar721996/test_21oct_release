import { expect, test } from "@playwright/test";

test("opens a chat from the list and reads it", async ({ page }) => {
  await page.goto("/chats");
  await page.getByRole("link", { name: /Maya Chen/ }).click();
  await expect(page.getByRole("log")).toContainText("Morning");
  await expect(page.locator(".msg-sent")).toHaveCount(2);
  await expect(page.locator(".msg-received")).toHaveCount(2);
  await expect(page.locator(".date-divider")).toHaveCount(2);
});

test("opens scrolled to the latest message", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/chats/chat-maya");
  await expect(page.getByText("See you at 11")).toBeInViewport();
  await expect(page.getByText("Hi", { exact: true })).not.toBeInViewport();
  expect(await page.locator(".thread").evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test("pressing the voice bubble plays nothing", async ({ page }) => {
  await page.goto("/chats/chat-maya");
  const url = page.url();
  expect(await page.locator("audio, video").count()).toBe(0);
  await page.getByRole("button", { name: /Voice message/ }).click();
  expect(await page.locator("audio, video").count()).toBe(0);
  expect(page.url()).toBe(url);
});

test("reload shows only the seeded history", async ({ page }) => {
  await page.goto("/chats/chat-maya");
  const before = await page.locator(".msg").count();
  await page.reload();
  expect(await page.locator(".msg").count()).toBe(before);
  expect(before).toBe(4);
});

test("a chat with no messages shows a placeholder", async ({ page }) => {
  await page.goto("/chats/chat-alex");
  await expect(page.getByText("No messages yet")).toBeVisible();
});
