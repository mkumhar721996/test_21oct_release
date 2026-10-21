import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DefectDetailPage from "@/app/defects/[id]/page";
import Loading from "@/app/defects/[id]/loading";
import NotFound from "@/app/defects/[id]/not-found";
import ErrorBoundary from "@/app/defects/[id]/error";

vi.mock("@/lib/defects-api", () => ({
  getDefect: async (id: string) =>
    id === "DEF-1"
      ? {
          id: "DEF-1",
          title: "Thing",
          status: "closed",
          severity: "low",
          area: "Search",
          reportedAt: "2026-10-01",
          description: "d",
          assignee: null,
          attachments: [],
          comments: [],
        }
      : null,
}));

describe("defect detail page", () => {
  it("renders the defect", async () => {
    render(await DefectDetailPage({ params: Promise.resolve({ id: "DEF-1" }) }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("DEF-1 Thing");
  });

  it("calls notFound for an unknown id", async () => {
    await expect(DefectDetailPage({ params: Promise.resolve({ id: "NOPE" }) })).rejects.toThrow();
  });

  it("shows a loading placeholder", () => {
    render(<Loading />);
    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("not-found shows a message and a link to the list", () => {
    render(<NotFound />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Defect not found");
    expect(within(alert).getByRole("link").getAttribute("href")).toBe("/defects");
  });

  it("error shows a persistent message and a link to the list", () => {
    render(<ErrorBoundary error={new Error("boom")} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/couldn't load/i);
    expect(within(alert).getByRole("link").getAttribute("href")).toBe("/defects");
  });
});
