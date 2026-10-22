import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DefectDetailPage from "@/app/defects/[id]/page";
import Loading from "@/app/defects/[id]/loading";
import NotFound from "@/app/defects/[id]/not-found";
import ErrorBoundary from "@/app/defects/[id]/error";

vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "sid=1" }) }));

const viewerRef = vi.hoisted(() => ({ current: null as { name: string; roles: string[] } | null }));
const people = vi.hoisted(() => vi.fn(async (_cookie?: string) => [{ id: "p1", name: "Sam Ortiz", roles: ["tester"] }]));

vi.mock("@/lib/defects-api", () => ({
  getViewer: async () => viewerRef.current,
  getAssignablePeople: people,
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
          version: 1,
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

  it("fetches people with the cookie and enables the controls for a tester", async () => {
    viewerRef.current = { name: "Tess", roles: ["tester"] };
    people.mockClear();
    render(await DefectDetailPage({ params: Promise.resolve({ id: "DEF-1" }) }));
    expect(people).toHaveBeenCalledWith("sid=1");
    expect((screen.getByRole("button", { name: "Assign" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each([
    ["a developer", { name: "Dan", roles: ["developer"] }],
    ["no viewer", null],
  ])("does not fetch people for %s", async (_n, viewer) => {
    viewerRef.current = viewer;
    people.mockClear();
    render(await DefectDetailPage({ params: Promise.resolve({ id: "DEF-1" }) }));
    expect(people).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Assign" }) as HTMLButtonElement).disabled).toBe(true);
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
