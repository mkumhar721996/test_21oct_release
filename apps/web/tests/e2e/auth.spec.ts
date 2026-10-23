import { expect, test } from "@playwright/test";

const ROLES = [
  { email: "priya.nair@wfc.example", password: "Wfc-admin-1", role: "WFC Admin", org: null },
  { email: "tom.becker@wfc.example", password: "Consult-2", role: "Fundraising Consultant", org: null },
  { email: "maya.okafor@hope.example", password: "Org-admin-3", role: "Org Admin", org: "Hope Trust" },
  { email: "daniel.reyes@river.example", password: "Org-staff-4", role: "Org Staff", org: "River Foundation" },
];

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

for (const u of ROLES) {
  test(`signs in as ${u.role} and shows the header`, async ({ page }) => {
    await signIn(page, u.email, u.password);
    await expect(page).toHaveURL(/\/$/);
    const header = page.getByRole("banner");
    await expect(header).toContainText(u.role);
    if (u.org) await expect(header).toContainText(u.org);
    else await expect(header.getByTestId("user-organization")).toHaveCount(0);
  });
}

test("a wrong password shows the shared message", async ({ page }) => {
  await signIn(page, ROLES[0].email, "nope");
  await expect(page.getByRole("alert")).toContainText("Email or password is incorrect");
});

test("sign out returns to sign-in with a toast", async ({ page }) => {
  await signIn(page, ROLES[0].email, ROLES[0].password);
  await page.getByRole("banner").getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in\?reason=signed-out/);
  await expect(page.getByRole("status")).toContainText("You have been signed out");
});

test("an idle session redirects with the inactivity toast", async ({ page, request }) => {
  await signIn(page, ROLES[0].email, ROLES[0].password);
  await expect(page.getByRole("banner")).toContainText("WFC Admin");
  await request.post("http://localhost:3101/__idle");
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in\?reason=idle/);
  await expect(page.getByRole("status")).toContainText("30 minutes of inactivity");
});
