import { afterEach, describe, expect, it, vi } from "vitest";
import { getDashboardData } from "@/lib/portfolio-api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const BODIES: Record<string, unknown> = {
  "/portfolio": { invested: 1, currentValue: 2, returns: 1 },
  "/holdings": [{ symbol: "A" }],
  "/sips": [{ id: "s1" }],
  "/stocks": [{ symbol: "A" }],
};

function okFetch(overrides: Record<string, unknown> = {}) {
  return vi.fn(async (url: string, _init?: unknown) => {
    const path = url.replace("http://api.test", "");
    return { ok: true, status: 200, json: async () => ({ ...BODIES, ...overrides })[path] };
  });
}

describe("getDashboardData", () => {
  it("fetches the four endpoints from the API base URL without caching", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const data = await getDashboardData();
    expect(data).toEqual({
      totals: BODIES["/portfolio"],
      holdings: BODIES["/holdings"],
      sips: BODIES["/sips"],
      stocks: BODIES["/stocks"],
    });
    expect(fetchMock.mock.calls.map((c) => c[0]).sort()).toEqual([
      "http://api.test/holdings",
      "http://api.test/portfolio",
      "http://api.test/sips",
      "http://api.test/stocks",
    ]);
    expect(fetchMock.mock.calls[0][1]).toEqual({ cache: "no-store" });
  });

  it("defaults to localhost:3001", async () => {
    vi.stubEnv("API_BASE_URL", "");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    await getDashboardData().catch(() => undefined);
    expect(fetchMock.mock.calls[0][0]).toMatch(/^http:\/\/localhost:3001\//);
  });

  it("throws when any call is not OK", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({ ok: !url.endsWith("/sips"), status: 500, json: async () => [] })),
    );
    await expect(getDashboardData()).rejects.toThrow(/500/);
  });

  it("throws on a malformed body", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    vi.stubGlobal("fetch", okFetch({ "/holdings": {} }));
    await expect(getDashboardData()).rejects.toThrow(/non-array/);
    vi.stubGlobal("fetch", okFetch({ "/portfolio": [] }));
    await expect(getDashboardData()).rejects.toThrow(/non-object/);
  });

  it("rejects when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(getDashboardData()).rejects.toThrow(/fetch failed/);
  });
});
