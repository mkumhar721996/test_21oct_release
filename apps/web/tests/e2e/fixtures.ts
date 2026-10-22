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

/** Switches the stub session: "tester" may assign, "developer" has no assign role, "expired" is signed out. */
export async function setSession(request: APIRequest, state: "tester" | "developer" | "expired") {
  const res = await request.post(`http://localhost:3101/__session/${state}`);
  if (!res.ok()) throw new Error(`setting session ${state} failed: ${res.status()}`);
}

/** Simulates another person changing a defect: bumps its version and sets the given assignee and/or status. */
export async function bumpDefect(
  request: APIRequest,
  id: string,
  change: { assignee?: string | null; status?: "open" | "in_progress" | "closed" },
) {
  const res = await request.post(`http://localhost:3101/__bump/${id}`, { data: change });
  if (!res.ok()) throw new Error(`bumping ${id} failed: ${res.status()}`);
}

/** Restores the stub session and every defect's assignee, status and version. */
export async function resetDefects(request: APIRequest) {
  const res = await request.post("http://localhost:3101/__reset");
  if (!res.ok()) throw new Error(`reset failed: ${res.status()}`);
}

type APIRequest = APIRequestContext;
