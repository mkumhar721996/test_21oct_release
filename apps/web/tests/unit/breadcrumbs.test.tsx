import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumbs } from "@/components/breadcrumbs";

describe("Breadcrumbs", () => {
  it("links earlier crumbs and marks the last as the current page", () => {
    render(<Breadcrumbs items={[{ label: "Defects", href: "/defects" }, { label: "New defect" }]} />);
    expect(screen.getByRole("link", { name: "Defects" }).getAttribute("href")).toBe("/defects");
    expect(screen.getByText("New defect").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("link", { name: "New defect" })).toBeNull();
  });
});
