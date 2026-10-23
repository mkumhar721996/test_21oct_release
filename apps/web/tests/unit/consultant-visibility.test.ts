import { describe, expect, it } from "vitest";
import { canViewConsultant } from "@/lib/consultant-visibility";

describe("canViewConsultant", () => {
  it("allows WFC staff roles for any organization", () => {
    expect(canViewConsultant({ role: "wfc_admin", organizationId: null }, "org-1")).toBe(true);
    expect(canViewConsultant({ role: "fundraising_consultant", organizationId: null }, "org-2")).toBe(true);
  });
  it("allows organization roles on their own organization", () => {
    expect(canViewConsultant({ role: "org_admin", organizationId: "org-1" }, "org-1")).toBe(true);
    expect(canViewConsultant({ role: "org_staff", organizationId: "org-1" }, "org-1")).toBe(true);
  });
  it("denies organization roles on another organization", () => {
    expect(canViewConsultant({ role: "org_admin", organizationId: "org-1" }, "org-2")).toBe(false);
    expect(canViewConsultant({ role: "org_staff", organizationId: "org-1" }, "org-2")).toBe(false);
  });
});
