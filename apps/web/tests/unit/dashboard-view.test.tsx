import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { StatTile } from "@/components/dashboard/stat-tile";
import { UpcomingSips } from "@/components/dashboard/upcoming-sips";
import { HoldingsTable } from "@/components/dashboard/holdings-table";
import { toHoldingRows, toUpcomingSips, type ApiHolding } from "@/lib/portfolio";
import type { DashboardData } from "@/lib/portfolio-api";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock, refresh: vi.fn() }) }));

const NOW = new Date("2026-10-22T00:00:00Z");

function h(symbol: string, returns: number, dayChange: number): ApiHolding {
  return { symbol, quantity: 22, investedAmount: 0, currentValue: 3_500_000, returns, dayChange, dayChangePercent: 0 };
}

const data: DashboardData = {
  totals: { invested: 9_000_000, currentValue: 10_000_000, returns: 1_000_000 },
  holdings: [h("NIFTY", 410_000, 100_000), h("HDFCBANK", 230_000, 25_000), h("INFY", -85_000, 0)],
  sips: [
    { id: "s1", symbol: "NIFTY", amount: 500_000, dayOfMonth: 1 },
    { id: "s2", symbol: "HDFCBANK", amount: 300_000, dayOfMonth: 15 },
  ],
  stocks: [
    { symbol: "NIFTY", name: "Nifty 50 index fund", price: 1 },
    { symbol: "HDFCBANK", name: "HDFC Bank", price: 1 },
    { symbol: "INFY", name: "Infosys", price: 1 },
  ],
};

describe("DashboardView", () => {
  it("shows the portfolio value (AC1, AC9)", () => {
    render(<DashboardView {...data} now={NOW} />);
    expect(screen.getByText("Portfolio value")).toBeTruthy();
    expect(within(screen.getByTestId("portfolio-value")).getByText("₹1,00,000")).toBeTruthy();
  });

  it("shows today's change with percent and an up cue (AC2)", () => {
    render(<DashboardView {...data} now={NOW} />);
    const tile = screen.getByTestId("todays-change");
    expect(within(tile).getByText("+₹1,250")).toBeTruthy();
    expect(tile.textContent).toContain("+1.27% today");
    expect(tile.querySelector(".up")).not.toBeNull();
    expect(tile.querySelector("[aria-hidden=true]")?.textContent).toBe("▲");
  });

  it("marks a loss with the down class (AC2)", () => {
    const down = { ...data, holdings: [h("INFY", -85_000, -85_000)] };
    render(<DashboardView {...down} now={NOW} />);
    const tile = screen.getByTestId("todays-change");
    expect(within(tile).getByText("−₹850")).toBeTruthy();
    expect(tile.querySelector(".down")).not.toBeNull();
  });

  it("shows the active SIPs count (AC3)", () => {
    render(<DashboardView {...data} now={NOW} />);
    expect(within(screen.getByTestId("active-sips")).getByText("2")).toBeTruthy();
  });

  it("puts every block on one page with a single h1 and no primary action (AC6)", () => {
    const { container } = render(<DashboardView {...data} now={NOW} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Portfolio summary" })).toBeTruthy();
    expect(screen.getByText("Today's change")).toBeTruthy();
    expect(screen.getByText("Active SIPs")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Upcoming SIPs" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeTruthy();
    expect(container.querySelectorAll(".btn-primary")).toHaveLength(0);
  });
});

describe("StatTile", () => {
  it("renders label, value and the primary variant", () => {
    const { container } = render(<StatTile testId="t" label="Label" value="42" primary />);
    expect(container.querySelector(".card.stat-tile.is-primary")).not.toBeNull();
    expect(container.querySelector(".stat-label")?.textContent).toBe("Label");
    expect(container.querySelector(".stat-value")?.textContent).toBe("42");
  });
});

describe("UpcomingSips", () => {
  it("lists both SIPs soonest first with the next debit date (AC4)", () => {
    render(<UpcomingSips sips={toUpcomingSips(data.sips, data.stocks, NOW)} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain("Nifty 50 index fund");
    expect(items[0].textContent).toContain("₹5,000");
    expect(screen.getByText("Next debit 1 Nov 2026")).toBeTruthy();
    expect(screen.getByText("Next debit 15 Nov 2026")).toBeTruthy();
  });
});

describe("HoldingsTable", () => {
  const rows = toHoldingRows(data.holdings, data.stocks);

  it("shows one body row per holding with the expected headers (AC5)", () => {
    render(<HoldingsTable rows={rows} />);
    expect(within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row")).toHaveLength(3);
    for (const name of ["Fund or stock", "Units owned", "Current value", "Gain or loss"]) {
      expect(screen.getByRole("columnheader", { name })).toBeTruthy();
    }
    expect(screen.getByText("Infosys")).toBeTruthy();
    expect(screen.getByText("−₹850").closest("td")?.className).toContain("down");
  });

  it("has no action controls on rows (AC7)", () => {
    const { container } = render(<HoldingsTable rows={rows} />);
    const body = container.querySelector("tbody")!;
    expect(body.querySelectorAll("a, button, input, select, [role=button], [tabindex]")).toHaveLength(0);
  });

  it("opens nothing when a row is selected (AC8)", () => {
    render(<HoldingsTable rows={rows} />);
    const row = screen.getAllByRole("row")[1];
    fireEvent.click(row);
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(row.getAttribute("tabindex")).toBeNull();
  });
});
