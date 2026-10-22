import { afterEach, describe, expect, it, vi } from "vitest";
import { getAssignablePeople, getDefect, getDefects, getViewer } from "@/lib/defects-api";

describe("getViewer", () => {
  it("forwards the cookie and returns the viewer", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ name: "Tess", roles: ["tester"] }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getViewer("sid=1")).resolves.toEqual({ name: "Tess", roles: ["tester"] });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/session");
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ cookie: "sid=1" });
  });
  it("returns null on 401 and on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    await expect(getViewer()).resolves.toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await expect(getViewer()).resolves.toBeNull();
  });
});

describe("getAssignablePeople", () => {
  it("queries only tester, manager and lead", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [{ id: "p1", name: "Sam", roles: ["tester"] }] });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getAssignablePeople("sid=1")).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/people?roles=tester,manager,lead"),
      expect.anything(),
    );
  });
  it("returns an empty list when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(getAssignablePeople()).resolves.toEqual([]);
  });
});

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

  it("throws when the body is not an array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    await expect(getDefects()).rejects.toThrow(/non-array/);
  });

  it("rejects when the body is not valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      }),
    );
    await expect(getDefects()).rejects.toThrow();
  });

  it("rejects when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(getDefects()).rejects.toThrow(/fetch failed/);
  });
});

describe("getDefect", () => {
  it("fetches GET /defects/:id with the id encoded", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "DEF-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(getDefect("DEF-1")).resolves.toEqual({ id: "DEF-1" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/defects/DEF-1");
    await getDefect("a b");
    expect(fetchMock.mock.calls[1][0]).toBe("http://api.test/defects/a%20b");
  });

  it("resolves null on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(getDefect("NOPE")).resolves.toBeNull();
  });

  it("throws on other failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(getDefect("DEF-1")).rejects.toThrow(/500/);
  });

  it("throws on a network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("down")));
    await expect(getDefect("DEF-1")).rejects.toThrow(/GET \/defects\/DEF-1 failed/);
  });
});
