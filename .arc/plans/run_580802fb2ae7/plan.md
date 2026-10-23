summary: |
  Add a read-only "Fundraising Consultant" section below the existing fields of the organization detail panel. It shows the assigned consultant's name, email and phone (a dash for a missing email or phone), or "Unassigned" in muted text when there is none. It is visible to WFC Admin and Fundraising Consultant for any organization, and to Org Admin and Org Staff only on their own organization. There is no edit or reassign control. The work is a small presentational component, a pure visibility rule, and a wiring change in the panel, built test-first.
scope:
  - description: |
      Extend the organization detail data type and sample data with an optional consultant.
      Shape: `consultant: { name: string; email: string | null; phone: string | null } | null`.
      Seed at least one organization for each case: full contact, no email, no phone, unassigned.
    files:
      - apps/web/src/lib/organizations.ts
    rationale: |
      The foundation epic owns the sample data and organization types. The new field is additive and optional, so existing entries stay valid.
  - description: |
      Add the pure rule `canViewConsultant(user, organizationId): boolean`.
      It returns true for roles `wfc_admin` and `fundraising_consultant`. For `org_admin` and `org_staff` it returns true only when `user.organizationId === organizationId`.
    files:
      - apps/web/src/lib/consultant-visibility.ts
    rationale: Keeps the role rule unit-testable apart from rendering. It reuses the foundation's role and user types rather than defining new ones.
  - description: |
      New server-renderable component `ConsultantSection({ consultant }: { consultant: Organization["consultant"] })`.
      It renders a `<section className="card stack stack-sm" aria-labelledby="consultant-title">` with an h2 "Fundraising Consultant", mirroring the Attachments and Comments sections in defect-detail-view.
      Name, email and phone are shown as labelled rows.
      A missing email or phone renders "—".
      A null consultant renders `<p className="text-muted">Unassigned</p>`.
      It renders no button, link or input.
    files:
      - apps/web/src/components/organizations/consultant-section.tsx
    rationale: No catalogued component covers a contact block. The markup reuses the existing card, stack and text-muted classes from globals.css, so no new CSS is needed unless the D1 mockup differs.
  - description: |
      In the organization detail panel, render `<ConsultantSection>` after the existing fields, only when `canViewConsultant(currentUser, organization.id)` is true.
    files:
      - apps/web/src/components/organizations/organization-detail-panel.tsx
    rationale: Single wiring point. It gives the "below existing fields" ordering and the role gating.
tests:
  - |
    AC1 (consultant-section.test.tsx), written first and failing:
    ```ts
    render(<ConsultantSection consultant={{ name: "Ada Lovelace", email: "ada@wfc.org", phone: "555-0100" }} />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@wfc.org")).toBeInTheDocument();
    expect(screen.getByText("555-0100")).toBeInTheDocument();
    ```
  - |
    AC2 (panel test):
    ```ts
    const fields = screen.getByTestId("organization-fields");
    const section = screen.getByRole("region", { name: "Fundraising Consultant" });
    expect(fields.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    ```
  - |
    AC3:
    ```ts
    const section = screen.getByRole("region", { name: "Fundraising Consultant" });
    expect(within(section).queryByRole("button")).toBeNull();
    expect(within(section).queryByRole("combobox")).toBeNull();
    expect(within(section).queryByRole("textbox")).toBeNull();
    ```
  - |
    AC4:
    ```ts
    render(<ConsultantSection consultant={null} />);
    expect(screen.getByText("Unassigned")).toHaveClass("text-muted");
    ```
  - |
    AC5 and AC6, no email:
    ```ts
    render(<ConsultantSection consultant={{ name: "Ada", email: null, phone: "555-0100" }} />);
    expect(screen.getByTestId("consultant-email")).toHaveTextContent("—");
    expect(screen.getByText("555-0100")).toBeInTheDocument();
    ```
  - |
    AC7 and AC8, no phone:
    ```ts
    render(<ConsultantSection consultant={{ name: "Ada", email: "ada@wfc.org", phone: null }} />);
    expect(screen.getByTestId("consultant-phone")).toHaveTextContent("—");
    expect(screen.getByText("ada@wfc.org")).toBeInTheDocument();
    ```
  - |
    AC9 (consultant-visibility.test.ts):
    ```ts
    expect(canViewConsultant({ role: "wfc_admin", organizationId: null }, "org-1")).toBe(true);
    expect(canViewConsultant({ role: "fundraising_consultant", organizationId: null }, "org-2")).toBe(true);
    ```
    Plus a panel test that the section renders for those roles.
  - |
    AC10:
    ```ts
    expect(canViewConsultant({ role: "org_admin", organizationId: "org-1" }, "org-1")).toBe(true);
    expect(canViewConsultant({ role: "org_staff", organizationId: "org-1" }, "org-1")).toBe(true);
    ```
    Plus a panel test that the section renders for those roles on their own organization.
  - |
    AC11:
    ```ts
    expect(canViewConsultant({ role: "org_admin", organizationId: "org-1" }, "org-2")).toBe(false);
    expect(canViewConsultant({ role: "org_staff", organizationId: "org-1" }, "org-2")).toBe(false);
    ```
    Plus a panel test:
    ```ts
    expect(screen.queryByRole("region", { name: "Fundraising Consultant" })).toBeNull();
    ```
  - |
    One Playwright spec, apps/web/tests/e2e/organization-consultant.spec.ts. It opens a panel as an Org Admin on their own organization and then on another organization. It asserts the section is shown, then absent. It also asserts the muted "Unassigned" state.
