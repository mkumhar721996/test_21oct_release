import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/defects/empty-state";

describe("EmptyState", () => {
  it("prompts to report the first defect", () => {
    render(<EmptyState />);
    expect(screen.getByText("No defects reported yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Report a defect" }).getAttribute("href")).toBe("/defects/new");
  });
});
