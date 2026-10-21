summary: |
  Add the two remaining states of the defect list (apps/web, Next.js App Router) from the approved prototype. (1) Empty: when the API returns zero defects, /defects renders the heading "Defect list, nothing reported" over an `.empty-state` with the copy "No defects reported yet." and one primary "Report a defect" link to /defects/new. (2) Load failure: when `getDefects()` throws, the page catches it and renders the "Defects" heading plus a `.alert.alert-danger` (role=alert) in the exact place the counts, table and pager would be, containing a "Try again" `.btn-secondary` that re-runs the server render via `router.refresh()`. The app shell (top bar) is untouched because the failure is handled inside the page, not by an error boundary, so the top bar and the "New defect" link stay on screen. Beyond the story's six ACs, this revision adds six proposed supplementary ACs (7-12, listed in the notes) covering retry outcomes, URL/query edge cases, malformed API payloads, double-click, accessibility and phone width. Work is test-first: vitest unit tests for the page, the API client and the two new components, plus Playwright e2e backed by a failure/empty switch on the existing stub API.
scope:
  - description: |
      New server-renderable component `EmptyState` for the zero-defects state. Mirrors the prototype screen "Defect list, nothing reported" (data-wf-id="no-defects"): `.empty-state` containing an info Icon, `<h2>No defects reported yet.</h2>`, the paragraph "Found something that isn't working? Report the first defect and it will show up here for everyone to follow.", and a single `.btn.btn-primary` Link to /defects/new with a plus Icon and the label "Report a defect" (data-wf-id="report-first").
      Signature: `export function EmptyState()` — no props.
    files:
      - apps/web/src/components/defects/empty-state.tsx
    rationale: |
      The component catalogue has no empty-state component, only the `.empty-state` CSS class (already in globals.css line ~280), so a small new component is justified. It reuses the existing `Icon` (info, plus) and the `.btn-primary` class.
  - description: |
      New client component `LoadFailure` ("use client"). Renders the prototype's failed state: `<div className="alert alert-danger" role="alert">` > `.fail-body` > alert Icon, `.text` with `<strong>We couldn't load the defect list.</strong>` and a detail span, and a `.btn.btn-secondary` "Try again" button inside the alert (AC 4). The first detail text is "The server didn't respond. Your defects are safe. Check your connection and try again, or start a new defect report from the top bar." On click it calls `useRouter().refresh()` inside `useTransition`. While pending the button is disabled with the label "Trying again…" (so a double-click cannot fire two refreshes) and the alert is swapped for the prototype's retrying state (`aria-busy="true"` wrapper with `role="status"` aria-label "Loading defects" and four `.skeleton` lines, height var(--size-icon)). If the transition ends and the component is still mounted, the retry failed again, so the detail text becomes "It still didn't load. Wait a moment and try again, or start a new defect report from the top bar." and focus returns to the Try again button (prototype behaviour). A successful retry makes the server render the table (or the empty state), which unmounts this component. The raw error text is never rendered.
      Signature: `export function LoadFailure()`.
    files:
      - apps/web/src/components/defects/load-failure.tsx
    rationale: |
      Try again needs client interactivity; `router.refresh()` re-executes the server component (`fetch` is `cache: "no-store"`) and keeps the current URL and query string, so no client-side data fetching or new API surface is added. `.alert`, `.skeleton`, `.btn-secondary` already exist in globals.css. Not an error.tsx: an error boundary would swallow the page-head New defect link and Next hides server error messages in production.
  - description: |
      Modify the page to branch on three outcomes. Before: `const all = await getDefects();` then always the table layout. After:
      ```tsx
      let all: Defect[] | null = null;
      try {
        all = await getDefects();
      } catch {
        all = null;
      }
      if (all === null) {
        return (
          <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }}>
            <div className="page-head">
              <h1>Defects</h1>
              <Link className="btn btn-primary" href="/defects/new"><Icon name="plus" />New defect</Link>
            </div>
            <LoadFailure />
          </div>
        );
      }
      if (all.length === 0) {
        return (
          <div className="stack stack-lg" style={{ paddingBlock: "var(--space-2)" }}>
            <div className="page-head"><h1>Defect list, nothing reported</h1></div>
            <EmptyState />
          </div>
        );
      }
      ```
      The existing loaded layout is unchanged. The try/catch wraps only the `getDefects()` call, never JSX. Both new branches return before any paging maths, so `?page=` and `?sort=` values (including out-of-range or junk) cannot affect them. The failure branch keeps the existing page-head "New defect" link (AC 6); the empty branch has no page-head button so the view has exactly one primary action ("Report a defect", per the UI guideline of one `.btn-primary` per view).
    files:
      - apps/web/src/app/defects/page.tsx
    rationale: |
      Handling the error in the page keeps the heading, New defect link and the shell on screen, and makes the failure message occupy the spot where counts/table/pager were (the prototype's "memorable" point).
  - description: |
      Harden the API client so a malformed 2xx payload counts as a load failure instead of crashing the page render. Before: `return (await res.json()) as Defect[];`. After:
      ```ts
      const body: unknown = await res.json();
      if (!Array.isArray(body)) throw new Error("GET /defects returned a non-array body");
      return body as Defect[];
      ```
      Signature is unchanged: `export async function getDefects(): Promise<Defect[]>`. Invalid JSON already rejects from `res.json()` and a network error already rejects from `fetch`; both flow into the page's catch.
    files:
      - apps/web/src/lib/defects-api.ts
    rationale: |
      Without this a body such as `{}` or `null` reaches `all.length`/`countByStatus` and throws outside the try/catch, producing Next's generic error page without the top bar content guarantees of AC 5. Element-level validation is deliberately not added (out of scope).
  - description: |
      Add the `.fail-body` layout rules from the prototype to the stylesheet next to the existing `.page-head` rule, using tokens only:
      `.fail-body { display: flex; align-items: flex-start; gap: var(--space-3); flex-wrap: wrap; }`
      `.fail-body .text { flex: 1 1 16rem; display: flex; flex-direction: column; gap: var(--space-1); }`
    files:
      - apps/web/src/app/globals.css
    rationale: |
      Only the failure-body layout is new; `.empty-state`, `.alert*`, `.skeleton`, `.page-head` already exist.
  - description: |
      E2E support. In the stub API add a failure switch: `POST /__fail/on` makes `GET /defects` respond 500, `POST /__fail/off` restores it (default off), and `POST /__seed/:n` also clears it so tests cannot leak state. Add a second mode `POST /__fail/malformed` that makes `GET /defects` respond 200 with the body `{}`. In fixtures add `export async function setApiFailing(request: APIRequestContext, mode: "on" | "off" | "malformed")`. `seedDefects(request, 0)` already yields the empty list because `build(0)` returns [].
    files:
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/fixtures.ts
    rationale: |
      The e2e suite runs `next start` against this stub, so the failure states can only be produced by making the stub API fail. Tests that turn failure on must reset it in `afterEach` so the existing defects.spec.ts is never affected.
  - description: |
      Tests (written first, see `tests`): new unit files for the two components, new cases in the existing page and API-client unit tests, new e2e spec.
    files:
      - apps/web/tests/unit/empty-state.test.tsx
      - apps/web/tests/unit/load-failure.test.tsx
      - apps/web/tests/unit/defects-page.test.tsx
      - apps/web/tests/unit/defects-api.test.ts
      - apps/web/tests/e2e/defects-states.spec.ts
    rationale: |
      Follows the existing layout: tests/unit/*.test.tsx with Testing Library and `vi.mock("next/navigation")`, tests/e2e/*.spec.ts with the stub API.
tests:
  - |
    AC 1 (heading), unit, apps/web/tests/unit/defects-page.test.tsx. The existing file mocks `@/lib/defects-api` once at module level with a fixed list; make the mock controllable with `vi.hoisted` so each test can set `getDefects` to resolve [] or reject (the existing 45-row tests keep their default).
    ```tsx
    mocks.getDefects.mockResolvedValueOnce([]);
    render(await DefectsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Defect list, nothing reported" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    ```
  - |
    AC 2 (prompt to report the first defect), unit, defects-page.test.tsx and empty-state.test.tsx.
    ```tsx
    render(<EmptyState />);
    expect(screen.getByText("No defects reported yet.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Report a defect" }).getAttribute("href")).toBe("/defects/new");
    ```
    e2e (defects-states.spec.ts): `await seedDefects(request, 0); await page.goto("/defects"); await expect(page.getByRole("link", { name: "Report a defect" })).toBeVisible();` and clicking it gives `toHaveURL(/\/defects\/new$/)`.
  - |
    AC 3 (message replaces the table), unit, defects-page.test.tsx.
    ```tsx
    mocks.getDefects.mockRejectedValueOnce(new Error("GET /defects failed with status 500"));
    render(await DefectsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert").textContent).toContain("We couldn't load the defect list.");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByLabelText("Defect counts")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Defect list pages" })).toBeNull();
    ```
    e2e: `await setApiFailing(request, "on"); await page.goto("/defects"); await expect(page.getByRole("alert")).toContainText("We couldn't load the defect list."); await expect(page.locator("table")).toHaveCount(0);`
  - |
    AC 4 (Try again inside the message), unit, load-failure.test.tsx (mock `next/navigation` with `useRouter: () => ({ refresh })`).
    ```tsx
    render(<LoadFailure />);
    const btn = within(screen.getByRole("alert")).getByRole("button", { name: "Try again" });
    await userEvent.click(btn);
    expect(refresh).toHaveBeenCalledTimes(1);
    ```
    e2e: with the API failing, `page.getByRole("alert").getByRole("button", { name: "Try again" })` is visible; then `await setApiFailing(request, "off")` and clicking it shows `page.locator("tbody tr")` with count 20 (retry loads the list, reusing STORY-014 table).
  - |
    AC 5 (top bar remains), e2e (shell is rendered by layout, so unit tests cannot prove it).
    ```ts
    await setApiFailing(request, "on");
    await page.goto("/defects");
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Defects" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
    ```
  - |
    AC 6 (New defect starts a report on failure), unit and e2e.
    ```tsx
    expect(screen.getByRole("link", { name: "New defect" }).getAttribute("href")).toBe("/defects/new");
    ```
    e2e: `await page.getByRole("link", { name: "New defect" }).click(); await expect(page).toHaveURL(/\/defects\/new$/);`
  - |
    AC 7 (proposed): retry that fails again keeps the message and says so. Unit, load-failure.test.tsx: after the click resolves and the component is still mounted,
    ```tsx
    expect(await screen.findByText(/It still didn't load/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Try again" }));
    ```
    e2e: API stays failing, click Try again, `await expect(page.getByRole("alert")).toContainText("It still didn't load")` and the top bar nav is still visible.
  - |
    AC 8 (proposed): while retrying the button is disabled and refresh fires once (double-click edge case). Unit, load-failure.test.tsx with a `refresh` mock whose transition does not settle immediately:
    ```tsx
    await userEvent.dblClick(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status", { name: "Loading defects" }).getAttribute("aria-busy") ?? "true").toBeTruthy();
    ```
    The retrying state is the prototype's `#st-loading` (skeleton lines in a `role="status"` region, wrapper `aria-busy="true"`).
  - |
    AC 9 (proposed): a successful retry moves to the right next state, including empty. e2e: failing API, then `setApiFailing(request, "off")` and `seedDefects(request, 0)`, click Try again, `await expect(page.getByRole("heading", { level: 1, name: "Defect list, nothing reported" })).toBeVisible()` and `await expect(page.getByRole("alert")).toHaveCount(0)`. Same flow with 45 defects shows 20 rows (see AC 4).
  - |
    AC 10 (proposed): query-string edge cases. Unit, defects-page.test.tsx:
    ```tsx
    mocks.getDefects.mockResolvedValueOnce([]);
    render(await DefectsPage({ searchParams: Promise.resolve({ page: "99", sort: "asc" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Defect list, nothing reported" })).toBeTruthy();
    ```
    and the same with `page: "abc"` and `page: "-1"`; with a rejecting `getDefects` and `page: "3"` the alert still renders. e2e: `await page.goto("/defects?page=3&sort=asc")` with failing API shows the alert, and after switching the API on, Try again keeps the URL (`await expect(page).toHaveURL(/page=3/)` — clamped by the existing page logic to the last page for 45 defects).
  - |
    AC 11 (proposed): malformed or unreachable API responses are load failures, never a crash. Unit, defects-api.test.ts:
    ```ts
    it("throws when the body is not an array", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
      await expect(getDefects()).rejects.toThrow(/non-array/);
    });
    it("rejects when the body is not valid JSON", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError("bad json"); } }));
      await expect(getDefects()).rejects.toThrow();
    });
    it("rejects when the network fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
      await expect(getDefects()).rejects.toThrow(/fetch failed/);
    });
    ```
    Page unit: a rejected `getDefects` for each of these renders the alert. e2e: `setApiFailing(request, "malformed")` then `/defects` shows the alert and the top bar. Also assert the raw error is not leaked: `expect(screen.getByRole("alert").textContent).not.toMatch(/500|TypeError|GET \/defects/)`.
  - |
    AC 12 (proposed): single primary action and accessibility/responsive checks. Unit: `expect(container.querySelectorAll(".btn-primary")).toHaveLength(1)` for the empty page; the failure page also has exactly one (New defect), and Try again is `.btn-secondary`; the empty page has exactly one `h1`. e2e: `await expect(page.getByRole("alert")).toBeVisible()` is reachable by keyboard (`await page.keyboard.press("Tab")` loops reach Try again); the empty-page nav marks Defects `aria-current="page"` and Reports navigation works from the failure state (`nav.getByRole("link", { name: "Reports" }).click()` then heading "Reports coming soon"); at 375px width (`page.setViewportSize({ width: 375, height: 800 })`) the Try again button is visible inside the viewport and `document.documentElement.scrollWidth <= window.innerWidth` for both states.
assumptions_or_open_questions:
  - |
    ACs 7-12 are NOT in the story: I derived them from the prototype's retry states, the UI guidelines and edge cases in the code. They are proposed supplementary ACs and need your approval; tell me which to drop. Only AC 11 adds production code beyond the story (a one-line array check in `getDefects`).
  - |
    Prototype vs AC 6 conflict: the prototype's design plan says "New defect is drawn by the shell header, so no second button is built in the content", but the prototype shell actually draws only Web App and Home, and the real AppShell (apps/web/src/components/app-shell.tsx) has no New defect either; today New defect lives in the page's `.page-head` (apps/web/src/app/defects/page.tsx). I am keeping it in `.page-head` on the failure state so AC 6 is satisfiable, and not moving it into the shell (that would change STORY-014 behaviour). Please confirm.
  - |
    The prototype's empty state shows only the heading and the "Report a defect" button, with no page-head New defect, so I follow it (one primary action per view). The prototype's own heading on failure is "Defects" and on empty is "Defect list, nothing reported" (AC 1).
  - |
    "Load failure" is any thrown error from `getDefects()` (non-2xx response, network error, invalid JSON, non-array body). The error is swallowed in the UI and not shown to the user; I assume server-side logging is out of scope.
  - |
    Partially malformed arrays (an array whose elements lack fields) are out of scope and not treated as failure.
  - |
    /defects/new is the target of "start a new defect report", as used by the existing New defect link. That page is not part of this item and may 404 today; the e2e assertion only checks the URL, as the existing defects.spec.ts does.
  - |
    The prototype toast "Defect list loaded" after a successful retry is not built: no AC requires it, and the loaded table appearing is the confirmation. Say if you want it.
  - |
    The toolbar (search/filters) is owned by STORY-015 and is not built here. When it lands, "no results for a filter" is a different state from "nothing reported" and is not covered here.
  - |
    No automatic retry, timeout or auth-failure (401/403) handling: every non-2xx is the same generic failure message.
estimated_points: 3
package_dependencies: []
notes: |
  Next.js server component + one small client island. `getDefects()` (apps/web/src/lib/defects-api.ts) already throws on non-ok responses; this plan adds only a non-array guard. `router.refresh()` re-runs the server render and, because the fetch is `no-store`, re-requests the API; it preserves the URL and query string.

  Reused as-is: AppShell (top bar, untouched), Icon (alert, info and plus names already exist), defect-table, status-counts, pager (only on the loaded path), CSS classes `.empty-state`, `.alert-danger`, `.skeleton`, `.btn-primary`, `.btn-secondary`, `.page-head`. New components are limited to EmptyState and LoadFailure because the catalogue has nothing equivalent.

  Light theme only, token-based styling, phone-first: `.fail-body` wraps so the Try again button drops under the text on narrow widths (flex-basis 16rem on the text block).

  Acceptance criteria summary: 1-6 are from the story; 7 retry fails again, 8 double-click/pending, 9 successful retry incl. empty result, 10 query-string edge cases, 11 malformed/unreachable API, 12 single primary action, keyboard, nav and 375px width are proposed additions.

  ```mermaid
  flowchart TD
    Layout[app/layout.tsx] --> Shell[AppShell top bar]
    Layout --> Page[app/defects/page.tsx]
    Page --> Api[lib/defects-api.ts getDefects]
    Page --> Empty[EmptyState new]
    Page --> Fail[LoadFailure new]
    Page --> Table[DefectTable existing]
    Page --> Counts[StatusCounts existing]
    Page --> Pager[Pager existing]
    Fail --> Router[next/navigation router.refresh]
    Api --> Stub[tests/e2e/stub-api.mjs]
    classDef touched fill:#f96,color:#000
    class Page,Api,Empty,Fail,Stub touched
  ```
  Touched: page.tsx (three-way branch), defects-api.ts (non-array guard), EmptyState and LoadFailure (new states), stub-api.mjs (failure and malformed switches for e2e). globals.css and fixtures.ts are also touched but omitted from the diagram for brevity.
review_focus: |
  IN: the empty state (AC 1-2), the load-failure state with Try again (AC 3-6), and the proposed supplementary ACs 7-12 on /defects only; OUT: search/filter toolbar (STORY-015), the /defects/new form, moving New defect into the shell, auth-specific errors, auto-retry and any toast. Riskiest area: the page.tsx try/catch must wrap only the `getDefects()` call and must not change the loaded layout that the STORY-014 tests pin, and the retry flow (`router.refresh()` inside `useTransition`) must reflect a repeated failure correctly and ignore a second click while pending. Deliberate: failure is handled in the page rather than error.tsx so the heading and New defect link stay visible, the empty branch omits the page-head New defect so there is a single primary action, and the non-array guard in `getDefects` is the only production change outside the new states.
