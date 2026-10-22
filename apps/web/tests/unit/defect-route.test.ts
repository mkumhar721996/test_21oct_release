import { afterEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/defects/[id]/route";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const call = (body: unknown, cookie = "sid=1") =>
  PATCH(
    new Request("http://web.test/api/defects/DEF-101", {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "DEF-101" }) },
  );
const upstream = (status: number, body: unknown = {}) =>
  vi.fn().mockResolvedValue({ ok: status < 300, status, json: async () => body });
const kindOf = async (res: Response) => [res.status, (await res.json()).kind];

describe("PATCH /api/defects/[id]", () => {
  it("forwards the change and cookie and returns the defect", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    const fetchMock = upstream(200, { id: "DEF-101", version: 2 });
    vi.stubGlobal("fetch", fetchMock);
    const res = await call({ assignee: "Sam", version: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "DEF-101", version: 2 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.test/defects/DEF-101");
    expect(init.method).toBe("PATCH");
    expect(init.headers.cookie).toBe("sid=1");
    expect(JSON.parse(init.body)).toEqual({ assignee: "Sam", version: 1 });
  });
  it("maps 409 to conflict with the current defect", async () => {
    vi.stubGlobal("fetch", upstream(409, { defect: { id: "DEF-101", version: 3 } }));
    const res = await call({ status: "closed", version: 1 });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ kind: "conflict", defect: { id: "DEF-101", version: 3 } });
  });
  it("maps 401, 403, 500 and network errors", async () => {
    vi.stubGlobal("fetch", upstream(401));
    expect(await kindOf(await call({ status: "closed", version: 1 }))).toEqual([401, "unauthenticated"]);
    vi.stubGlobal("fetch", upstream(403));
    expect(await kindOf(await call({ status: "closed", version: 1 }))).toEqual([403, "forbidden"]);
    vi.stubGlobal("fetch", upstream(500));
    expect(await kindOf(await call({ status: "closed", version: 1 }))).toEqual([502, "failed"]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await kindOf(await call({ status: "closed", version: 1 }))).toEqual([502, "failed"]);
  });
  it("rejects an invalid body without calling the API", async () => {
    const fetchMock = upstream(200);
    vi.stubGlobal("fetch", fetchMock);
    expect((await call({ status: "bogus", version: 1 })).status).toBe(400);
    expect((await call({ status: "open" })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
