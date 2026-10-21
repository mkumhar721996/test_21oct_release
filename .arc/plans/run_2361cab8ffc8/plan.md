summary: |
  Build the Defect list screen in `apps/web` (Next.js App Router, Tailwind, vitest + Playwright) exactly as the approved prototype shows it: a shared top bar with Defects / Reports navigation, a "Defects" title row with a primary "New defect" button, three count tiles (Open / In progress / Closed, computed over ALL defects), a 5-column defect table (Title, Status, Severity, Area, Reported) with only the Reported heading sortable, 20 rows per page newest-first, and a pager ("Previous page" / "Page N of M" / "Next page") with disabled states at the ends. Rows are fully clickable and the title is a real link. Reports is a "Reports coming soon" placeholder route. The work is test-first: pure paging/sort/count logic is unit-tested first, then components, then Playwright e2e against a stubbed Platform API. Search/filters, empty state, load failure, the defect detail page and the new-defect form are out of scope (STORY-015/016 and other items).
scope:
  - description: |
      Pure list logic, no React. Signatures:

      ```ts
      export const PAGE_SIZE = 20;
      export type DefectStatus = "open" | "in_progress" | "closed";
      export type DefectSeverity = "low" | "medium" | "high" | "critical";
      export type SortDir = "desc" | "asc";
      export interface Defect { id: string; title: string; status: DefectStatus; severity: DefectSeverity; area: string; reportedAt: string }
      export interface StatusCounts { open: number; inProgress: number; closed: number }
      export function countByStatus(all: Defect[]): StatusCounts
      export function sortByReported(all: Defect[], dir: SortDir): Defect[]   // desc = newest first, stable
      export function pageOf<T>(all: T[], page: number, size?: number): { rows: T[]; page: number; pageCount: number; from: number; to: number; total: number }
      export function clampPage(raw: string | undefined, pageCount: number): number
      ```
    files:
      - apps/web/src/lib/defects.ts
      - apps/web/tests/unit/defects.test.ts
    rationale: |
      Covers AC 3, 4, 5, 6, 13 (page text inputs), 14, 15 as plain functions so the rules are tested without a DOM. Counts take the full list, so they cannot change with page or sort (prototype note: "counts never change with page or sort").
  - description: |
      Defects data access seam. `getDefects()` calls the Platform API (`GET ${API_BASE_URL}/defects`) and returns `Defect[]`; the page component uses it server-side. Base URL from a server env var (`API_BASE_URL`, default `http://localhost:3001`). The list is fetched once and paged/sorted/counted in `defects.ts`, which keeps ACs 3-6 independent of any API paging contract (see open questions).
    files:
      - apps/web/src/lib/defects-api.ts
      - apps/web/tests/unit/defects-api.test.ts
    rationale: |
      The web app "calls Platform API only" (stack notes). Isolating the fetch lets unit tests stub `fetch` and e2e tests stub the API with Playwright route interception.
  - description: |
      Design tokens + shared top bar. Port the prototype's `:root` tokens (design-system/tokens.css) and the `.btn`, `.badge-*`, `.card`, `.empty-state`, `.skeleton`, `.container`, `.stack` utilities needed here into `globals.css` after `@import "tailwindcss";`, using token custom properties only (light theme only, per UI guidelines). Add `AppShell` (header with brand "Web App" linking to `/`, nav `Home`, `Defects`, `Reports` in `<ul>` with `data-nav-key`, `aria-current="page"` on the active entry, footer "Web App") and wrap `children` in `layout.tsx`. Below 48em the nav collapses behind a menu button (`aria-controls="main-nav"`, `aria-label="Menu"`) as in the prototype `.shell-toggle` / `.shell-nav.is-open`. `AppShell` is a client component (usePathname for active state, useState for the menu).
    files:
      - apps/web/src/app/globals.css
      - apps/web/src/app/layout.tsx
      - apps/web/src/components/app-shell.tsx
      - apps/web/tests/unit/app-shell.test.tsx
    rationale: |
      AC 1 (top bar shows Defects and Reports) and AC 12 (Reports entry). The prototype nav only lists Home; its HTML comment says Defects/Reports "need adding to the shell". UI guidelines say append destinations after Home only when a real route exists, so Defects and Reports are appended after Home now that `/defects` and `/reports` exist.
  - description: |
      Defect list route `/defects` (server component, `searchParams: Promise<{ page?: string; sort?: string }>`) plus presentational components matching the prototype:
      - `page-head`: `<h1>Defects</h1>` and `New defect` as a `.btn-primary` link to `/defects/new` with the plus icon (AC 2). It is the only primary button on the view.
      - `StatusCounts`: `<section aria-label="Defect counts">` with 3 `.card` tiles, each a bold `count-num` (30px `--font-size-xl`, 20px under 40em) above a label with icon (Open / In progress / Closed), 3-column grid.
      - `DefectTable`: `.table-wrap` with `<caption>` "Showing 1-20 of 45 defects, newest first", `<th scope="col">` for Title, Status, Severity, Area as plain text (no button, no `aria-sort`) (AC 11), and a Reported `<th aria-sort>` containing a `.sort-btn` link whose `aria-label` reads "Reported date, sorted newest first. Select to reverse." (AC 10). Rows: title as `<a class="row-link">` with the defect id beneath in muted small text, Status `.badge` (Open = danger, In progress = warning, Closed = success, always with text label and icon), Severity `.badge` (Low/Medium neutral, High warning, Critical danger), Area text, Reported date formatted like "20 Oct 2026" in UTC (AC 9).
      - `DefectRow` (client): `onClick` on `<tr>` calls `router.push(/defects/${id})`; the title link handles its own navigation, and the row handler ignores clicks that originate inside the link to avoid a double push (AC 8). `tr` has `cursor-pointer`, hover surface fill and `:focus-within` ring.
      - `Pager`: `<nav aria-label="Defect list pages">` with "Showing 1-20 of 45", `Previous page` (secondary button, chevron-left), `<span aria-live="polite">Page 2 of 3</span>`, `Next page` (secondary, chevron-right). Enabled controls are `<Link>`s to `?page=n&sort=...`; at the ends they render as `<button disabled>` (AC 7, 13, 14, 15). Changing sort resets to page 1.
      - `loading.tsx`: 8 `.skeleton` rows in the table body and "Loading..." in the page text (prototype loading state).
      - `page.tsx` composes: `getDefects()` -> `countByStatus(all)` -> `sortByReported` -> `clampPage` -> `pageOf`.

      Sort/page state lives in the URL (`?page=2&sort=asc`) so paging and sorting survive reload and Back works. Default is `sort=desc`, page 1.
    files:
      - apps/web/src/app/defects/page.tsx
      - apps/web/src/app/defects/loading.tsx
      - apps/web/src/components/defects/status-counts.tsx
      - apps/web/src/components/defects/defect-table.tsx
      - apps/web/src/components/defects/defect-row.tsx
      - apps/web/src/components/defects/pager.tsx
      - apps/web/tests/unit/status-counts.test.tsx
      - apps/web/tests/unit/defect-table.test.tsx
      - apps/web/tests/unit/defect-row.test.tsx
      - apps/web/tests/unit/pager.test.tsx
    rationale: |
      AC 2-11 and 13-15. Component split mirrors the prototype's `data-wf-id` regions (summary, defect-table, pagination). `Link`-based paging keeps the screen usable without client state while still giving a real `disabled` button at the boundaries.
  - description: |
      Reports placeholder at `/reports`: `<h1>Reports</h1>` and an `.empty-state` card with info icon, `<h2>Reports coming soon</h2>`, the text "We're still building this page. Defect counts are on the Defects page for now." and a secondary "Back to defects" link to `/defects` (AC 12). The prototype's "Back to defects" button only shows a toast in the prototype; the production version is a real link.
    files:
      - apps/web/src/app/reports/page.tsx
      - apps/web/tests/unit/reports-page.test.tsx
    rationale: |
      AC 12.
  - description: |
      Playwright e2e for the user-visible ACs. A helper seeds the stubbed API with `page.route("**/defects", ...)` returning 45 or 21 generated defects (mixed statuses, different dates, stored out of order, like the prototype fixture). Because `getDefects()` runs on the Next server, the e2e web server is started with `API_BASE_URL` pointing at a tiny stub server defined in the Playwright config (see open questions).
    files:
      - apps/web/tests/e2e/defects.spec.ts
      - apps/web/tests/e2e/fixtures.ts
      - apps/web/playwright.config.ts
    rationale: |
      End-to-end proof of ACs 1-15 in a real browser, including keyboard activation of the title link and the whole-row click.
