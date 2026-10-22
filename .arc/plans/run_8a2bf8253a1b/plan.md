summary: |
  Replace the placeholder "Hello, World!" Home route (`apps/web/src/app/page.tsx`) with the Dashboard overview from the approved prototype: a title row with "Start a SIP", three summary tiles (Portfolio value, Today's change, Active SIPs), an "Upcoming SIPs" card and a display-only "Stocks" holdings table, plus a skeleton loading state. The page is a Next.js server component that fetches one read-only payload from the Platform API (figures owned by the Portfolio data epic) and formats it in Indian grouping (₹1,00,000). Work is web-app only: no Platform API, database or worker change, because the Portfolio data epic owns the figures. The growth chart, empty state and SIP creation are out of scope.

scope:
  - description: |
      Dashboard data types and formatters (pure functions, unit-tested first).

      ```ts
      export interface DashboardData {
        portfolioValue: number;                       // whole rupees
        todaysChange: { amount: number; percent: number };
        activeSips: number;
        upcomingSips: { id: string; name: string; nextDebitDate: string; amount: number }[]; // ISO yyyy-mm-dd
        holdings: { id: string; name: string; units: string; currentValue: number; gainLoss: number }[];
      }
      export function formatRupees(n: number): string;          // 100000 -> "₹1,00,000"
      export function formatSignedRupees(n: number): string;    // 1250 -> "+₹1,250", -850 -> "−₹850", 0 -> "₹0"
      export function formatSignedPercent(p: number): string;   // 1.27 -> "+1.27%"
      export function formatDebitDate(iso: string): string;     // "2026-11-01" -> "1 Nov 2026"
      export function changeDirection(n: number): "up" | "down" | "flat";
      ```

      Implemented with `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })` and `Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })` (UTC so a date-only string never shifts a day). ASCII "-" from Intl is normalised to U+2212 to match the prototype.
    files:
      - apps/web/src/lib/dashboard.ts
      - apps/web/tests/unit/dashboard.test.ts
    rationale: |
      AC9 hinges on exact Indian digit grouping and the prototype's "+₹1,250" / "+1.27%" / "1 Nov 2026" formats, so formatting lives in one tested module that mirrors `apps/web/src/lib/defects.ts`.

  - description: |
      Server-side fetch client for the dashboard payload, copying the shape of `getDefects` in `apps/web/src/lib/defects-api.ts` (same `API_BASE_URL` default, `cache: "no-store"`, throw on non-ok or malformed body).

      ```ts
      export async function getDashboard(): Promise<DashboardData>   // GET ${API_BASE_URL}/dashboard
      ```
    files:
      - apps/web/src/lib/dashboard-api.ts
      - apps/web/tests/unit/dashboard-api.test.ts
    rationale: |
      Keeps the page free of fetch details and gives AC1-6 and AC9 a single mockable seam, as `getDefects` does for the defects page.

  - description: |
      Presentational components, one per prototype block. All are server components (no `"use client"`, no event handlers). The catalogue's `defect-table`, `defect-row` and `status-counts` are defect-specific (sortable header link, row link, defect statuses) and cannot render display-only rows, and the prototype itself names `stat-tile` and `holdings-table` as new components, so these are new. `Icon` is not needed (the prototype uses text glyphs).

      - `StatTile` (prototype `.card.stat-tile`, `data-wf-id` portfolio-value / todays-change / active-sips): props `{ label, value, sub?, tone?: "up" | "down", primary? }`. `primary` adds `.is-primary` so the figure uses `--font-size-xl`. Direction is a leading aria-hidden ▲/▼ plus the signed text, never colour alone.
      - `UpcomingSips` (prototype `section.card` "Upcoming SIPs" `h3` with `ul.plain-list`): each `li` has `.li-main` with the SIP name and "Next debit 1 Nov 2026" in `text-sm text-muted`, and the amount in `.li-amount`.
      - `HoldingsTable` (prototype `section.card` "Stocks" `h3`, `.holdings-wrap` around `table.holdings`, columns Fund or stock / Units owned / Current value / Gain or loss, `th scope="col"`): one `tr` per holding, plain `td` text only. The gain cell carries `.up` / `.down` and an aria-hidden ▲/▼ glyph as in the prototype's script. No links, buttons, checkboxes, `onClick`, `tabIndex`, `role="button"`, hover or pointer cursor, so ACs 7 and 8 hold by construction.
      - `DashboardSkeleton` (prototype "Dashboard, loading" screen): `.skeleton` blocks sized `.sk-line` / `.sk-big` in three tiles and the two lower cards inside `aria-busy="true"`.

      ```ts
      export function StatTile(props: { label: string; value: string; sub?: string; tone?: "up" | "down"; primary?: boolean }): JSX.Element;
      export function UpcomingSips(props: { sips: DashboardData["upcomingSips"] }): JSX.Element;
      export function HoldingsTable(props: { holdings: DashboardData["holdings"] }): JSX.Element;
      export function DashboardSkeleton(): JSX.Element;
      ```
    files:
      - apps/web/src/components/dashboard/stat-tile.tsx
      - apps/web/src/components/dashboard/upcoming-sips.tsx
      - apps/web/src/components/dashboard/holdings-table.tsx
      - apps/web/src/components/dashboard/dashboard-skeleton.tsx
      - apps/web/tests/unit/stat-tile.test.tsx
      - apps/web/tests/unit/upcoming-sips.test.tsx
      - apps/web/tests/unit/holdings-table.test.tsx
      - apps/web/tests/unit/dashboard-skeleton.test.tsx
    rationale: |
      Splits the page along the prototype's own blocks so each AC maps to one component test plus one page-level test.

  - description: |
      Replace the Home page. The title row (`h1` "Dashboard" and a single `.btn-primary` "Start a SIP" as a `Link`) and the skeleton fallback live outside the data fetch, matching the prototype's loading screen where "Start a SIP stays available". The prototype's growth card is omitted (out of scope).

      ```tsx
      export default function Home() {
        return (
          <div className="stack stack-lg">
            <div className="dash-title">
              <h1>Dashboard</h1>
              <Link className="btn btn-primary" href="/sips/new">Start a SIP</Link>
            </div>
            <Suspense fallback={<DashboardSkeleton />}>
              <DashboardContent />
            </Suspense>
          </div>
        );
      }
      async function DashboardContent() { const data = await getDashboard(); /* summary, lower grid */ }
      ```

      Content order follows the prototype: `section.summary` (aria-label "Portfolio summary") with the three tiles, then `.lower` containing Upcoming SIPs and "Stocks". Suspense is used instead of `app/loading.tsx` because a root-level loading file would also wrap `/reports`, which has no loading state of its own.
    files:
      - apps/web/src/app/page.tsx
      - apps/web/tests/unit/page.test.tsx
    rationale: |
      The ACs' single entry point (AC6: everything on one page). `app-shell.tsx` already has the Home link, so no nav change is needed.

  - description: |
      Dashboard styles appended to `globals.css` in the existing plain-class, token-only style (no ad-hoc colours or margins), ported from the prototype's style block: `.dash-title`, `.summary` (1 column phone-first, `2fr 1fr 1fr` from `min-width: 48em`), `.stat-tile`, `.stat-label`, `.stat-value`, `.stat-tile.is-primary .stat-value`, `.stat-sub`, `.up` / `.down`, `.lower` (1 column, `1fr 1.6fr` from 48em), `.plain-list`, `.li-main`, `.li-amount`, `.holdings` (right-aligned numeric columns, first column left), `.holdings-wrap` (overflow-x: auto only), `.sk-line`, `.sk-big`. `.holdings tbody tr` gets `cursor: default` and no `:hover` rule. The existing `.table-wrap` is bordered and defect-oriented, so a new `.holdings-wrap` is used. Verified: globals.css already has `.stack-lg`, `.btn-primary` and `.skeleton`, but none of the other dashboard classes.
    files:
      - apps/web/src/app/globals.css
    rationale: |
      Prototype visual spec: `.up` is `--color-success`, `.down` is `--color-danger`, cards use `.card` tokens, and 48em is the phone-to-desktop switch the guidelines call out.

  - description: |
      End-to-end support. Extend the Playwright stub Platform API with `GET /dashboard` returning the prototype's data (value 100000, change +1250 / 1.27, 2 active SIPs, 2 upcoming SIPs, 3 holdings), a `POST /__dashboard/:scenario` switch (`default`, `down`), and a fixture helper. Replace `home.spec.ts` (it asserts the removed greeting) with `dashboard.spec.ts`. Delete `apps/web/src/lib/greeting.ts` and the greeting assertion in `page.test.tsx` once a grep confirms nothing else imports it (today only page.tsx, page.test.tsx and home.spec.ts reference it).

      ```ts
      export async function seedDashboard(request: APIRequest, scenario: "default" | "down"): Promise<void>
      ```
    files:
      - apps/web/tests/e2e/stub-api.mjs
      - apps/web/tests/e2e/fixtures.ts
      - apps/web/tests/e2e/dashboard.spec.ts
      - apps/web/tests/e2e/home.spec.ts
      - apps/web/src/lib/greeting.ts
    rationale: |
      The Next.js server fetches from `API_BASE_URL`, so e2e needs a stub endpoint (the existing stub only serves `/defects`). The "down" scenario lets negative-direction rendering be asserted in a browser.

tests:
  - |
    AC9 (write first, `tests/unit/dashboard.test.ts`): Indian grouping.
    ```ts
    expect(formatRupees(100000)).toBe("₹1,00,000");
    expect(formatRupees(5000)).toBe("₹5,000");
    ```
  - |
    AC1 (`tests/unit/page.test.tsx`, mock `@/lib/dashboard-api` with `vi.hoisted` like `defects-page.test.tsx`): the portfolio value is shown.
    ```ts
    mocks.getDashboard.mockResolvedValue(sample);
    render(await Home());   // if Suspense does not resolve under the test renderer, render DashboardContent via an exported async helper
    const tile = screen.getByText("Portfolio value").closest(".stat-tile")!;
    expect(within(tile as HTMLElement).getByText("₹1,00,000")).toBeTruthy();
    ```
  - |
    AC2 (`stat-tile.test.tsx` and page test): today's change shown with sign, percent and direction.
    ```ts
    const tile = screen.getByText("Today's change").closest(".stat-tile") as HTMLElement;
    expect(tile.textContent).toContain("+₹1,250");
    expect(tile.textContent).toContain("+1.27% today");
    expect(tile.querySelector(".up")).not.toBeNull();
    expect(formatSignedRupees(-850)).toBe("−₹850");
    expect(changeDirection(0)).toBe("flat");
    ```
  - |
    AC3 (page test): active SIPs count is 2.
    ```ts
    const tile = screen.getByText("Active SIPs").closest(".stat-tile") as HTMLElement;
    expect(within(tile).getByText("2")).toBeTruthy();
    ```
  - |
    AC4 (`upcoming-sips.test.tsx`): both SIPs are listed.
    ```ts
    render(<UpcomingSips sips={twoSips} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Next debit 1 Nov 2026")).toBeTruthy();
    expect(screen.getByText("₹5,000")).toBeTruthy();
    ```
  - |
    AC5 (`holdings-table.test.tsx`): one body row per holding.
    ```ts
    render(<HoldingsTable holdings={threeHoldings} />);
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4); // header + 3
    expect(screen.getByRole("columnheader", { name: "Units owned" })).toBeTruthy();
    ```
  - |
    AC6 (page test and e2e): all five blocks on the one page.
    ```ts
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeTruthy();
    for (const t of ["Portfolio value", "Today's change", "Active SIPs", "Upcoming SIPs", "Stocks"]) expect(screen.getByText(t)).toBeTruthy();
    ```
    ```ts
    // tests/e2e/dashboard.spec.ts
    await page.goto("/");
    await expect(page.getByText("₹1,00,000")).toBeVisible();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(4);
    await expect(page.locator(".plain-list li")).toHaveCount(2);
    await expect(page.locator(".btn-primary")).toHaveCount(1);
    ```
  - |
    AC7 (`holdings-table.test.tsx`, and e2e): no action controls on a row.
    ```ts
    const body = screen.getByRole("table").querySelector("tbody")!;
    expect(body.querySelectorAll("a, button, input, select, [role='button'], [tabindex]")).toHaveLength(0);
    ```
  - |
    AC8 (e2e `dashboard.spec.ts`, plus a unit assertion that rows carry no handler or link): selecting a row does not navigate or open anything.
    ```ts
    await page.goto("/");
    await page.getByRole("row", { name: /HDFC Bank/ }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    ```
  - |
    Loading state (`dashboard-skeleton.test.tsx`, prototype "Dashboard, loading"): the skeleton reserves every block.
    ```ts
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    ```
  - |
    Client (`dashboard-api.test.ts`): non-ok and non-object bodies throw, mirroring `defects-api.test.ts`.
    ```ts
    await expect(getDashboard()).rejects.toThrow("GET /dashboard failed with status 500");
    ```

assumptions_or_open_questions:
  - |
    The Platform API has no portfolio, SIP or holdings endpoint today (`services/api/src` only has the health controller) and the Portfolio data epic owns those figures. I assumed a single `GET /dashboard` returning the `DashboardData` shape above, with amounts in whole rupees and `units` as a display string (the prototype shows "312.40" next to "22"). Please confirm the real endpoint path and field names, or point me at the Portfolio data contract. If it differs only in names, the change is confined to `dashboard-api.ts`.
  - Amounts are rendered with no decimals (`maximumFractionDigits: 0`), as in the prototype. If Portfolio data can hold paise, say so and I will switch to two decimals.
  - |
    Prototype vs scope: the prototype includes a "Portfolio growth" card (static SVG and period chips), but the story scope excludes the growth chart. I am NOT building that card; the sibling growth story owns it and the prototype marks it a layout placeholder. The page will have a gap where it sits until that story lands.
  - |
    Prototype vs scope: the prototype shows a "Start a SIP" primary button, but SIP creation is excluded. I render it as a link to `/sips/new` (a route the Start a SIP story will own), so until that story merges it leads to a 404. Alternative: omit the button entirely. Which do you prefer?
  - |
    Failure behaviour is not in the ACs or the prototype, so I add none. If `getDashboard()` throws, Next.js shows its default error page. The existing `LoadFailure` component is worded for defects and calls `router.refresh()`; reusing it would need a copy change. Say if you want a dashboard load-failure state in this item.
  - A zero change today renders "₹0" with no arrow and no success/danger colour; AC2 only covers a changed value, so this edge case is my choice.
  - |
    Sign glyph: the prototype uses "−" (U+2212) for losses, while `Intl` emits ASCII "-" under `en-IN`. I normalise it to U+2212 in `formatSignedRupees` to match the prototype.
  - |
    Prototype labels: the lower-right card is headed "Stocks" in the prototype, though the story calls it the holdings table. I follow the prototype copy, and the tests use that heading.

estimated_points: 5

package_dependencies: []

notes: |
  Research findings: `apps/web/src/app/page.tsx` is the greeting placeholder and `app-shell.tsx` already lists Home, so the dashboard slots in with no shell change. The defects pages (`apps/web/src/app/defects/page.tsx`, `apps/web/src/lib/defects-api.ts`) set the conventions this plan copies: async server component, `getX()` fetch helper with `cache: "no-store"`, `vi.hoisted` mocks of the api module in unit tests, a stub Platform API (`tests/e2e/stub-api.mjs`) for Playwright. Styling is plain token-based classes in `globals.css`, not Tailwind utilities, so the dashboard follows that. No new npm packages are needed (`Intl` is built in; Node 22 ships full ICU for `en-IN`).

  Design source: the approved prototype `TEST-21OCT-RELEASE-STORY-029-design.html`, screens "Dashboard" (populated, covers AC 1-9) and "Dashboard, loading". Key elements used: `.dash-title` row; `section.summary` with `.card.stat-tile` tiles (portfolio value has `.is-primary` / `--font-size-xl`), `.lower` grid (`1fr 1.6fr` at 48em and up), `.plain-list` for upcoming SIPs, `table.holdings` with `tbody tr { cursor: default }`, `.skeleton` loading blocks with `.sk-line` / `.sk-big`. Guideline checks: one `.btn-primary`, `.card` for groups, a table only for the comparable multi-column holdings, `.skeleton` for loading, light theme, sentence-case copy, phone-first single column.

  ```mermaid
  flowchart TD
    Page["app/page.tsx (Home)"]:::touched
    Api["lib/dashboard-api.ts"]:::touched
    Lib["lib/dashboard.ts"]:::touched
    Tile["components/dashboard/stat-tile.tsx"]:::touched
    Sips["components/dashboard/upcoming-sips.tsx"]:::touched
    Table["components/dashboard/holdings-table.tsx"]:::touched
    Skel["components/dashboard/dashboard-skeleton.tsx"]:::touched
    Css["app/globals.css"]:::touched
    Stub["tests/e2e/stub-api.mjs"]:::touched
    Shell["components/app-shell.tsx (Home link, unchanged)"]
    DefApi["lib/defects-api.ts (pattern mirrored)"]
    Page -->|"awaits getDashboard"| Api
    Api -->|"returns DashboardData"| Lib
    Page -->|"renders figures"| Tile
    Page -->|"renders upcoming list"| Sips
    Page -->|"renders display-only rows"| Table
    Page -->|"Suspense fallback"| Skel
    Page -.->|"classes"| Css
    Api -.->|"GET /dashboard in e2e"| Stub
    Api -.->|"same fetch conventions"| DefApi
    Shell -.->|"links to /"| Page
    classDef touched fill:#f96,color:#000
  ```

review_focus: |
  IN: the Home route's five dashboard blocks, Indian-grouping formatting, the skeleton loading state, and the e2e stub endpoint. OUT: the growth card, empty state, SIP creation, any Platform API or database work, and any load-failure UI. The riskiest area is the assumed `GET /dashboard` contract, since no Portfolio data endpoint exists yet; field names are a guess confined to `dashboard-api.ts`. Deliberate: the prototype's growth card is omitted because the scope excludes it, holdings rows have no hover, link, button or tabindex (ACs 7 and 8), and Suspense is used instead of a root `loading.tsx` so `/reports` is unaffected.
