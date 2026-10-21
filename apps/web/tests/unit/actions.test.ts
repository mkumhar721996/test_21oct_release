import { beforeEach, describe, expect, it, vi } from "vitest";
import { postComment } from "@/app/defects/[id]/actions";
import { postDefectComment } from "@/lib/defects-api";

vi.mock("@/lib/defects-api", () => ({ postDefectComment: vi.fn() }));

const created = { id: "c2", author: "You", body: "hi", createdAt: "2026-10-21T09:00:00Z" };

beforeEach(() => {
  vi.mocked(postDefectComment).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("postComment action", () => {
  it("returns the created comment, posting the trimmed text", async () => {
    vi.mocked(postDefectComment).mockResolvedValue(created);
    await expect(postComment("DEF-1", " hi ")).resolves.toEqual({ ok: true, comment: created });
    expect(postDefectComment).toHaveBeenCalledWith("DEF-1", "hi");
  });

  it("returns ok:false for an empty body without calling the API", async () => {
    await expect(postComment("DEF-1", "   ")).resolves.toEqual({ ok: false });
    expect(postDefectComment).not.toHaveBeenCalled();
  });

  it("returns ok:false when the API call rejects", async () => {
    vi.mocked(postDefectComment).mockRejectedValue(new Error("boom"));
    await expect(postComment("DEF-1", "x")).resolves.toEqual({ ok: false });
  });
});
