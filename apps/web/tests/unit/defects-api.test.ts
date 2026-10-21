import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefects } from "@/lib/defects-api";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getDefects", () => {
  it("fetches GET /defects from the API base URL", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "DEF-1" }] });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getDefects()).resolves.toEqual([{ id: "DEF-1" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/defects");
  });

  it("defaults to localhost:3001", async () => {
    vi.stubEnv("API_BASE_URL", "");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    await getDefects();
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3001/defects");
  });

  it("throws on a non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(getDefects()).rejects.toThrow(/500/);
  });
});
