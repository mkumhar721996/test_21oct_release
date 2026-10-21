import type { APIRequestContext, BrowserContext } from "@playwright/test";

/** Swaps the stub Platform API fixture to `count` generated defects (newest = DEF-101, 20 Oct 2026). */
export async function seedDefects(request: APIRequest, count: number) {
  const res = await request.post(`http://localhost:3101/__seed/${count}`);
  if (!res.ok()) throw new Error(`seeding ${count} defects failed: ${res.status()}`);
}

/** Signs in as `userId` by setting the session cookie the web app reads. */
export async function signInAs(context: BrowserContext, userId: string) {
  await context.addCookies([{ name: "user-id", value: userId, url: "http://localhost:3000" }]);
}

/** The last defect the stub API received (id, reporter header, body), or null. */
export async function lastCreated(request: APIRequest) {
  const res = await request.get("http://localhost:3101/__last-created");
  return (await res.json()) as { id: string; reporterId: string | null; body: Record<string, unknown> } | null;
}

type APIRequest = APIRequestContext;