tests:
  - |
    AC 1 - top bar entries. Unit (`app-shell.test.tsx`), written first, fails because `AppShell` doesn't exist:
    ```tsx
    render(<AppShell>{null}</AppShell>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Defects" }).getAttribute("href")).toBe("/defects");
    expect(within(nav).getByRole("link", { name: "Reports" }).getAttribute("href")).toBe("/reports");
    ```
    E2E: `await page.goto("/defects"); await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Defects" })).toHaveAttribute("aria-current", "page");`
  - |
    AC 2 - New defect starts a report. Unit: the page head renders a primary link; E2E clicks it.
    ```ts
    await page.getByRole("link", { name: "New defect" }).click();
    await expect(page).toHaveURL(/\/defects\/new$/);
    ```
  - |
    AC 3 - summary counts over all defects. Unit (`defects.test.ts`):
    ```ts
    const all = [d("open"), d("open"), d("in_progress"), d("closed"), d("closed"), d("closed")];
    expect(countByStatus(all)).toEqual({ open: 2, inProgress: 1, closed: 3 });
    ```
    Component (`status-counts.test.tsx`): `expect(within(screen.getByLabelText("Defect counts")).getByText("In progress").previousElementSibling?.textContent).toBe("12")`. E2E: counts are identical on page 1, page 3 and after reversing sort.
  - |
    AC 4 - 45 defects, first page has 20 rows.
    ```ts
    const p = pageOf(make(45), 1);
    expect(p.rows).toHaveLength(20);
    expect(p.pageCount).toBe(3);
    ```
    E2E: `await expect(page.locator("tbody tr")).toHaveCount(20);`
  - |
    AC 5 - newest first.
    ```ts
    const sorted = sortByReported([old, newest, mid], "desc");
    expect(sorted[0].id).toBe(newest.id);
    ```
    E2E: first row's Reported cell is the latest date in the fixture.
  - |
    AC 6 - 21 defects, every defect once, 20 + 1.
    ```ts
    const all = make(21);
    const p1 = pageOf(sortByReported(all, "desc"), 1), p2 = pageOf(sortByReported(all, "desc"), 2);
    expect([p1.rows.length, p2.rows.length]).toEqual([20, 1]);
    expect(new Set([...p1.rows, ...p2.rows].map((r) => r.id)).size).toBe(21);
    ```
    E2E walks Next from page 1 to the last page and collects titles; asserts 21 unique.
  - |
    AC 7 - Previous page returns to page 1 rows. Pager unit: on page 2 the control is a link to the previous page.
    ```tsx
    render(<Pager page={2} pageCount={3} total={45} from={21} to={40} sort="desc" />);
    expect(screen.getByRole("link", { name: /Previous page/ }).getAttribute("href")).toBe("/defects?page=1&sort=desc");
    ```
    E2E: on page 2 click "Previous page", `toHaveURL(/page=1/)` and first row equals the page 1 first row.
  - |
    AC 8 - whole row and title link open the defect. `defect-row.test.tsx`:
    ```tsx
    const push = vi.fn(); vi.mocked(useRouter).mockReturnValue({ push } as never);
    render(<table><tbody><DefectRow defect={d} /></tbody></table>);
    fireEvent.click(screen.getByRole("row"));
    expect(push).toHaveBeenCalledWith("/defects/DEF-101");
    push.mockClear();
    fireEvent.click(screen.getByRole("link", { name: d.title }));
    expect(push).not.toHaveBeenCalled(); // link navigates itself, no double push
    expect(screen.getByRole("link", { name: d.title }).getAttribute("href")).toBe("/defects/DEF-101");
    ```
    E2E: click a non-link cell (Area) and assert `toHaveURL(/\/defects\/DEF-/)`; separately Tab to the title link and press Enter.
  - |
    AC 9 - row shows title, status, severity, area, reported date.
    ```tsx
    const row = screen.getByRole("row", { name: /Login button unresponsive/ });
    expect(within(row).getByText("Open")).toBeTruthy();
    expect(within(row).getByText("High")).toBeTruthy();
    expect(within(row).getByText("Login")).toBeTruthy();
    expect(within(row).getByText("20 Oct 2026")).toBeTruthy();
    ```
  - |
    AC 10 - Reported heading sorts. Table unit: `expect(screen.getByRole("columnheader", { name: /Reported/ }).getAttribute("aria-sort")).toBe("descending")`; the sort control links to `?sort=asc&page=1`. E2E: click it, assert first row is the OLDEST date and `aria-sort="ascending"`.
  - |
    AC 11 - other headings are not sortable.
    ```tsx
    for (const name of ["Title", "Status", "Severity", "Area"]) {
      const th = screen.getByRole("columnheader", { name });
      expect(within(th).queryByRole("button")).toBeNull();
      expect(within(th).queryByRole("link")).toBeNull();
      expect(th.hasAttribute("aria-sort")).toBe(false);
    }
    ```
  - |
    AC 12 - Reports placeholder. Unit: `render(<ReportsPage />); expect(screen.getByRole("heading", { name: "Reports coming soon" })).toBeTruthy();`. E2E: from `/defects` click the Reports nav link, then `await expect(page.getByRole("heading", { name: "Reports coming soon" })).toBeVisible();`
  - |
    AC 13 - "Page 2 of 3". Pager unit: `expect(screen.getByText("Page 2 of 3")).toBeTruthy();` E2E on `/defects?page=2` with 45 defects, same assertion beside the paging controls.
  - |
    AC 14 - Previous disabled on page 1.
    ```tsx
    render(<Pager page={1} pageCount={3} total={45} from={1} to={20} sort="desc" />);
    expect((screen.getByRole("button", { name: /Previous page/ }) as HTMLButtonElement).disabled).toBe(true);
    ```
  - |
    AC 15 - Next disabled on the last page.
    ```tsx
    render(<Pager page={3} pageCount={3} total={45} from={41} to={45} sort="desc" />);
    expect((screen.getByRole("button", { name: /Next page/ }) as HTMLButtonElement).disabled).toBe(true);
    ```
    Also `clampPage("99", 3)` returns 3 and `clampPage("abc", 3)` returns 1 so a bad `?page=` never breaks the boundary states.
