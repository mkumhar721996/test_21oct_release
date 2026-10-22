import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import Home from "@/app/page";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Suspense } from "react";
import { greeting } from "@/lib/greeting";

const mocks = vi.hoisted(() => ({ getDashboardData: vi.fn() }));
vi.mock("@/lib/portfolio-api", () => ({ getDashboardData: mocks.getDashboardData }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const data = {
  totals: { invested: 9_000_000, currentValue: 10_000_000, returns: 1_000_000 },
  holdings: [
    { symbol: "A", quantity: 2, investedAmount: 1, currentValue: 5_000_000, returns: 100, dayChange: 125_000, dayChangePercent: 1 },
  ],
  sips: [{ id: "s1", symbol: "A", amount: 500_000, dayOfMonth: 1 }],
  stocks: [{ symbol: "A", name: "Alpha", price: 1 }],
};

beforeEach(() => {
  mocks.getDashboardData.mockReset();
});

test("greeting defaults to World", () => {
  expect(greeting()).toBe("Hello, World!");
});

test("home page shows all dashboard blocks on one page", async () => {
  mocks.getDashboardData.mockResolvedValue(data);
  render(await DashboardContent());
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Dashboard");
  expect(screen.getByText("Portfolio value")).toBeTruthy();
  expect(screen.getByText("Today's change")).toBeTruthy();
  expect(screen.getByText("Active SIPs")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Upcoming SIPs" })).toBeTruthy();
  expect(screen.getByRole("table")).toBeTruthy();
});

test("home page shows the failure state and keeps the title when the API fails", async () => {
  mocks.getDashboardData.mockRejectedValue(new Error("down"));
  render(await DashboardContent());
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Dashboard");
  expect(screen.getByRole("alert").textContent).toContain("We couldn't load your dashboard.");
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
});

test("home route suspends on the dashboard skeleton while data loads", () => {
  const el = Home();
  expect(el.type).toBe(Suspense);
  expect(el.props.fallback.type).toBe(DashboardSkeleton);
});
