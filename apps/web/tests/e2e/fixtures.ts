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

/** Selects the stub API's portfolio data: "default" (3 holdings, 2 SIPs, ₹1,00,000) or "failing" (500 on all four endpoints). */
export async function seedPortfolio(request: APIRequest, scenario: "default" | "failing") {
  const res = await request.post(`http://localhost:3101/__portfolio/${scenario}`);
  if (!res.ok()) throw new Error(`seeding portfolio scenario ${scenario} failed: ${res.status()}`);
}

type APIRequest = APIRequestContext;
