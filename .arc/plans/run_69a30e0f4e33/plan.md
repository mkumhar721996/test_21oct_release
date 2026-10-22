summary: |
  Replace the "Hello, World!" Home route (apps/web/src/app/page.tsx) with the approved Dashboard overview. A server component fetches the already-built Portfolio data endpoints on the Platform API (GET /portfolio, /holdings, /sips, /stocks) and renders, on one page, the portfolio value, today's change, active SIPs count, an upcoming-SIPs list and a display-only holdings table. All figure derivation (rupee formatting from paise, today's change and percent, next debit date) lives in a small pure library that is unit-tested first. No Platform API change is needed; the growth chart, empty state and SIP creation are out of scope.
scope:
  - description: |
      Pure display helpers, written test-first. Money arrives from the API as integer paise, so `formatInr(10000000)` must give "₹1,00,000" (en-IN grouping, 0 fraction digits, per the prototype's ₹1,00,000 / +₹1,250).

      ```ts
      export interface ApiHolding { symbol: string; quantity: number; investedAmount: number; currentValue: number; returns: number; dayChange: number; dayChangePercent: number }
      export interface ApiSip { id: string; symbol: string; amount: number; dayOfMonth: number }
      export interface ApiStock { symbol: string; name: string; price: number }
      export interface ApiTotals { invested: number; currentValue: number; returns: number }

      export function formatInr(paise: number): string                       // "₹1,00,000"
      export function formatSignedInr(paise: number): string                 // "+₹1,250" / "−₹850" (U+2212 minus)
      export function todaysChange(h: ApiHolding[], totalValue: number): { amount: number; percent: number; direction: "up" | "down" | "flat" }
      export function nextDebitDate(dayOfMonth: number, now: Date): Date      // this month if day not passed, else next month; clamped to month length; UTC
      export function formatDebitDate(d: Date): string                        // "1 Nov 2026"
      export function toUpcomingSips(sips: ApiSip[], stocks: ApiStock[], now: Date): UpcomingSip[]   // sorted by next debit date
      export function toHoldingRows(holdings: ApiHolding[], stocks: ApiStock[]): HoldingRow[]       // name from stock catalogue, falls back to symbol
      ```
      todaysChange sums dayChange across holdings; percent = amount / (totalValue - amount) * 100 (0 when the base is 0).
    files:
      - apps/web/src/lib/portfolio.ts
      - apps/web/tests/unit/portfolio.test.ts
    rationale: |
      Keeps the figures logic out of JSX so ACs 1, 2, 3, 4, 5 and 9 are asserted on plain functions. The API's /portfolio totals have no day-change field, but /holdings already carries a per-holding dayChange, so the web derives today's change instead of widening the Platform API (the figures stay owned by the Portfolio data epic).
  - description: |
      Server-side fetch helper that mirrors the existing `getDefects` pattern (API_BASE_URL, `cache: "no-store"`, throw on non-OK or malformed body).

      ```ts
      export interface DashboardData { totals: ApiTotals; holdings: ApiHolding[]; sips: ApiSip[]; stocks: ApiStock[] }
      export async function getDashboardData(): Promise<DashboardData>   // Promise.all over /portfolio, /holdings, /sips, /stocks
      ```
    files:
      - apps/web/src/lib/portfolio-api.ts
      - apps/web/tests/unit/portfolio-api.test.ts
    rationale: |
      Same shape and error behaviour as apps/web/src/lib/defects-api.ts so the page can show one failure state when any of the four calls fails.
  - description: |
      Presentational components, one file each, using tokens and classes only, matching the prototype (screen "Dashboard", data-wf-ids kept as data attributes where useful).
      - stat-tile: `.card.stat-tile` with `.stat-label` and `.stat-value`; `is-primary` variant uses `--font-size-xl` for the Portfolio value tile. Today's change tile adds `.stat-sub` with the percent and the text "today", coloured `.up` (success) or `.down` (danger) and a `▲`/`▼` marked `aria-hidden` (the signed amount carries the meaning, so colour is not the only cue).
      - summary section: `section.summary` with `aria-label="Portfolio summary"`, three tiles (Portfolio value, Today's change, Active SIPs), grid `1fr` on phones and `2fr 1fr 1fr` from `min-width: 48em`.
      - upcoming-sips: `section.card` titled "Upcoming SIPs" (h3), `ul.plain-list`; each `li` has the SIP name plus "Next debit 1 Nov 2026" in `.text-sm.text-muted`, and the amount in `.li-amount`.
      - holdings-table: `section.card` titled "Stocks" (h3), `div.table-wrap` (scrolls horizontally) containing `table.holdings` with `th scope="col"` headers "Fund or stock", "Units owned", "Current value", "Gain or loss"; gain cell coloured `.up`/`.down` with ▲/▼. Rows are plain `tr`/`td`: no links, buttons, onClick, tabIndex, hover style or pointer cursor (ACs 7, 8).
      - dashboard-view: composes the page. `.stack.stack-lg`, `h1` "Dashboard", summary, then `.lower` (single column on phones; `1fr 1.6fr` from 48em) holding Upcoming SIPs beside Stocks.
    files:
      - apps/web/src/components/dashboard/stat-tile.tsx
      - apps/web/src/components/dashboard/upcoming-sips.tsx
      - apps/web/src/components/dashboard/holdings-table.tsx
      - apps/web/src/components/dashboard/dashboard-view.tsx
      - apps/web/tests/unit/stat-tile.test.tsx
      - apps/web/tests/unit/upcoming-sips.test.tsx
      - apps/web/tests/unit/holdings-table.test.tsx
      - apps/web/tests/unit/dashboard-view.test.tsx
    rationale: |
      The component catalogue has no stat tile or display-only holdings table (status-counts and defect-table are defect-specific and defect-table rows are clickable), so these are new, as the prototype's design plan also states. Upcoming SIPs reuses `.card` and a plain list per the guidelines (simple sequence, so no table); holdings are comparable multi-column records so a table is correct.
  - description: |
      Loading and failure states. Loading skeleton follows the prototype screen "Dashboard, loading": title stays, three summary cards with `.skeleton.sk-line` + `.skeleton.sk-big`, then the lower two cards with 3 and 4 `.sk-line`s, container `aria-busy="true"`. Failure reuses `LoadFailure` (apps/web/src/components/defects/load-failure.tsx) extended with optional props so the defect copy stays the default:

      ```tsx
      // before
      export function LoadFailure()
      // after
      export function LoadFailure(props: { title?: string; detail?: string; retriedDetail?: string; loadingLabel?: string })
      ```
      Dashboard copy: title "We couldn't load your dashboard.", detail "The server didn't respond. Your portfolio is safe. Check your connection and try again."
    files:
      - apps/web/src/components/dashboard/dashboard-skeleton.tsx
      - apps/web/src/components/defects/load-failure.tsx
      - apps/web/tests/unit/load-failure.test.tsx
      - apps/web/tests/unit/dashboard-skeleton.test.tsx
    rationale: |
      The guidelines require `.skeleton` for waiting and an inline `.alert` for failure with a next step; reusing LoadFailure avoids a second retry component. The existing load-failure tests must keep passing unchanged for the defaults.
  - description: |
      Home route. `page.tsx` becomes an async server component that renders `<Suspense fallback={<DashboardSkeleton />}>` around an async `DashboardContent` which calls `getDashboardData()`; on throw it renders the title plus `LoadFailure`. The Suspense is inside page.tsx deliberately: a root `app/loading.tsx` would also become the fallback for /reports, which has no loading file of its own.
      The existing `greeting()` helper and its unit test stay untouched; only the Home render test and Home e2e test are replaced.
    files:
      - apps/web/src/app/page.tsx
      - apps/web/tests/unit/page.test.tsx
      - apps/web/tests/e2e/home.spec.ts
    rationale: |
      Home is the only route the dashboard owns (the prototype's top bar lists Home). Server-side fetching matches the defects pages.
  - description: |
      Extend the e2e stub Platform API with the portfolio endpoints and a scenario switch, so Playwright can seed the ACs' data. Endpoints: GET /portfolio, /holdings, /sips, /stocks (same JSON shape as services/api/src/portfolio/portfolio.controller.ts, paise integers). `POST /__portfolio/:scenario` selects "default" (3 holdings, 2 SIPs, value 10000000 paise, day change +125000) or "failing" (500 on all four). Add a fixtures.ts helper `seedPortfolio(request, scenario)`.
    files:
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/fixtures.ts
      - apps/web/src/app/globals.css
    rationale: |
      The Platform API's built-in demo seed has 5 holdings and 3 SIPs, which cannot express the "3 holdings / 2 SIPs / 1,00,000" ACs, so e2e runs against the stub as the defect e2e already does. globals.css gains only the prototype's dashboard rules (`.summary`, `.stat-tile`, `.stat-label`, `.stat-value`, `.stat-sub`, `.up`, `.down`, `.lower`, `.plain-list`, `.li-main`, `.li-amount`, `.holdings`, `.holdings-scroll`, `.sk-line`, `.sk-big`), tokens only. The holdings wrapper class is `holdings-scroll`, not the existing `.table-wrap`, which draws its own border and would double up inside the card.
tests:
  - |
    AC1 (unit, portfolio.test.ts and dashboard-view.test.tsx) fails first because formatInr and DashboardView do not exist:
    ```ts
    expect(formatInr(10_000_000)).toBe("₹1,00,000");
    render(<DashboardView {...data} now={NOW} />);
    expect(screen.getByText("Portfolio value")).toBeTruthy();
    expect(within(screen.getByTestId("portfolio-value")).getByText("₹1,00,000")).toBeTruthy();
    ```
  - |
    AC2 (unit) today's change from holdings whose dayChange sums to 125000 paise on a 10,000,000 total:
    ```ts
    const c = todaysChange(holdings, 10_000_000);
    expect(c.amount).toBe(125_000);
    expect(c.direction).toBe("up");
    expect(formatSignedInr(c.amount)).toBe("+₹1,250");
    expect(c.percent).toBeCloseTo(1.27, 2);
    expect(within(screen.getByTestId("todays-change")).getByText("+₹1,250")).toBeTruthy();
    ```
    Also a negative case: `expect(formatSignedInr(-85_000)).toBe("−₹850")` and `.down` class on the tile.
  - |
    AC3 (unit) two SIPs give a count of 2:
    ```tsx
    render(<DashboardView {...dataWithTwoSips} now={NOW} />);
    expect(within(screen.getByTestId("active-sips")).getByText("2")).toBeTruthy();
    ```
  - |
    AC4 (unit, upcoming-sips.test.tsx) both SIPs listed, with next debit dates, sorted soonest first (NOW = 2026-10-22 UTC):
    ```ts
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Next debit 1 Nov 2026")).toBeTruthy();
    expect(formatDebitDate(nextDebitDate(1, new Date("2026-10-22T00:00:00Z")))).toBe("1 Nov 2026");
    expect(formatDebitDate(nextDebitDate(22, new Date("2026-10-22T00:00:00Z")))).toBe("22 Oct 2026");
    ```
  - |
    AC5 (unit, holdings-table.test.tsx) three holdings give three body rows, named from the stock catalogue:
    ```tsx
    render(<HoldingsTable rows={threeRows} />);
    expect(within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("columnheader", { name: "Gain or loss" })).toBeTruthy();
    ```
  - |
    AC6 (unit page.test.tsx, plus e2e) all five blocks on one page:
    ```tsx
    mocks.getDashboardData.mockResolvedValue(data);
    render(await Home());
    expect(screen.getByText("Portfolio value")).toBeTruthy();
    expect(screen.getByText("Today's change")).toBeTruthy();
    expect(screen.getByText("Active SIPs")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Upcoming SIPs" })).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    ```
    e2e (home.spec.ts): `await seedPortfolio(request, "default"); await page.goto("/"); await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");` then the same five assertions on one page load. Also assert that when any endpoint fails the page shows `getByRole("alert")` with "We couldn't load your dashboard." and a "Try again" button.
  - |
    AC7 (unit holdings-table.test.tsx, plus e2e) no action controls on rows:
    ```tsx
    const { container } = render(<HoldingsTable rows={threeRows} />);
    const body = container.querySelector("tbody")!;
    expect(body.querySelectorAll("a, button, input, select, [role=button], [tabindex]")).toHaveLength(0);
    ```
    e2e: `await expect(page.locator("tbody tr").first().locator("a, button")).toHaveCount(0);`
  - |
    AC8 (e2e home.spec.ts, plus unit) selecting a row opens nothing and does not navigate:
    ```ts
    await page.locator("tbody tr").first().click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    ```
    unit: `fireEvent.click(screen.getAllByRole("row")[1]); expect(pushMock).not.toHaveBeenCalled();` plus `expect(row.getAttribute("tabindex")).toBeNull()`.
  - |
    AC9 (e2e home.spec.ts) with the stub's Portfolio data holding 10000000 paise the page shows the exact figure (formatInr is covered by the AC1 unit test):
    ```ts
    await expect(page.getByTestId("portfolio-value")).toContainText("₹1,00,000");
    ```
  - |
    States and regression guards (unit): loading skeleton has `aria-busy="true"` and no table; `getDashboardData` rejection renders `getByRole("alert")` and keeps the `h1`; the existing load-failure.test.tsx still passes with the default defect copy; `expect(container.querySelectorAll(".btn-primary")).toHaveLength(0)` (no primary action on this page).
assumptions_or_open_questions:
  - |
    PROTOTYPE CONFLICT, "Start a SIP" button. The prototype puts a primary "Start a SIP" button in the title row, but the story scope excludes SIP creation and no Start-a-SIP route exists yet, so a link would be dead. This plan omits it. If you want it kept, I would add a `Link` to the future route (or a disabled button) in the dashboard title row. Please confirm.
  - |
    PROTOTYPE CONFLICT, growth card. The prototype shows a "Portfolio growth" card with chart and period chips as a layout placeholder, but the scope excludes the growth chart (the sibling story owns it). This plan omits the card and leaves the layout order (summary, then SIPs beside Stocks) ready for it to be inserted between them.
  - |
    PROTOTYPE vs SHELL, top bar. The prototype's top bar shows only Home, but the existing app-shell.tsx also lists Defects and Reports. The shell is left unchanged; the prototype's single-item nav appears to be its own simplification.
  - |
    The Platform API has no SIP status or next-debit date. I treat every SIP returned by GET /sips as active and upcoming (active count equals list length), and derive the next debit date from `dayOfMonth` and today (UTC). If the Portfolio data epic adds a status or date field, `toUpcomingSips` is the one place to change.
  - |
    Today's change is derived in the web from the sum of per-holding `dayChange` because GET /portfolio returns only invested, currentValue and returns. The percent uses the previous value (currentValue minus change) as the base. If the reviewer prefers the API to expose this, that would be a small additive change in services/api (portfolio.service.ts getTotals) and is not in this plan.
  - |
    Amounts from the API are integer paise (see services/api/src/portfolio/seed-data.ts and stock-catalogue.ts), displayed in whole rupees with Indian digit grouping, as the prototype does (₹1,00,000, +₹1,250). Fractions of a rupee are rounded for display.
  - |
    A holding row's name comes from GET /stocks by symbol; an unknown symbol falls back to the symbol text. The prototype's "Units owned" maps to `quantity`, "Current value" to `currentValue`, and "Gain or loss" to `returns` (current value minus invested).
  - |
    The built-in demo seed has 5 holdings and 3 SIPs. The "3 holdings / 2 SIPs / 1,00,000" ACs are exercised against fixtures and the e2e stub, not by changing the production seed data.
  - |
    No investor identity or auth exists in the API, so the dashboard shows the single demo portfolio; the empty state (investor with no holdings) is out of scope and is not specially handled.
estimated_points: 5
package_dependencies: []
notes: |
  Everything the plan needs is already in the project: Next.js, Tailwind (only tokens/classes in globals.css are used), vitest with jsdom and Testing Library, and Playwright against the stub API. No new packages.

  Order of work (TDD): 1) portfolio.test.ts then portfolio.ts; 2) portfolio-api.test.ts then portfolio-api.ts; 3) each component test then component; 4) page.test.tsx then page.tsx; 5) stub-api.mjs, fixtures.ts, home.spec.ts and the globals.css rules, then run `pnpm test` and `pnpm exec playwright test tests/e2e/home.spec.ts` in apps/web. Existing e2e specs for the defects pages must stay green; the shared stub keeps its current `/defects` behaviour.

  Accessibility: one `h1`; the three summary figures sit in `section[aria-label="Portfolio summary"]`; tables have `th scope="col"`; up/down is never colour alone (signed amount plus an aria-hidden arrow); focus rings come from the existing `a:focus-visible` rules, and the table adds no focusable elements by design.

  ```mermaid
  flowchart TD
    Page["app/page.tsx (Home route)"]:::touched
    Api["lib/portfolio-api.ts getDashboardData"]:::touched
    Lib["lib/portfolio.ts formatters and derivations"]:::touched
    View["components/dashboard/* view, tiles, SIPs, holdings"]:::touched
    Skel["dashboard-skeleton.tsx"]:::touched
    LF["defects/load-failure.tsx (props added)"]:::touched
    Css["app/globals.css (dashboard rules)"]:::touched
    Stub["tests/e2e/stub-api.mjs (portfolio endpoints)"]:::touched
    Shell["components/app-shell.tsx"]
    Ctrl["services/api portfolio.controller.ts GET /portfolio /holdings /sips /stocks"]
    Page -->|fetch on server| Api
    Api -->|HTTP, API_BASE_URL| Ctrl
    Api -.->|e2e only| Stub
    Page --> View
    Page -->|Suspense fallback| Skel
    Page -->|on fetch failure| LF
    View --> Lib
    View --> Css
    Shell -->|wraps page| Page
    classDef touched fill:#f96,color:#000
  ```
review_focus: |
  IN scope: the Home route dashboard (figures, upcoming SIPs, display-only holdings), its loading and failure states, and the web-side derivations; OUT: growth chart, empty state, Start a SIP button/creation, and any Platform API change. Riskiest areas are the derivations in lib/portfolio.ts (paise to en-IN rupees, signed day change and percent, next debit date near month end) and keeping holdings rows truly inert (no link, button, tabindex, hover or pointer cursor). Deliberate choices: the Start a SIP button and growth card from the prototype are omitted because the story scope excludes them; Suspense lives in page.tsx rather than a root loading.tsx so /reports is unaffected; e2e uses the stub API because the real demo seed does not match the AC data.