assumptions_or_open_questions:
  - |
    BLOCKER: the foundation epic (organization list, detail panel, roles, sample data) is NOT in this worktree. There is no organization code, role model or panel under apps/web or services/api, only the defects and portfolio features. The file paths above (organizations.ts, organization-detail-panel.tsx, and the role and user types) are placeholders. Before implementing, re-point them to the real foundation files once they are merged. Please confirm the foundation has landed, or give the paths or branch to build on.
  - The D1 mockup is not in the repo (design-system/ has only tokens and guidelines). The layout is assumed to follow the card section pattern from defect-detail-view. Please supply the mockup if it differs.
  - Role identifiers (wfc_admin, fundraising_consultant, org_admin, org_staff) and the user's organizationId field are assumed. Use whatever names the foundation defines.
  - It is assumed that sample data, or a client-side data layer, is sufficient. If the foundation serves organizations from the Platform API, add the consultant field to that response and enforce the role rule server-side too (tenant isolation, ADR-0016). That would raise the estimate.
  - |
    The dash is rendered as the em dash character. Email and phone are plain text, not mailto or tel links, since the ACs do not ask for links.
estimated_points: 3
package_dependencies: []
notes: |
  ### Data & rollout

  None — read-only UI over the foundation's sample data. The consultant field is optional and additive, so existing entries remain valid. There is no migration, setting or provisioning. Rollback is a plain revert. If the foundation turns out to be API-backed (see the open questions), revisit this section.

  Reuse: no catalogued component fits, so one new presentational component is planned. It reuses the existing `card`, `stack`, `text-muted` and `Icon` conventions. If the foundation panel already has a labelled-field-row component, use that for the rows instead of inventing markup.

  ```mermaid
  flowchart TD
    Panel[organization-detail-panel] -->|renders after existing fields| CS[consultant-section]
    Panel -->|gates on| Vis[consultant-visibility]
    Panel -->|reads| Org[organizations data]
    classDef touched fill:#f96,color:#000
    class Panel,CS,Vis,Org touched
  ```
  The nodes are placeholders for the foundation files, which are not yet in the worktree.
review_focus: |
  IN scope: the read-only consultant section, its empty and missing-field states, and the role and own-organization visibility rule. OUT of scope: editing or assigning the consultant, and any API work unless the foundation requires it. The riskiest areas are the own-organization comparison for Org Admin and Org Staff (AC11) and the foundation file paths, which are placeholders because that code is not yet in the repo. The plain-text, non-link contact values are deliberate.
