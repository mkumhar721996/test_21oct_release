import type { APIRequestContext } from "@playwright/test";

/** Swaps the stub Platform API fixture to `count` generated defects (newest = DEF-101, 20 Oct 2026). */
export async function seedDefects(request: APIRequest, count: number) {
  const res = await request.post(`http://localhost:3101/__seed/${count}`);
  if (!res.ok()) throw new Error(`seeding ${count} defects failed: ${res.status()}`);
}

/** Switches the stub API: "on" answers GET /defects with 500, "malformed" with a 200 non-array body, "off" restores it. */
export async function setApiFailing(request: APIRequest, mode: "on" | "off" | "malformed") {
  const res = await request.post(`http://localhost:3101/__fail/${mode}`);
  if (!res.ok()) throw new Error(`setting api failure mode ${mode} failed: ${res.status()}`);
}

/** Makes the stub's POST /defects/:id/comments answer 500 ("on") or work again ("off"). */
export async function setCommentPostFailing(request: APIRequest, on: boolean) {
  const res = await request.post(`http://localhost:3101/__fail/comments/${on ? "on" : "off"}`);
  if (!res.ok()) throw new Error(`setting comment failure ${on} failed: ${res.status()}`);
}

/** Every non-GET request the stub received since the last seed. */
export async function getWrites(request: APIRequest): Promise<{ method: string; url: string }[]> {
  const res = await request.get("http://localhost:3101/__writes");
  return res.json();
}

type APIRequest = APIRequestContext;
