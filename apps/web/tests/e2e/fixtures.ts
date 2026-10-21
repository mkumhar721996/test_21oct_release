import type { APIRequestContext } from "@playwright/test";

/** Swaps the stub Platform API fixture to `count` generated defects (newest = DEF-101, 20 Oct 2026). */
export async function seedDefects(request: APIRequest, count: number) {
  const res = await request.post(`http://localhost:3101/__seed/${count}`);
  if (!res.ok()) throw new Error(`seeding ${count} defects failed: ${res.status()}`);
}

type APIRequest = APIRequestContext;
