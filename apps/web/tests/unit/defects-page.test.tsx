import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Defect } from "@/lib/defects";
import DefectsPage from "@/app/defects/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const all: Defect[] = Array.from({ length: 45 }, (_, i) => ({
  id: `DEF-${i + 1}`,
  title: `Defect ${i + 1}`,
  status: (["open", "in_progress", "closed"] as const)[i % 3],
  severity: "low" as const,
  area: "Login",
  reportedAt: new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10),
}));
vi.mock("@/lib/defects-api", () => ({ getDefects: async () => all }));

describe("DefectsPage", () => {
  it("shows 20 newest-first rows, counts over all defects and the page text", async () => {
    render(await DefectsPage({ searchParams: Promise.resolve({ page: "2" }) }));
    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(screen.getByLabelText("Defect counts").textContent).toContain("15");
    expect(screen.getByRole("link", { name: "New defect" }).getAttribute("href")).toBe("/defects/new");
    // newest first: page 2 starts at the 21st newest, DEF-25
    expect(screen.getAllByRole("row")[1].textContent).toContain("DEF-25");
  });

  it("clamps an out-of-range page", async () => {
    render(await DefectsPage({ searchParams: Promise.resolve({ page: "99" }) }));
    expect(screen.getByText("Page 3 of 3")).toBeTruthy();
  });
});
