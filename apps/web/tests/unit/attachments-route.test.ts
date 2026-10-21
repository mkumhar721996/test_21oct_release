// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { uploadAttachment, ApiError } = vi.hoisted(() => {
  class ApiError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return { uploadAttachment: vi.fn(), ApiError };
});

vi.mock("@/lib/defects-api", () => ({ uploadAttachment, ApiError }));
vi.mock("@/lib/session", () => ({ getCurrentUserId: async () => "user-42" }));

import { POST } from "@/app/api/attachments/route";

const requestWith = (file: File) => {
  const body = new FormData();
  body.set("file", file);
  return new Request("http://web.test/api/attachments", { method: "POST", body });
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/attachments", () => {
  it("forwards the file with the reporter and returns the result", async () => {
    uploadAttachment.mockResolvedValue({ attachmentId: "a1", name: "ok.png" });
    const res = await POST(requestWith(new File(["x"], "ok.png", { type: "image/png" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ attachmentId: "a1", name: "ok.png" });
    expect(uploadAttachment).toHaveBeenCalledWith(expect.any(File), "user-42");
  });

  it("relays the API status and message on rejection (AC 7)", async () => {
    uploadAttachment.mockRejectedValue(new ApiError(415, "That file type is not supported."));
    const res = await POST(requestWith(new File(["x"], "virus.exe")));
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ message: "That file type is not supported." });
  });

  it("answers 502 with a plain message on an unexpected failure (AC 7)", async () => {
    uploadAttachment.mockRejectedValue(new Error("network"));
    const res = await POST(requestWith(new File(["x"], "fail.png")));
    expect(res.status).toBe(502);
    expect((await res.json()).message).toMatch(/submit without it/);
  });
});
