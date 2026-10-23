import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConsultantSection } from "@/components/organizations/consultant-section";

describe("ConsultantSection", () => {
  it("shows name, email and phone", () => {
    render(<ConsultantSection consultant={{ name: "Ada Lovelace", email: "ada@wfc.org", phone: "555-0100" }} />);
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
    expect(screen.getByText("ada@wfc.org")).toBeTruthy();
    expect(screen.getByText("555-0100")).toBeTruthy();
  });
  it("shows muted Unassigned when null", () => {
    render(<ConsultantSection consultant={null} />);
    expect(screen.getByText("Unassigned").className).toContain("text-muted");
  });
  it("shows a dash for missing email and keeps phone", () => {
    render(<ConsultantSection consultant={{ name: "Ada", email: null, phone: "555-0100" }} />);
    expect(screen.getByTestId("consultant-email").textContent).toContain("—");
    expect(screen.getByText("555-0100")).toBeTruthy();
  });
  it("shows a dash for missing phone and keeps email", () => {
    render(<ConsultantSection consultant={{ name: "Ada", email: "ada@wfc.org", phone: null }} />);
    expect(screen.getByTestId("consultant-phone").textContent).toContain("—");
    expect(screen.getByText("ada@wfc.org")).toBeTruthy();
  });
  it("has no edit controls", () => {
    render(<ConsultantSection consultant={{ name: "Ada", email: null, phone: null }} />);
    const section = screen.getByRole("region", { name: "Fundraising Consultant" });
    expect(section.querySelector("button, a, input, select, textarea")).toBeNull();
  });
});
