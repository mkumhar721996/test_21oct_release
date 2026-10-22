summary: |
  Replace the placeholder "Hello, World!" Home route (`apps/web/src/app/page.tsx`) with the Dashboard overview from the approved prototype: a title row with "Start a SIP", three summary tiles (Portfolio value, Today's change, Active SIPs), an "Upcoming SIPs" card and a display-only "Stocks" holdings table, plus the skeleton loading state. The page is a Next.js server component. It composes one `DashboardData` view-model from the Portfolio data endpoints that already exist in the Platform API (`GET /portfolio`, `/holdings`, `/sips`, `/stocks`, merged by STORY-026) and formats paise as Indian-grouped rupees (₹1,00,000). The only API change is one additive field, `todaysChange`, on `GET /portfolio`, because no endpoint exposes today's change yet. The growth chart, empty state and SIP creation are out of scope.

scope:
  - description: |
      Platform API, additive only: expose today's change on `GET /portfolio`. This is the only figure the dashboard needs that the Portfolio data endpoints do not provide today. Add an optional-free numeric `previousValue` (portfolio value at yesterday's close, paise) to each seeded holding, and derive the change in the service.

      ```ts
      // services/api/src/portfolio/portfolio.service.ts
      export interface PortfolioTotals {
        invested: number;
        currentValue: number;
        returns: number;
        todaysChange: { amount: number; percent: number }; // paise; percent of previous value, 2 dp
      }
      ```

      `HoldingView` and the existing totals are unchanged, so current consumers keep working. Seed values are chosen so the change is positive and non-zero.
    files:
      - services/api/src/portfolio/seed-data.ts
      - services/api/src/portfolio/portfolio.service.ts
      - services/api/src/portfolio/portfolio.service.spec.ts
      - services/api/test/portfolio.e2e-spec.ts
    rationale: |
      AC2 needs a today's-change figure and the story says the figure is owned by Portfolio data, so it is served by that module rather than invented in the web app. Additive and covered by the existing service and supertest specs.

  - description: |
      Web view-model types and pure formatters/composers (unit-tested first). Amounts arrive in paise, so every formatter divides by 100.

      ```ts
      export interface DashboardData {
        portfolioValue: number;                                   // paise
        todaysChange: { amount: number; percent: number };        // paise, percent
        activeSips: number;
        upcomingSips: { id: string; name: string; nextDebit: string; amount: number }[]; // ISO yyyy-mm-dd, sorted soonest first
        holdings: { symbol: string; name: string; units: number; currentValue: number; gainLoss: number }[];
      }
      export function formatRupees(paise: number): string;          // 10000000 -> "₹1,00,000"
      export function formatSignedRupees(paise: number): string;    // 125000 -> "+₹1,250", -85000 -> "−₹850", 0 -> "₹0"
      export function formatSignedPercent(p: number): string;       // 1.27 -> "+1.27%"
      export function formatDebitDate(iso: string): string;         // "2026-11-01" -> "1 Nov 2026"
      export function changeDirection(paise: number): "up" | "down" | "flat";
      export function nextDebitDate(dayOfMonth: number, today: Date): string; // today or later
      export function buildDashboard(
        input: { totals: Totals; holdings: HoldingRow[]; sips: SipRow[]; stocks: StockRow[] },
        today: Date,
      ): DashboardData;
      ```

      `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })` for rupees and `Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })` for dates. ASCII "-" is normalised to U+2212 to match the prototype. `buildDashboard` joins holdings and SIPs to `/stocks` by symbol for display names, falls back to the symbol if unknown, sets `activeSips = sips.length` and `gainLoss = returns`.
    files:
      - apps/web/src/lib/dashboard.ts
      - apps/web/tests/unit/dashboard.test.ts
    rationale: |
      AC9 hinges on exact Indian digit grouping and the prototype's formats, and AC3/AC4/AC5 are decided by `buildDashboard`, so this logic lives in one tested module mirroring `apps/web/src/lib/defects.ts`. `today` is injected so date logic is deterministic in tests.

  - description: |
      Server-side fetch client mirroring `getDefects` in `apps/web/src/lib/defects-api.ts` (same `API_BASE_URL` default `http://localhost:3001`, `cache: "no-store"`, throw on non-ok or malformed body). It fetches the four endpoints in parallel and returns the composed view-model.

      ```ts
      export async function getDashboard(today: Date = new Date()): Promise<DashboardData>
      // GET ${base}/portfolio, /holdings, /sips, /stocks via Promise.all
      ```
    files:
      - apps/web/src/lib/dashboard-api.ts
      - apps/web/tests/unit/dashboard-api.test.ts
    rationale: |
      Single mockable seam for the page tests, as `getDefects` is for the defects page.

  - description: |
      Presentational server components, one per prototype block. The catalogue's `defect-table`, `defect-row` and `status-counts` are defect-specific (sortable header, row link, defect statuses) and cannot render display-only rows, and the prototype itself lists `stat-tile` and `holdings-table` as new components, so these are new. `Icon` is not used (the prototype uses text glyphs). No `"use client"`, no handlers.

      - `StatTile` (prototype `.card.stat-tile` with `data-wf-id` portfolio-value / todays-change / active-sips): `primary` adds `.is-primary` so the figure uses `--font-size-xl`. Direction is an aria-hidden ▲/▼ plus the signed text, never colour alone.
      - `UpcomingSips` (prototype `section.card` "Upcoming SIPs" `h3` + `ul.plain-list`): each `li` has `.li-main` with the name and "Next debit 1 Nov 2026" in `text-sm text-muted`, and the amount in `.li-amount`.
      - `HoldingsTable` (prototype `section.card` "Stocks" `h3`, `.table-wrap`, `table.holdings`, columns Fund or stock / Units owned / Current value / Gain or loss, `th scope="col"`): one `tr` per holding, plain `td` text. Gain cell has `.up` / `.down` and an aria-hidden ▲/▼. No links, buttons, `onClick`, `tabIndex`, `role="button"`, hover or pointer cursor, so ACs 7 and 8 hold by construction.
      - `DashboardSkeleton` (prototype "Dashboard, loading"): `.skeleton` blocks (`.sk-line`, `.sk-big`, `.sk-chart` omitted) in three tiles and two lower cards inside `aria-busy="true"`.

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
      Splits the page along the prototype's own blocks so each AC maps to one component test plus a page-level test.

  - description: |
      Replace the Home page. The title row (`h1` "Dashboard" and the single `.btn-primary` "Start a SIP" as a `Link`) and the skeleton fallback sit outside the data fetch, matching the prototype's loading screen ("Start a SIP stays available"). The prototype's growth card is omitted (out of scope).

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
      export async function DashboardContent() { const data = await getDashboard(); /* section.summary, then .lower */ }
      ```

      Order follows the prototype: `section.summary` (aria-label "Portfolio summary") with three tiles, then `.lower` with Upcoming SIPs and Stocks. Suspense rather than `app/loading.tsx` because a root loading file would also wrap `/reports`. `app-shell.tsx` already has Home, so no nav change.
    files:
      - apps/web/src/app/page.tsx
      - apps/web/tests/unit/page.test.tsx
    rationale: |
      The single entry point for AC6 (everything on one page).

  - description: |
      Dashboard styles appended to `globals.css` in the existing token-only plain-class style, ported from the prototype's style block: `.dash-title`, `.summary` (1 column, `2fr 1fr 1fr` from `min-width: 48em`), `.stat-tile`, `.stat-label`, `.stat-value`, `.stat-tile.is-primary .stat-value`, `.stat-sub`, `.up` / `.down`, `.lower` (1 column, `1fr 1.6fr` from 48em), `.plain-list`, `.li-main`, `.li-amount`, `.holdings` (numeric columns right-aligned, first column left), `.sk-line`, `.sk-big`. `.holdings tbody tr` gets `cursor: default` and no `:hover`. The existing `.table-wrap` is reused for horizontal scroll if it carries no defect-only border; otherwise a `.holdings-wrap` with only `overflow-x: auto` is added. Already present: `.stack-lg`, `.btn-primary`, `.card`, `.skeleton`.
    files:
      - apps/web/src/app/globals.css
    rationale: |
      Prototype visual spec: `.up` is `--color-success`, `.down` is `--color-danger`, and 48em is the phone-to-desktop switch from the guidelines.

  - description: |
      End-to-end support. Extend the Playwright stub API with `GET /portfolio`, `/holdings`, `/sips`, `/stocks` (prototype figures: value 10000000 paise, change +125000, 2 SIPs, 3 holdings) and a `POST /__dashboard/:scenario` switch (`default`, `down`) so a negative direction can be asserted. Replace `home.spec.ts` (asserts the removed greeting) with `dashboard.spec.ts`; delete `apps/web/src/lib/greeting.ts` (grep confirms only page.tsx, page.test.tsx and home.spec.ts reference it).

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
      The Next.js server fetches from `API_BASE_URL`, and the existing stub only serves `/defects`.

tests:
  - |
    AC9 (write first, `apps/web/tests/unit/dashboard.test.ts`): Indian grouping of a 1,00,000 portfolio value (10000000 paise).
    ```ts
    expect(formatRupees(10000000)).toBe("₹1,00,000");
    expect(formatRupees(500000)).toBe("₹5,000");
    ```
  - |
    AC1 (`tests/unit/page.test.tsx`, mock `@/lib/dashboard-api` with `vi.hoisted` like `defects-page.test.tsx`): portfolio value shown.
    ```ts
    mocks.getDashboard.mockResolvedValue(sample);
    render(await DashboardContent());
    const tile = screen.getByText("Portfolio value").closest(".stat-tile") as HTMLElement;
    expect(within(tile).getByText("₹1,00,000")).toBeTruthy();
    ```
  - |
    AC2 (`stat-tile.test.tsx`, `dashboard.test.ts`, page test): today's change shown with sign, percent and direction; API exposes it.
    ```ts
    const tile = screen.getByText("Today's change").closest(".stat-tile") as HTMLElement;
    expect(tile.textContent).toContain("+₹1,250");
    expect(tile.textContent).toContain("+1.27% today");
    expect(tile.querySelector(".up")).not.toBeNull();
    expect(formatSignedRupees(-85000)).toBe("−₹850");
    expect(changeDirection(0)).toBe("flat");
    ```
    ```ts
    // services/api/src/portfolio/portfolio.service.spec.ts
    const { todaysChange, currentValue } = service.getTotals();
    expect(todaysChange.amount).toBe(currentValue - sum((h) => h.previousValue));
    expect(todaysChange.amount).not.toBe(0);
    ```
    ```ts
    // services/api/test/portfolio.e2e-spec.ts
    expect((await request(server).get('/portfolio').expect(200)).body.todaysChange).toEqual({ amount: expect.any(Number), percent: expect.any(Number) });
    ```
  - |
    AC3 (`dashboard.test.ts` and page test): two SIPs give an active count of 2.
    ```ts
    expect(buildDashboard({ ...input, sips: twoSips }, today).activeSips).toBe(2);
    const tile = screen.getByText("Active SIPs").closest(".stat-tile") as HTMLElement;
    expect(within(tile).getByText("2")).toBeTruthy();
    ```
  - |
    AC4 (`upcoming-sips.test.tsx`, `dashboard.test.ts`): both SIPs are listed, with the next debit date from `dayOfMonth`.
    ```ts
    render(<UpcomingSips sips={twoSips} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Next debit 1 Nov 2026")).toBeTruthy();
    expect(nextDebitDate(1, new Date(Date.UTC(2026, 9, 22)))).toBe("2026-11-01");
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
    AC7 (`holdings-table.test.tsx`): no action controls on a row.
    ```ts
    const body = screen.getByRole("table").querySelector("tbody") as HTMLElement;
    expect(body.querySelectorAll("a, button, input, select, [role='button'], [tabindex]")).toHaveLength(0);
    ```
  - |
    AC8 (e2e `dashboard.spec.ts`): selecting a row opens nothing.
    ```ts
    await page.goto("/");
    await page.getByRole("row", { name: /HDFC Bank/ }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    ```
  - |
    Loading state (`dashboard-skeleton.test.tsx`, prototype "Dashboard, loading").
    ```ts
    const { container } = render(<DashboardSkeleton />);
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(container.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    ```
  - |
    Client (`dashboard-api.test.ts`): a non-ok response throws, mirroring `defects-api.test.ts`.
    ```ts
    await expect(getDashboard()).rejects.toThrow("GET /portfolio failed with status 500");
    ```

assumptions_or_open_questions:
  - |
    The Platform API already serves `GET /portfolio`, `/holdings`, `/sips`, `/stocks` (STORY-026), all in paise, so I compose the dashboard in the web app rather than add a `/dashboard` endpoint. None of them carries today's change, so I add `todaysChange` to `/portfolio`. Please confirm that belongs in this item and not in a Portfolio data story; if another story adds it, only the API scope item changes.
  - |
    The seed currently has 5 holdings and 3 SIPs, while the ACs and prototype use 3 holdings and 2 SIPs. The dashboard renders whatever the API returns, and the unit and e2e tests use fixtures with 3 and 2. I do not change the seed counts, since the existing API specs assert five holdings.
  - |
    "Active SIPs" is the length of `/sips` and "upcoming" is every SIP, listed soonest first, because SIPs have only `dayOfMonth` and no status or end date. The next debit is the next occurrence of `dayOfMonth` on or after today (UTC). Say if upcoming should be limited to the next N days.
  - |
    Units: the API holds an integer `quantity` per holding, while the prototype shows "312.40" for an index fund. I show the integer as is.
  - |
    Prototype vs scope: the prototype includes a "Portfolio growth" card (static SVG and period chips) but the story excludes the growth chart. I do NOT build it, so there is a layout gap until the sibling story lands.
  - |
    Prototype vs scope: the prototype has a "Start a SIP" primary button but SIP creation is excluded. I render it as a link to `/sips/new`, which 404s until the Start a SIP story lands. Alternative: omit the button. Which do you prefer?
  - |
    Failure behaviour is in neither the ACs nor the prototype, so I add none: if a fetch throws, Next.js shows its default error page. The existing `LoadFailure` component is worded for defects.
  - |
    A zero change renders "₹0" with no arrow or colour; the ACs only cover a changed value. Losses use "−" (U+2212) as in the prototype. The lower-right card is headed "Stocks" as in the prototype, though the story calls it the holdings table.

estimated_points: 5

package_dependencies: []

notes: |
  Research findings: `apps/web/src/app/page.tsx` is the greeting placeholder and `app-shell.tsx` already lists Home. `services/api/src/portfolio/` (controller, service, seed-data, stock-catalogue) serves holdings, SIPs, stocks and totals in paise with no today's-change figure. The defects pages (`apps/web/src/app/defects/page.tsx`, `apps/web/src/lib/defects-api.ts`) set the conventions copied here: async server component, `getX()` fetch helper with `cache: "no-store"`, `vi.hoisted` api mocks, and a stub Platform API for Playwright. Styling is plain token-based classes in `globals.css`, not Tailwind utilities. No new packages: `Intl` is built in.

  Design source: the approved prototype `TEST-21OCT-RELEASE-STORY-029-design.html`, screens "Dashboard" (AC 1-9) and "Dashboard, loading". Elements used: `.dash-title`, `section.summary` with `.card.stat-tile` (portfolio value `.is-primary`, `--font-size-xl`), `.lower` grid (`1fr 1.6fr` from 48em), `.plain-list`, `table.holdings` with `tbody tr { cursor: default }`, `.skeleton` with `.sk-line` / `.sk-big`. Guideline checks: one `.btn-primary`, `.card` groups, a table only for the comparable holdings, `.skeleton` for loading, light theme, sentence-case copy, phone-first.

  ```mermaid
  flowchart TD
    Page["web app/page.tsx (Home)"]:::touched
    WApi["web lib/dashboard-api.ts"]:::touched
    Lib["web lib/dashboard.ts"]:::touched
    Tile["components/dashboard/stat-tile.tsx"]:::touched
    Sips["components/dashboard/upcoming-sips.tsx"]:::touched
    Table["components/dashboard/holdings-table.tsx"]:::touched
    Skel["components/dashboard/dashboard-skeleton.tsx"]:::touched
    Css["app/globals.css"]:::touched
    Stub["tests/e2e/stub-api.mjs"]:::touched
    Ctl["api portfolio.controller.ts"]
    Svc["api portfolio.service.ts"]:::touched
    Seed["api seed-data.ts"]:::touched
    Shell["components/app-shell.tsx (unchanged)"]
    Page -->|"awaits getDashboard"| WApi
    WApi -->|"composes via buildDashboard"| Lib
    WApi -->|"GET /portfolio /holdings /sips /stocks"| Ctl
    Ctl --> Svc
    Svc -->|"adds todaysChange"| Seed
    Page -->|"summary tiles"| Tile
    Page -->|"upcoming list"| Sips
    Page -->|"display-only rows"| Table
    Page -->|"Suspense fallback"| Skel
    Page -.->|"classes"| Css
    WApi -.->|"same routes in e2e"| Stub
    Shell -.->|"links to /"| Page
    classDef touched fill:#f96,color:#000
  ```

review_focus: |
  IN: the five dashboard blocks on the Home route, paise-to-rupee Indian-grouping formatting, the skeleton loading state, the additive `todaysChange` field on `GET /portfolio`, and the e2e stub endpoints. OUT: the growth card, empty state, SIP creation, load-failure UI and any change to seed counts or existing API response fields. The riskiest areas are the new `todaysChange` calculation (paise, percent rounding, zero previous value) and `nextDebitDate` across month ends and UTC. Deliberate: the web app composes the view-model from existing endpoints instead of a new `/dashboard`, holdings rows have no hover, link, button or tabindex (ACs 7 and 8), and Suspense is used instead of a root `loading.tsx` so `/reports` is unaffected.
