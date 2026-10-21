import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ReportsPage from "@/app/reports/page";

describe("ReportsPage", () => {
  it("shows the Reports coming soon placeholder (AC 12)", () => {
    render(<ReportsPage />);
    expect(screen.getByRole("heading", { name: "Reports coming soon" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to defects" }).getAttribute("href")).toBe("/defects");
  });
});