assumptions_or_open_questions:
  - |
    BIGGEST GAP: the repo has no defects backend. `services/api/src` only has `health.controller.ts`, `app.module.ts` and `main.ts`; no entity, no PostgreSQL client, no migrations. This plan covers `apps/web` only and treats `GET /defects` returning `Defect[]` as an external contract. Do you want a Platform API story (or an in-scope minimal `DefectsController`) for this? If it is in scope the estimate goes up (DB schema, driver dependency, supertest e2e).
  - Paging, sorting and counts are done in the web app over the full list, which is fine at prototype scale but won't scale. A server-side contract (`GET /defects?page=&sort=` returning rows + `total` + `counts`) would be better; I need a decision before implementing. Counts must always be across all defects either way (AC 3).
  - The prototype puts Home first in the nav and AC 1 requires Defects and Reports. I keep Home (`/` still shows the starter greeting) and append Defects and Reports after it, per the UI guideline "append after Home". Should `/` redirect to `/defects` and Home be dropped instead?
  - The defect detail route (`/defects/[id]`) and the new-defect form (`/defects/new`) are owned by other items. The row link and New defect link target those paths and will 404 until those items land; e2e asserts only the URL change.
  - The prototype opens a defect with a toast ("Opening DEF-101...") because the detail page didn't exist. I treat the toast as a prototype stand-in and navigate instead; no `.toast` is built.
  - The prototype's "Prototype data" 45 / 21 switcher is marked as a reviewer aid and is NOT built.
  - Dates display as "20 Oct 2026" (en-GB, UTC) as in the prototype; `reportedAt` is an ISO string. Ties in date keep the API order (stable sort).
  - Severity and status label casing/values (`in_progress` etc.) are my guess for the API contract; the UI shows "In progress", "Open", "Closed", "Low/Medium/High/Critical" as in the prototype.
  - The web app currently consumes no design tokens (`globals.css` is only the tailwind import); `design-system/tokens.css` and `prototype-utils.css` exist at the repo root. I assume copying the needed tokens/utilities into `globals.css` is the right integration for this item.
  - Roles (tester, manager, lead): no role-specific behaviour is required by the ACs, so none is planned.
