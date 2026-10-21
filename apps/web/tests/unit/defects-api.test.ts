import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefect, getDefects, uploadAttachment } from "@/lib/defects-api";

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

describe("createDefect / uploadAttachment", () => {
  it("POSTs the defect with the reporter header", async () => {
    vi.stubEnv("API_BASE_URL", "http://api.test");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "d1" }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(createDefect({ title: "T", severity: "low", area: "", steps: "" }, "user-42")).resolves.toEqual({ id: "d1" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/defects");
    expect(fetchMock.mock.calls[0][1].headers["x-user-id"]).toBe("user-42");
  });

  it("surfaces the API message when an upload is rejected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 413, json: async () => ({ message: "Too large." }) }));
    await expect(uploadAttachment(new File(["x"], "a.png"), "user-42")).rejects.toMatchObject({ status: 413, message: "Too large." });
  });
});
