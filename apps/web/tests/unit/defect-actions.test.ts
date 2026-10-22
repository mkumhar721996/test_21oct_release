import { afterEach, describe, expect, it, vi } from "vitest";
import { saveDefectChange } from "@/lib/defect-actions";

afterEach(() => vi.unstubAllGlobals());

const reply = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body });

describe("saveDefectChange", () => {
  it("PATCHes the same-origin route with the change and version", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { id: "DEF-101", version: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await saveDefectChange("DEF-101", { assignee: null }, 1);
    expect(result).toEqual({ ok: true, defect: { id: "DEF-101", version: 2 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/defects/DEF-101");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"assignee":null,"version":1}');
  });
  it("maps outcomes", async () => {
    const defect = { id: "DEF-101", version: 3 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(409, { kind: "conflict", defect })));
    expect(await saveDefectChange("DEF-101", { status: "closed" }, 1)).toEqual({ ok: false, kind: "conflict", defect });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(403, { kind: "forbidden" })));
    expect(await saveDefectChange("DEF-101", { status: "closed" }, 1)).toMatchObject({ kind: "forbidden" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(401, { kind: "unauthenticated" })));
    expect(await saveDefectChange("DEF-101", { status: "closed" }, 1)).toMatchObject({ kind: "unauthenticated" });
  });
  it("never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await saveDefectChange("DEF-101", { status: "closed" }, 1)).toEqual({ ok: false, kind: "failed" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );
    expect(await saveDefectChange("DEF-101", { status: "closed" }, 1)).toEqual({ ok: false, kind: "failed" });
  });
});
