import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DefectListView } from "@/components/defects/defect-list-view";
import { PAGE_SIZE, type Defect } from "@/lib/defects";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace }) }));

const fixture: Defect[] = [
  { id: "DEF-1", title: "Login button unresponsive", status: "open", severity: "critical", area: "Login", reportedAt: "2026-10-05" },
  { id: "DEF-2", title: "Invoice total wrong", status: "closed", severity: "high", area: "Billing", reportedAt: "2026-10-04" },
  { id: "DEF-3", title: "Report export fails", status: "in_progress", severity: "medium", area: "Reports", reportedAt: "2026-10-03" },
  { id: "DEF-4", title: "Billing email late", status: "closed", severity: "low", area: "Billing", reportedAt: "2026-10-02" },
  { id: "DEF-5", title: "Slow dashboard", status: "open", severity: "high", area: "Other", reportedAt: "2026-10-01" },
];

const bodyRows = () => screen.getAllByRole("row").slice(1);
const cells = (i: number) => bodyRows().map((r) => within(r).getAllByRole("cell")[i].textContent ?? "");
const titles = () => cells(0).map((t) => fixture.find((d) => t.includes(d.title))!.title);
const searchbox = () => screen.getByRole("searchbox", { name: "Search defects" });
const view = (defects = fixture, page = 1) => render(<DefectListView defects={defects} sort="desc" page={page} />);
const type = (value: string) => fireEvent.change(searchbox(), { target: { value } });

beforeEach(() => replace.mockClear());

describe("DefectListView", () => {
  it("filters per keystroke, trimmed", () => {
    view();
    expect(screen.getByRole("status").textContent).toBe("Showing all 5 defects");
    type("l");
    expect(titles()).toEqual(fixture.filter((d) => /l/i.test(d.title + d.id)).map((d) => d.title));
    type("  login  ");
    expect(titles()).toEqual(["Login button unresponsive"]);
    expect(screen.getByRole("status").textContent).toBe("Showing 1 of 5 defects");
  });

  it("filters by status chip", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(screen.getByRole("button", { name: "Closed" }).getAttribute("aria-pressed")).toBe("true");
    expect(bodyRows()).toHaveLength(2);
    expect(cells(1).every((s) => s.includes("Closed"))).toBe(true);
  });

  it("filters by severity and area", () => {
    view();
    fireEvent.change(screen.getByRole("combobox", { name: "Severity" }), { target: { value: "high" } });
    expect(titles()).toEqual(["Invoice total wrong", "Slow dashboard"]);
    fireEvent.change(screen.getByRole("combobox", { name: "Area" }), { target: { value: "Billing" } });
    expect(titles()).toEqual(["Invoice total wrong"]);
  });

  it("shows Open and Closed together without in progress", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    const statuses = cells(1).join("|");
    expect(statuses).not.toContain("In progress");
    expect(statuses).toContain("Open");
    expect(statuses).toContain("Closed");
  });

  it("shows the no-match message with a single clear control", () => {
    view();
    type("payroll");
    expect(screen.getByRole("heading", { name: "No defects match your search." })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("No defects match");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeTruthy();
  });

  it("clear resets search, filters and focuses the search box", () => {
    view();
    type("payroll");
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Severity" }), { target: { value: "low" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Area" }), { target: { value: "Login" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect((searchbox() as HTMLInputElement).value).toBe("");
    expect(screen.queryAllByRole("button", { pressed: true })).toHaveLength(0);
    expect((screen.getByRole("combobox", { name: "Severity" }) as HTMLSelectElement).value).toBe("");
    expect((screen.getByRole("combobox", { name: "Area" }) as HTMLSelectElement).value).toBe("");
    expect(screen.getAllByRole("row")).toHaveLength(1 + Math.min(fixture.length, PAGE_SIZE));
    expect(document.activeElement).toBe(searchbox());
  });

  it("returns to page 1 when a filter changes on a later page", () => {
    const many: Defect[] = Array.from({ length: 45 }, (_, i) => ({
      ...fixture[0],
      id: `DEF-${i + 1}`,
      title: `Defect ${i + 1}`,
    }));
    view(many, 2);
    expect(replace).not.toHaveBeenCalled();
    type("Defect 1");
    expect(replace).toHaveBeenCalledWith("/defects?sort=desc", { scroll: false });
  });
});
