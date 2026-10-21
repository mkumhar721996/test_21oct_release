import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Defect } from "@/lib/defects";
import DefectsPage from "@/app/defects/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

const mocks = vi.hoisted(() => ({ getDefects: vi.fn() }));

const all: Defect[] = Array.from({ length: 45 }, (_, i) => ({
  id: `DEF-${i + 1}`,
  title: `Defect ${i + 1}`,
  status: (["open", "in_progress", "closed"] as const)[i % 3],
  severity: "low" as const,
  area: "Login",
  reportedAt: new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10),
}));
vi.mock("@/lib/defects-api", () => ({ getDefects: mocks.getDefects }));

beforeEach(() => {
  mocks.getDefects.mockReset();
  mocks.getDefects.mockResolvedValue(all);
});

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

  it("shows the empty state heading and prompt when nothing is reported", async () => {
    mocks.getDefects.mockResolvedValueOnce([]);
    const { container } = render(await DefectsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Defect list, nothing reported" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Report a defect" }).getAttribute("href")).toBe("/defects/new");
    expect(screen.queryByRole("table")).toBeNull();
    expect(container.querySelectorAll(".btn-primary")).toHaveLength(1);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it.each([{ page: "99", sort: "asc" }, { page: "abc" }, { page: "-1" }])(
    "shows the empty state for query %j",
    async (q) => {
      mocks.getDefects.mockResolvedValueOnce([]);
      render(await DefectsPage({ searchParams: Promise.resolve(q) }));
      expect(screen.getByRole("heading", { level: 1, name: "Defect list, nothing reported" })).toBeTruthy();
    },
  );

  it("replaces the table with the load failure message and keeps New defect", async () => {
    mocks.getDefects.mockRejectedValueOnce(new Error("GET /defects failed with status 500"));
    const { container } = render(await DefectsPage({ searchParams: Promise.resolve({ page: "3" }) }));
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("We couldn't load the defect list.");
    expect(alert.textContent).not.toMatch(/500|TypeError|GET \/defects/);
    expect(within(alert).getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByLabelText("Defect counts")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Defect list pages" })).toBeNull();
    expect(screen.getByRole("link", { name: "New defect" }).getAttribute("href")).toBe("/defects/new");
    expect(container.querySelectorAll(".btn-primary")).toHaveLength(1);
  });
});
