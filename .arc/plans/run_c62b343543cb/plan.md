summary: |
  Add inline "Assign" and "Change status" actions to the defect detail page (`defect-detail-view`), saving in place and restricted to people holding the tester, manager or lead role. The detail view becomes a client component that owns the displayed assignee/status/version. An inline people list (tester/manager/lead holders plus "Unassigned") and an inline status choice (exactly Open, In progress, Closed) each save through a same-origin Next route handler that forwards to the Platform API with the viewer's session cookie. Saves are optimistic-concurrency checked: the defect `version` the page loaded is sent back, a mismatch returns 409 with the current defect, and the view adopts it (the other person's change is kept). Failures, conflicts and a lost session/role show a persistent `.alert` next to the action that failed and leave assignee/status unchanged. Viewers without a role see both controls disabled. Tests come first: vitest unit tests per module/component and Playwright e2e against the existing stub Platform API, extended with session, people, PATCH and fault-injection endpoints.

scope:
  - description: |
      Types and pure helpers in `apps/web/src/lib/defects.ts`. Add `version: number` to `DefectDetail` and:
      ```ts
      export type Role = "tester" | "manager" | "lead" | "developer" | "reporter";
      export const ASSIGN_ROLES: readonly Role[] = ["tester", "manager", "lead"];
      export interface Person { id: string; name: string; roles: Role[] }
      export interface Viewer { name: string; roles: Role[] }
      export const STATUS_OPTIONS: { value: DefectStatus; label: string }[]; // exactly Open, In progress, Closed
      export function canManageDefect(viewer: Viewer | null): boolean; // any of ASSIGN_ROLES
      ```
    files:
      - apps/web/src/lib/defects.ts
    rationale: |
      Single source for the role rule (AC 1-5, 12, 14) and the three-status list (AC 8). Labels match `STATUS_BADGE` in defect-row.

  - description: |
      Server-side data access in the existing API client:
      ```ts
      export async function getViewer(cookie?: string): Promise<Viewer | null>;      // GET /session, null on 401
      export async function getAssignablePeople(cookie?: string): Promise<Person[]>; // GET /people?roles=tester,manager,lead
      ```
      `getDefect(id)` keeps its signature (payload now carries `version`). The page forwards the incoming `cookie` header so the Platform API sees the viewer's company sign-in session.
    files:
      - apps/web/src/lib/defects-api.ts
    rationale: |
      Mirrors the existing `getDefect` fetch/error pattern (cache no-store, API_BASE_URL).

  - description: |
      Same-origin write endpoint used by the browser. `PATCH /api/defects/[id]` accepts `{ assignee?: string | null; status?: DefectStatus; version: number }`, forwards it with the cookie to `PATCH ${API_BASE_URL}/defects/:id`, and returns the API's DefectDetail JSON on success or a normalised `{ kind: "conflict" | "forbidden" | "unauthenticated" | "failed"; defect?: DefectDetail }` with HTTP 409/403/401/502. Network errors map to `failed`.
    files:
      - apps/web/src/app/api/defects/[id]/route.ts
    rationale: |
      Keeps API_BASE_URL and the session cookie server-side and avoids CORS (the web app talks to the Platform API only). Errors are mapped here so the UI deals in four outcomes, not raw statuses.

  - description: |
      Browser-side client for the two actions; never throws:
      ```ts
      export type SaveResult =
        | { ok: true; defect: DefectDetail }
        | { ok: false; kind: "conflict" | "forbidden" | "unauthenticated" | "failed"; defect?: DefectDetail };
      export function saveDefectChange(id: string, change: { assignee?: string | null; status?: DefectStatus }, version: number): Promise<SaveResult>;
      ```
    files:
      - apps/web/src/lib/defect-actions.ts
    rationale: |
      Isolates fetch and error mapping so the view test can mock one module.

  - description: |
      Extend `DefectDetailView` (add `"use client"`; new props `viewer?: Viewer | null` and `people?: Person[]`, defaulting to null and [] so existing callers/tests still compile). Builds sketch screen `defect-detail`: heading `defect-heading` (h1), `actions` row inside the existing `.page-head` gains `assign-defect` ("Assign", `.btn .btn-secondary`) and `change-status` ("Change status", `.btn .btn-primary`, the only primary on the view), beside the existing "Back to list" `.btn-ghost`. The status badge (`defect-status`, `.badge` via `STATUS_BADGE`) and `defect-assignee` ("Assignee: <name|Unassigned>") stay in the existing meta block, rendered from state. Flow `open-change-status` is the Change status button opening the inline choice; flow `back-to-list` is the existing link to /defects.

      State: `defect` (displayed assignee/status/version), `open: "assign" | "status" | null`, `saving`, `locked` (session/role lost), `errors: { assign?: string; status?: string }`.
      - Assign opens an inline `.dropdown` / `.dropdown-menu.is-open` (`role="menu"` with accessible name, `.dropdown-item` buttons `role="menuitem"`, `aria-checked` on the current one) under the button: "Unassigned" first, then `people` re-filtered with `ASSIGN_ROLES`. Change status opens the same pattern with exactly Open, In progress, Closed. Opening one closes the other; Escape and outside click close; arrow keys move; focus returns to the trigger.
      - Choosing an item calls `saveDefectChange(defect.id, change, defect.version)`. On success re-render from the returned defect and show a transient `.toast` ("Assignee updated" / "Status updated") and close the list. Choosing the current assignee/status closes the list without a request.
      - `failed` -> `.alert .alert-danger role="alert"` inside the failed action's container: "Couldn't save the assignee. Nothing was changed. Try again." (status variant: "Couldn't save the status. Nothing was changed. Try again."); state untouched (AC 6, 7).
      - `conflict` -> `.alert .alert-warning`: "Someone else changed this defect. Their change is kept. Review it above, then choose again."; the view adopts the `defect` from the 409 body, never the attempted value (AC 10, 11).
      - `forbidden` / `unauthenticated` -> `.alert .alert-warning`: "You can no longer assign this defect or change its status. Sign in again or ask a manager about your role."; `locked` disables both buttons (AC 12, 13).
      - Alerts persist until the next action or an explicit dismiss; never auto-hidden (toast is the only transient element).
      - No role / null viewer (AC 5): both buttons `disabled` with `aria-disabled="true"` and helper text "Only testers, managers and leads can assign or change status." linked with `aria-describedby` (`.field-hint`/`.text-sm text-muted` style); lists cannot open.
      - Styling uses existing tokens only (`--space-*`, `--color-*`, `.stack`/`.cluster`, `.page-head`). Phone-first: the actions row wraps under the heading and menus take the row width on narrow screens. Any missing rule goes in globals.css beside the `.dropdown` rules (around line 179).
    files:
      - apps/web/src/components/defects/defect-detail-view.tsx
      - apps/web/src/app/globals.css
    rationale: |
      The catalogue already has `defect-detail-view`, so it is extended, not duplicated. Menus reuse `.dropdown`/`.dropdown-item`; messages use `.alert`; confirmations `.toast`; buttons `.btn-*`, per the UI guidelines. Sketch elements NOT built here (they belong to other stories): breadcrumbs stay as today, tabs (Details/Comments/History), `comment-input`, `post-comment` and the note "Should comments notify the assignee?". Sketch/AC conflict: the sketch shows no error, conflict or list-open states, so those follow the design system patterns above.

  - description: |
      Page wiring: `DefectDetailPage` reads the `cookie` header via `next/headers`, fetches the defect and viewer in parallel, then fetches the people list only when `canManageDefect(viewer)`, and passes `defect`, `viewer`, `people` to the view. The tester/manager/lead-only rule (AC 14) is enforced by the API query and re-filtered with `ASSIGN_ROLES` in the view.
    files:
      - apps/web/src/app/defects/[id]/page.tsx
    rationale: |
      The server component already owns data loading; viewer and people join it so the list opens instantly. The `notFound()` and error behaviour for the defect is unchanged.

  - description: |
      Stub Platform API additions (Playwright test double): `GET /session` (roles from a mutable `session`; 401 when expired), `GET /people` (fixed set including a developer, "Dev Dan", who must be filtered out), `PATCH /defects/:id` with version check (409 with current defect on mismatch and no mutation, 401 when expired, 403 when no role, 500 for id `DEF-FAIL`), `version` and a mutable assignee/status on the detail payload, plus control endpoints `POST /__session/:state` (`tester|developer|expired`), `POST /__bump/:id` (simulates another person's change: bumps version, sets assignee/status) and `POST /__reset`. Add e2e fixtures `setSession`, `bumpDefect`, `resetDefects`.
    files:
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/fixtures.ts
    rationale: |
      Previous stories verified the web app against this stub; the real NestJS service has no defect/session/people endpoints (see open question 1).

  - description: |
      Update existing assertions that say the detail page has no assign/status controls, narrowing them to the comment controls only (`/post comment/i`), and add the new specs listed under `tests`.
    files:
      - apps/web/tests/unit/defect-detail-view.test.tsx
      - apps/web/tests/unit/defect-detail-page.test.tsx
      - apps/web/tests/unit/defect-actions.test.ts
      - apps/web/tests/unit/defects.test.ts
      - apps/web/tests/unit/defects-api.test.ts
      - apps/web/tests/unit/defect-route.test.ts
      - apps/web/tests/e2e/defect-detail.spec.ts
      - apps/web/tests/e2e/defect-assign-status.spec.ts
    rationale: |
      The old "has no assign, status or comment controls" unit test and the `toHaveCount(0)` e2e check become wrong by design. Unit tests use `fireEvent` from `@testing-library/react` because `@testing-library/user-event` is not a dependency.

tests:
  - |
    AC 1 (unit, defect-detail-view.test.tsx): Assign opens the people list. Parametrise viewers `tester`/`manager`/`lead` (any one role is enough).
    ```tsx
    render(<DefectDetailView defect={full} viewer={tester} people={people} />);
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));
    expect(screen.getByRole("menu", { name: /assign/i })).toBeTruthy();
    ```
    Minimal code: `open` state plus the dropdown menu in the view.
  - |
    AC 2 (unit + e2e): choosing a person updates the assignee in place.
    ```tsx
    vi.mocked(saveDefectChange).mockResolvedValue({ ok: true, defect: { ...full, assignee: "Sam Ortiz", version: 2 } });
    fireEvent.click(screen.getByRole("menuitem", { name: "Sam Ortiz" }));
    expect(await screen.findByText("Assignee: Sam Ortiz")).toBeTruthy();
    expect(saveDefectChange).toHaveBeenCalledWith("DEF-101", { assignee: "Sam Ortiz" }, 1);
    ```
    e2e: `await page.getByRole("menuitem", { name: "Sam Ortiz" }).click(); await expect(page.getByText("Assignee: Sam Ortiz")).toBeVisible();`
  - |
    AC 3 (unit): Change status opens the inline status choice.
    ```tsx
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));
    expect(screen.getByRole("menu", { name: /status/i })).toBeTruthy();
    ```
  - |
    AC 4 (unit + e2e): choosing a different status shows it.
    ```tsx
    // mock ok with { ...full, status: "in_progress", version: 2 }
    fireEvent.click(screen.getByRole("menuitem", { name: "In progress" }));
    expect(await screen.findByText("In progress")).toBeTruthy();
    expect(saveDefectChange).toHaveBeenCalledWith("DEF-101", { status: "in_progress" }, 1);
    ```
  - |
    AC 5 (unit + e2e + helper): no-role and null viewers cannot use the controls.
    ```tsx
    render(<DefectDetailView defect={full} viewer={{ name: "Pat", roles: ["developer"] }} people={[]} />);
    expect((screen.getByRole("button", { name: "Assign" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Change status" }) as HTMLButtonElement).disabled).toBe(true);
    ```
    e2e: `await setSession(request, "developer"); await expect(page.getByRole("button", { name: "Assign" })).toBeDisabled();`
    defects.test.ts: `expect(canManageDefect({ name: "x", roles: ["lead"] })).toBe(true); expect(canManageDefect(null)).toBe(false);`
  - |
    AC 6 (unit + e2e): a failure shows a persistent alert beside the failed action.
    ```tsx
    vi.mocked(saveDefectChange).mockResolvedValue({ ok: false, kind: "failed" });
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sam Ortiz" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn't save the assignee.*try again/i);
    expect(within(screen.getByTestId("assign-group")).getByRole("alert")).toBe(alert);
    ```
    e2e: repeat for status on `DEF-FAIL`; `await page.waitForTimeout(1000)` then re-assert the alert is still visible (persistent), mirroring the existing load-failure test.
  - |
    AC 7 (unit + e2e): nothing changes on failure.
    ```tsx
    expect(screen.getByText("Assignee: Dana Lee")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
    ```
    e2e: after the failed save, reload the page and assert the original assignee and status are shown.
  - |
    AC 8 (unit + helper): the status choice is exactly Open, In progress, Closed.
    ```tsx
    const items = within(screen.getByRole("menu", { name: /status/i })).getAllByRole("menuitem");
    expect(items.map((i) => i.textContent?.trim())).toEqual(["Open", "In progress", "Closed"]);
    ```
    defects.test.ts: `expect(STATUS_OPTIONS.map((o) => o.label)).toEqual(["Open", "In progress", "Closed"]);`
  - |
    AC 9 (unit + e2e): Closed to Open.
    ```tsx
    render(<DefectDetailView defect={{ ...full, status: "closed" }} viewer={tester} people={people} />);
    // mock ok with { ...full, status: "open", version: 2 }
    fireEvent.click(screen.getByRole("button", { name: "Change status" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    expect(await screen.findByText("Open")).toBeTruthy();
    ```
  - |
    AC 10 (unit + route + e2e): a stale save shows a persistent message.
    ```tsx
    vi.mocked(saveDefectChange).mockResolvedValue({ ok: false, kind: "conflict", defect: { ...full, assignee: "Lee Chen", version: 3 } });
    expect((await screen.findByRole("alert")).textContent).toMatch(/someone else changed this defect.*choose again/i);
    ```
    defect-route.test.ts: upstream 409 gives `expect(res.status).toBe(409)` and `expect((await res.json()).kind).toBe("conflict")`.
    e2e: load the page, `await bumpDefect(request, "DEF-101", { assignee: "Lee Chen" })`, choose a person, assert the alert.
  - |
    AC 11 (unit + e2e + stub): the other person's change is kept.
    ```tsx
    expect(screen.getByText("Assignee: Lee Chen")).toBeTruthy(); // adopted from the 409 body, not the attempted value
    ```
    e2e: same flow, then `await page.reload(); await expect(page.getByText("Assignee: Lee Chen")).toBeVisible();`. Stub check: a PATCH with an old `version` returns 409 and does not mutate.
  - |
    AC 12 (unit + e2e): session expiry or role removal disables the controls (cases `unauthenticated` and `forbidden`).
    ```tsx
    vi.mocked(saveDefectChange).mockResolvedValue({ ok: false, kind: "unauthenticated" });
    fireEvent.click(screen.getByRole("menuitem", { name: "Sam Ortiz" }));
    await screen.findByRole("alert");
    expect((screen.getByRole("button", { name: "Assign" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Change status" }) as HTMLButtonElement).disabled).toBe(true);
    ```
    e2e: open as tester, `await setSession(request, "expired")`, attempt a save, assert both buttons are disabled.
  - |
    AC 13 (unit + e2e): the message explains they can no longer assign or change status.
    ```tsx
    expect((await screen.findByRole("alert")).textContent).toMatch(/can no longer assign this defect or change its status/i);
    ```
  - |
    AC 14 (unit + api-client + e2e): only tester/manager/lead people are listed.
    ```tsx
    render(<DefectDetailView defect={full} viewer={tester} people={[samTester, { id: "p9", name: "Dev Dan", roles: ["developer"] }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Assign" }));
    expect(screen.queryByRole("menuitem", { name: "Dev Dan" })).toBeNull();
    ```
    defects-api.test.ts: `expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/people?roles=tester,manager,lead"), expect.anything());`
    e2e: `await expect(page.getByRole("menuitem", { name: "Dev Dan" })).toHaveCount(0);`
  - |
    AC 15 (unit): Unassigned choice present and first.
    ```tsx
    const items = within(screen.getByRole("menu", { name: /assign/i })).getAllByRole("menuitem");
    expect(items[0].textContent?.trim()).toBe("Unassigned");
    ```
  - |
    AC 16 (unit + e2e): choosing Unassigned.
    ```tsx
    // mock ok with { ...full, assignee: null, version: 2 }
    fireEvent.click(screen.getByRole("menuitem", { name: "Unassigned" }));
    expect(await screen.findByText("Assignee: Unassigned")).toBeTruthy();
    expect(saveDefectChange).toHaveBeenCalledWith("DEF-101", { assignee: null }, 1);
    ```
  - |
    Supporting, route handler and client lib (defect-route.test.ts, defect-actions.test.ts): upstream 401 gives `kind: "unauthenticated"`, 403 gives `"forbidden"`, 409 gives `"conflict"` with `defect`, 500 or a network error gives `"failed"`. `saveDefectChange("DEF-101", { assignee: null }, 1)` sends `PATCH /api/defects/DEF-101` with body `{"assignee":null,"version":1}`; a rejected fetch resolves to `{ ok: false, kind: "failed" }`.
  - |
    Supporting, page (defect-detail-page.test.tsx): with a mocked tester viewer the page fetches people and passes `viewer`/`people` to the view; with a developer or null viewer it does not call `getAssignablePeople`.
  - |
    Supporting, accessibility (e2e): the menu opens via keyboard (`Enter`), arrow keys move between items, `Escape` closes and returns focus to the trigger; alerts have `role="alert"`; at 375px width `expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)`.

assumptions_or_open_questions:
  - |
    BLOCKING-ish: the repo has no sign-in, session, role or people concept, and the real NestJS Platform API (services/api/src) only has a health controller; `GET /defects` and `GET /defects/:id` exist only in the Playwright stub. This plan builds the web side and extends the stub against the contract below. Is real API work (defect/people/session endpoints, PostgreSQL schema, role check) expected in this item, or tracked as a separate story?
    ```
    GET   /session                          -> 200 { name, roles } | 401
    GET   /people?roles=tester,manager,lead -> 200 Person[]
    PATCH /defects/:id { assignee?, status?, version } -> 200 DefectDetail | 401 | 403 | 409 { defect } | 5xx
    ```
  - |
    Assignee is a display-name string today (`DefectDetail.assignee: string | null`), so the PATCH sends the person's name. If people need a stable id, `assignee` should become `{ id, name } | null`, which would change the existing view tests.
  - |
    Conflict handling uses an integer `version` on the defect and the server returns the current defect in the 409 body. The viewer's own change is not retried automatically (AC 11: the defect keeps the other person's change).
  - |
    Session expiry or role removal is detected when the person next saves (401/403), not by polling, so no live notification is pushed. AC 12/13 are met when they try to act. Say if live detection (polling or focus revalidation) is wanted.
  - |
    Viewers without the role see the controls visible but disabled with an explanatory hint (the AC says "cannot be used"); hiding them is the alternative.
  - |
    Sketch vs. AC/guidelines: the sketch makes Change status the primary button and Assign secondary, which matches the one-`.btn-primary`-per-view rule. The sketch's tabs, `comment-input` and `post-comment` belong to other stories and are not built here; the existing card layout (Attachments, Comments) stays. The sketch shows no error, conflict or list-open states, so those use the design system `.alert`, `.toast` and `.dropdown` patterns.
  - |
    No new npm packages are needed. `@testing-library/user-event` is not installed, so unit tests use `fireEvent`.

