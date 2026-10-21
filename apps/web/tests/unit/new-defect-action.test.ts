import { beforeEach, describe, expect, it, vi } from "vitest";

const { createDefect, redirect } = vi.hoisted(() => ({
  createDefect: vi.fn(async () => ({ id: "DEF-NEW-1" })),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/defects-api", () => ({ createDefect }));
vi.mock("@/lib/session", () => ({ getCurrentUserId: async () => "user-42" }));

import { createDefectAction, type NewDefectState } from "@/app/defects/new/actions";

const empty: NewDefectState = { errors: {}, values: { title: "", severity: "medium", area: "", steps: "" } };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("createDefectAction", () => {
  it("forwards the signed-in person as reporter (AC 1)", async () => {
    await expect(
      createDefectAction(empty, form({ title: "Crash", severity: "high", area: "Login", steps: "x" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(createDefect).toHaveBeenCalledWith(expect.objectContaining({ title: "Crash" }), "user-42");
  });

  it("redirects to the new defect's page (AC 2)", async () => {
    await expect(createDefectAction(empty, form({ title: "Crash" }))).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/defects/DEF-NEW-1");
  });

  it("stays on the form and creates nothing when the title is blank (AC 4, 5, 6)", async () => {
    const next = await createDefectAction(
      empty,
      form({ title: "   ", severity: "high", area: "Login", steps: "Open" }),
    );
    expect(createDefect).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(next.errors.title).toBe("Enter a title for the defect.");
    expect(next.values).toMatchObject({ severity: "high", area: "Login", steps: "Open" });
  });

  it("sends no attachment when none was uploaded (AC 10)", async () => {
    await expect(
      createDefectAction(empty, form({ title: "Crash", attachmentId: "" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(createDefect).toHaveBeenCalledWith(expect.not.objectContaining({ attachmentId: expect.anything() }), "user-42");
  });
});
