import { beforeEach, describe, expect, it, vi } from "vitest";
import { postCommentAction } from "@/app/defects/[id]/actions";
import { postComment } from "@/lib/defects-api";

vi.mock("@/lib/defects-api", () => ({ postComment: vi.fn() }));

const created = { id: "c2", author: "Sam", body: "hi", createdAt: "2026-10-03T09:00:00Z" };

beforeEach(() => {
  vi.mocked(postComment).mockReset();
});

describe("postCommentAction", () => {
  it("returns the created comment, posting the trimmed text", async () => {
    vi.mocked(postComment).mockResolvedValue(created);
    expect(await postCommentAction("DEF-1", "  hi ")).toEqual({ ok: true, comment: created });
    expect(postComment).toHaveBeenCalledWith("DEF-1", "hi");
  });

  it("rejects blank text without calling the API", async () => {
    expect(await postCommentAction("DEF-1", "  ")).toEqual({ ok: false });
    expect(postComment).not.toHaveBeenCalled();
  });

  it("returns ok:false when the API call fails", async () => {
    vi.mocked(postComment).mockImplementation(async () => {
      throw new Error("boom");
    });
    expect(await postCommentAction("DEF-1", "hi")).toEqual({ ok: false });
  });
});