estimated_points: 5
package_dependencies: []
notes: |
  Everything uses packages already in `apps/web/package.json` (next, react, tailwindcss, vitest, jsdom, @testing-library/react, @playwright/test). Unit tests use `fireEvent` from @testing-library/react and plain DOM assertions (no jest-dom / user-event installed), and `vi.mock("next/navigation")` for the router. The vitest include glob `tests/unit/**/*.test.{ts,tsx}` already matches the new files.

  Prototype vs AC check: no conflict found. One deviation by design: the prototype caption also repeats the range ("Showing 1-20 of 45 defects, newest first") and the pager repeats "Showing 1-20 of 45"; both are kept as in the prototype. The prototype's responsive breakpoints are 48em (nav expands) and 40em (smaller count numbers); the table keeps `min-width: 40rem` inside a horizontally scrolling `.table-wrap` so the page never overflows a phone.

  TDD order: (1) `defects.ts` tests, red then green; (2) `app-shell`; (3) `pager`; (4) `defect-row`, `defect-table`, `status-counts`; (5) reports page; (6) `/defects` page composition + loading; (7) Playwright e2e.

  ```mermaid
  flowchart TD
    Layout[src/app/layout.tsx]:::touched --> Shell[components/app-shell.tsx]:::touched
    Layout --> Css[src/app/globals.css]:::touched
    DefectsPage[src/app/defects/page.tsx]:::touched --> Api[lib/defects-api.ts]:::touched
    DefectsPage --> Logic[lib/defects.ts]:::touched
    DefectsPage --> Counts[components/defects/status-counts.tsx]:::touched
    DefectsPage --> Table[components/defects/defect-table.tsx]:::touched
    DefectsPage --> Pager[components/defects/pager.tsx]:::touched
    Table --> Row[components/defects/defect-row.tsx]:::touched
    Shell --> ReportsPage[src/app/reports/page.tsx]:::touched
    Api -.->|GET /defects, not yet in repo| PlatformApi[services/api/src/app.module.ts]
    classDef touched fill:#f96,color:#000
  ```
  Layout and globals.css are touched to host the shared shell and tokens; `defects.ts` holds the counting/sort/paging rules (ACs 3-6, 13-15); `defect-row.tsx` is the only client-side navigation logic (AC 8); the dashed edge shows the API dependency that does not exist yet (`services/api` currently has only `HealthController`).
review_focus: |
  IN scope: web app only - shell nav (Home, Defects, Reports), /defects list with counts, table, 20-per-page newest-first paging, row/title open, Reported-only sorting, and the /reports placeholder. OUT: search/filters, empty state, load-failure UI, defect detail, new-defect form, and any Platform API/DB work (no defects backend exists in the repo; `GET /defects` is an assumed contract). Riskiest areas are the pager boundary states (page clamping, last page of 21 items) and the row click vs title link double-navigation; the counts must stay independent of page and sort. Deliberate: the prototype's toast and 45/21 data switcher are not built, and sort/page live in URL search params.