estimated_points: 5

package_dependencies: []

notes: |
  Research findings: `defect-detail-view.tsx` is a plain server-friendly view rendered by `app/defects/[id]/page.tsx`; it imports `STATUS_BADGE`/`SEVERITY_BADGE` from `defect-row` and `Icon`. `globals.css` already ships `.dropdown`, `.dropdown-menu.is-open`, `.dropdown-item[aria-checked]`, `.alert-*`, `.toast`, `.btn-*` and `.page-head`, so no new component or token family is needed. The e2e harness runs the stub API (`apps/web/tests/e2e/stub-api.mjs`, port 3101). Scripts in apps/web/package.json: `pnpm test` (vitest run), `pnpm e2e` (playwright test), `pnpm typecheck`.

  Test order (TDD): 1) defects.test.ts helpers, 2) defect-actions and defect-route tests, 3) view unit tests per AC, 4) page and api-client tests, 5) stub plus e2e specs; implement in the same order.

  ```mermaid
  flowchart TD
    Page["app/defects/[id]/page.tsx"] -->|getDefect, getViewer, getAssignablePeople| Api["lib/defects-api.ts"]
    Page --> View["components/defects/defect-detail-view.tsx"]
    View -->|STATUS_BADGE, SEVERITY_BADGE| Row["components/defects/defect-row.tsx"]
    View --> Icon["components/icon.tsx"]
    View -->|saveDefectChange| Actions["lib/defect-actions.ts"]
    Actions -->|PATCH /api/defects/id| Route["app/api/defects/id/route.ts"]
    Route -->|PATCH /defects/id with cookie| Stub["tests/e2e/stub-api.mjs"]
    Api -->|GET /session, /people, /defects/id| Stub
    View --> Types["lib/defects.ts"]
    View --> Css["app/globals.css"]
    Page:::touched
    Api:::touched
    View:::touched
    Actions:::touched
    Route:::touched
    Stub:::touched
    Types:::touched
    Css:::touched
    classDef touched fill:#f96,color:#000
  ```
  Touched: Page (load viewer and people), Api (new fetchers), View (inline menus, state, alerts), Actions (browser client), Route (proxy and error mapping), Stub (test double for the new endpoints), Types (roles, status list, version), Css (only if a menu rule is missing).

review_focus: |
  IN: web-app changes only (view, page, route handlers, client lib, stub API and tests). OUT: tabs, comment posting, and any real NestJS/PostgreSQL defect, people or session endpoints (open question 1 asks whether those are expected here). Riskiest part is the stale-save path (AC 10/11): the view must adopt the server's current defect from the 409 and never overwrite it, and a lost session or role must disable both controls. Deliberate choices: controls are disabled rather than hidden for non-role viewers, failures are detected on save rather than by polling, and the existing "no assign/status controls" assertions are intentionally rewritten.
