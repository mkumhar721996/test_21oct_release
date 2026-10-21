import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewDefectPage from "@/app/defects/new/page";

vi.mock("@/app/defects/new/actions", () => ({ createDefectAction: vi.fn() }));

describe("New defect page", () => {
  it("renders breadcrumbs, heading and the form", () => {
    render(<NewDefectPage />);
    expect(screen.getByRole("link", { name: "Defects" }).getAttribute("href")).toBe("/defects");
    expect(screen.getByRole("heading", { level: 1, name: "New defect" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit defect" })).toBeTruthy();
  });
});
