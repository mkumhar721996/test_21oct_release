import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DefectTable } from "@/components/defects/defect-table";
import type { Defect } from "@/lib/defects";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const rows: Defect[] = [
  { id: "DEF-1", title: "First", status: "open", severity: "low", area: "Login", reportedAt: "2026-10-20" },
  { id: "DEF-2", title: "Second", status: "closed", severity: "medium", area: "Billing", reportedAt: "2026-10-19" },
];

describe("DefectTable", () => {
  it("makes only the Reported heading sortable (AC 10, 11)", () => {
    render(<DefectTable rows={rows} sort="desc" from={1} to={2} total={45} />);
    for (const name of ["Title", "Status", "Severity", "Area"]) {
      const th = screen.getByRole("columnheader", { name });
      expect(within(th).queryByRole("button")).toBeNull();
      expect(within(th).queryByRole("link")).toBeNull();
      expect(th.hasAttribute("aria-sort")).toBe(false);
    }
    const th = screen.getByRole("columnheader", { name: /Reported/ });
    expect(th.getAttribute("aria-sort")).toBe("descending");
    const sort = within(th).getByRole("link", { name: "Reported date, sorted newest first. Select to reverse." });
    expect(sort.getAttribute("href")).toBe("/defects?sort=asc&page=1");
  });

  it("reverses labels when ascending", () => {
    render(<DefectTable rows={rows} sort="asc" from={1} to={2} total={45} />);
    const th = screen.getByRole("columnheader", { name: /Reported/ });
    expect(th.getAttribute("aria-sort")).toBe("ascending");
    expect(within(th).getByRole("link").getAttribute("href")).toBe("/defects?sort=desc&page=1");
  });

  it("captions the range and renders one row per defect", () => {
    render(<DefectTable rows={rows} sort="desc" from={1} to={2} total={45} />);
    expect(screen.getByText("Showing 1–2 of 45 defects, newest first")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});
