import { describe, expect, it } from "vitest";
import {
  formatDebitDate,
  formatInr,
  formatSignedInr,
  nextDebitDate,
  toHoldingRows,
  toUpcomingSips,
  todaysChange,
  type ApiHolding,
} from "@/lib/portfolio";

const NOW = new Date("2026-10-22T00:00:00Z");

function holding(symbol: string, dayChange: number, extra: Partial<ApiHolding> = {}): ApiHolding {
  return {
    symbol,
    quantity: 10,
    investedAmount: 100,
    currentValue: 100,
    returns: 0,
    dayChange,
    dayChangePercent: 0,
    ...extra,
  };
}

describe("formatInr / formatSignedInr", () => {
  it("formats paise as en-IN rupees", () => {
    expect(formatInr(10_000_000)).toBe("₹1,00,000");
    expect(formatInr(0)).toBe("₹0");
    expect(formatInr(12_345_678)).toBe("₹1,23,457");
  });
  it("signs amounts with a real minus", () => {
    expect(formatSignedInr(125_000)).toBe("+₹1,250");
    expect(formatSignedInr(-85_000)).toBe("−₹850");
    expect(formatSignedInr(0)).toBe("₹0");
  });
});

describe("todaysChange", () => {
  it("sums day change and derives the percent on the previous value", () => {
    const c = todaysChange([holding("A", 100_000), holding("B", 25_000)], 10_000_000);
    expect(c.amount).toBe(125_000);
    expect(c.direction).toBe("up");
    expect(c.percent).toBeCloseTo(1.27, 2);
  });
  it("is down for a loss and flat for none", () => {
    expect(todaysChange([holding("A", -85_000)], 1_000_000).direction).toBe("down");
    const flat = todaysChange([holding("A", 0)], 0);
    expect(flat).toEqual({ amount: 0, percent: 0, direction: "flat" });
  });
});

describe("nextDebitDate", () => {
  it("uses this month when the day has not passed, else next month", () => {
    expect(formatDebitDate(nextDebitDate(1, NOW))).toBe("1 Nov 2026");
    expect(formatDebitDate(nextDebitDate(22, NOW))).toBe("22 Oct 2026");
    expect(formatDebitDate(nextDebitDate(15, NOW))).toBe("15 Nov 2026");
  });
  it("rolls over the year and clamps to month length", () => {
    expect(formatDebitDate(nextDebitDate(5, new Date("2026-12-20T00:00:00Z")))).toBe("5 Jan 2027");
    expect(formatDebitDate(nextDebitDate(31, new Date("2026-11-10T00:00:00Z")))).toBe("30 Nov 2026");
    expect(formatDebitDate(nextDebitDate(31, new Date("2027-01-31T10:00:00Z")))).toBe("31 Jan 2027");
    expect(formatDebitDate(nextDebitDate(30, new Date("2027-01-31T10:00:00Z")))).toBe("28 Feb 2027");
  });
});

describe("toUpcomingSips", () => {
  it("names SIPs from the catalogue and sorts soonest first", () => {
    const stocks = [{ symbol: "HDFCBANK", name: "HDFC Bank", price: 1 }];
    const rows = toUpcomingSips(
      [
        { id: "s2", symbol: "HDFCBANK", amount: 300_000, dayOfMonth: 15 },
        { id: "s1", symbol: "NIFTY", amount: 500_000, dayOfMonth: 1 },
      ],
      stocks,
      NOW,
    );
    expect(rows.map((r) => r.id)).toEqual(["s1", "s2"]);
    expect(rows[0]).toMatchObject({ name: "NIFTY", amount: "₹5,000", nextDebit: "1 Nov 2026" });
    expect(rows[1]).toMatchObject({ name: "HDFC Bank", amount: "₹3,000", nextDebit: "15 Nov 2026" });
  });
});

describe("toHoldingRows", () => {
  it("builds one row per holding with name, units, value and gain", () => {
    const rows = toHoldingRows(
      [
        holding("A", 0, { quantity: 22, currentValue: 3_500_000, returns: 230_000 }),
        holding("B", 0, { currentValue: 2_000_000, returns: -85_000 }),
      ],
      [{ symbol: "A", name: "Alpha Ltd", price: 1 }],
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      symbol: "A",
      name: "Alpha Ltd",
      units: "22",
      value: "₹35,000",
      gain: "+₹2,300",
      direction: "up",
    });
    expect(rows[1]).toMatchObject({ name: "B", gain: "−₹850", direction: "down" });
  });
});
