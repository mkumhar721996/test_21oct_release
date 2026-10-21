import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DefectFilters } from "@/components/defects/defect-filters";
import { AREAS, EMPTY_FILTERS } from "@/lib/defects";

describe("DefectFilters", () => {
  it("shows a search box and the three status chips", () => {
    render(<DefectFilters filters={EMPTY_FILTERS} onChange={vi.fn()} />);
    expect(screen.getByRole("searchbox", { name: "Search defects" })).toBeTruthy();
    const group = screen.getByRole("group", { name: "Status" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual([
      "Open",
      "In progress",
      "Closed",
    ]);
  });

  it("has no Apply or submit button", () => {
    render(<DefectFilters filters={EMPTY_FILTERS} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /apply/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /submit/i })).toBeNull();
  });

  it("offers exactly the fixed severity and area lists", () => {
    render(<DefectFilters filters={EMPTY_FILTERS} onChange={vi.fn()} />);
    const opts = (name: string) =>
      within(screen.getByRole("combobox", { name })).getAllByRole("option").map((o) => o.textContent);
    expect(opts("Severity")).toEqual(["All", "Low", "Medium", "High", "Critical"]);
    expect(opts("Area")).toEqual(["All", ...AREAS]);
  });

  it("reports changes per keystroke, chip toggle and select", () => {
    const onChange = vi.fn();
    render(<DefectFilters filters={{ ...EMPTY_FILTERS, statuses: ["open"] }} onChange={onChange} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "a" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, statuses: ["open"], q: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Closed" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, statuses: ["open", "closed"] });
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, statuses: [] });
    fireEvent.change(screen.getByRole("combobox", { name: "Area" }), { target: { value: "Billing" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_FILTERS, statuses: ["open"], area: "Billing" });
  });
});
