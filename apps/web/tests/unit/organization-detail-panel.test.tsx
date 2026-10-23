import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrganizationDetailPanel } from "@/components/organizations/organization-detail-panel";
import type { Organization } from "@/lib/organizations";

const org: Organization = {
  id: "org-1",
  name: "Hope Trust",
  consultant: { name: "Ada Lovelace", email: "ada@wfc.org", phone: "555-0100" },
};
const region = { name: "Fundraising Consultant" };

describe("OrganizationDetailPanel consultant section", () => {
  it("appears below the existing fields", () => {
    render(<OrganizationDetailPanel organization={org} currentUser={{ role: "wfc_admin", organizationId: null }} />);
    const fields = screen.getByTestId("organization-fields");
    const section = screen.getByRole("region", region);
    expect(fields.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it.each(["wfc_admin", "fundraising_consultant"] as const)("shows for %s", (role) => {
    render(<OrganizationDetailPanel organization={org} currentUser={{ role, organizationId: null }} />);
    expect(screen.getByRole("region", region)).toBeTruthy();
  });
  it.each(["org_admin", "org_staff"] as const)("shows for %s on own organization", (role) => {
    render(<OrganizationDetailPanel organization={org} currentUser={{ role, organizationId: "org-1" }} />);
    expect(screen.getByRole("region", region)).toBeTruthy();
  });
  it.each(["org_admin", "org_staff"] as const)("hides for %s on another organization", (role) => {
    render(<OrganizationDetailPanel organization={org} currentUser={{ role, organizationId: "org-2" }} />);
    expect(screen.queryByRole("region", region)).toBeNull();
  });
});
