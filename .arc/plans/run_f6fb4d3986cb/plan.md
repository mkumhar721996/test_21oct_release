summary: |
  Run each active monthly SIP on its scheduled day as a simulated fractional purchase inside the Platform API portfolio module, which owns the in-memory holdings, SIPs and (via `PriceFeedService`) the simulated prices. A pure date helper decides whether a SIP is due (latest scheduled date on or before today, not yet run). A new `PortfolioService.runDueSips(today)` buys `amount / currentPrice` shares at the live feed price, adding to an existing holding or creating a new one. A small Nest `SipScheduler` provider calls it once at application bootstrap (catch-up, at most one purchase per SIP) and then on an hourly tick. Holdings values and portfolio totals are already derived from `quantity` and the feed price, so they update with no extra work. SIP creation, price simulation, persistence and a cash balance are out of scope.

scope:
  - description: |
      Extend the `Sip` seed type with the fields the scheduler needs and update the three demo SIPs.

      ```ts
      export interface Sip {
        id: string;
        symbol: string;
        amount: number;          // minor units (paise)
        dayOfMonth: number;      // stored as-is; only 1-28 ever runs
        frequency: 'monthly' | 'weekly' | 'daily';
        active: boolean;
        lastRunOn: string | null; // 'YYYY-MM-DD' (UTC) of the scheduled date last executed
      }
      ```

      Demo SIPs become `frequency: 'monthly', active: true, lastRunOn: null`.
    files:
      - services/api/src/portfolio/seed-data.ts
    rationale: |
      Without a frequency, active flag and last-run marker the scheduler can neither skip non-monthly SIPs (AC8) nor stay idempotent (AC2, AC9). The existing GET /sips response gains these fields additively.

  - description: |
      New pure module with the date rules. No I/O and no Nest imports.

      ```ts
      export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

      /** Latest scheduled date (YYYY-MM-DD, UTC) on or before `today`, or null if the SIP never runs. */
      export function latestScheduledDate(sip: Sip, today: Date): string | null;

      /** The scheduled date this SIP should execute for now, or null. */
      export function dueDate(sip: Sip, today: Date): string | null;
      ```

      Rules. Return null unless `sip.active && sip.frequency === 'monthly' && Number.isInteger(sip.dayOfMonth) && sip.dayOfMonth >= 1 && sip.dayOfMonth <= 28`. The scheduled date D is in this month if `today.getUTCDate() >= dayOfMonth`, otherwise in the previous month (build it with `Date.UTC(y, m - 1, day)` so January rolls back to December of the prior year). Due if `lastRunOn === null ? D === isoDate(today) : lastRunOn < D` (ISO strings compare chronologically). This one rule serves the scheduled day (AC1, AC6), the repeat on the same day (AC2), and catch-up after downtime (AC9, one date returned however many were missed).
    files:
      - services/api/src/portfolio/sip-schedule.ts
      - services/api/src/portfolio/sip-schedule.spec.ts
    rationale: |
      Keeps the day-1-28 / monthly-only / idempotence logic in one unit-testable place that the service shares.

  - description: |
      Make `PortfolioService` hold mutable state copied from a seed and add the purchase. The constructor today is `constructor(private readonly feed: PriceFeedService)` and builds `holdings` from `DEMO_HOLDINGS`; `listSips()` returns `[...DEMO_SIPS]`. Keep `new PortfolioService(feed)` working, because `portfolio.service.spec.ts` and `portfolio-history.service.spec.ts` call it that way.

      ```ts
      export const PORTFOLIO_SEED = Symbol('PORTFOLIO_SEED');
      export interface PortfolioSeed { holdings: Holding[]; sips: Sip[] }

      constructor(
        private readonly feed: PriceFeedService,
        @Optional() @Inject(PORTFOLIO_SEED) seed?: PortfolioSeed,
      )  // seed defaults to DEMO_HOLDINGS / DEMO_SIPS; both are deep-copied

      runDueSips(today: Date): { sipId: string; symbol: string; scheduledOn: string }[]
      ```

      For each SIP with `dueDate(sip, today)` non-null and a symbol present in `CATALOGUE`, take `price = this.feed.getPrice(sip.symbol)`, buy `q = sip.amount / price`, then add to the existing holding (`quantity += q`, `investedAmount += sip.amount`) or push `{ symbol, quantity: q, investedAmount: sip.amount }`. Finally set `sip.lastRunOn = scheduledOn`. There is no cash check, because no cash balance exists in the model (AC5). `currentValue` is NOT stored. `listHoldings` already derives it as `quantity * feed price`, and `getTotals` sums that, so holdings and portfolio value reflect the purchase (AC4). `listSips()` returns copies of the mutable SIPs.
    files:
      - services/api/src/portfolio/portfolio.service.ts
      - services/api/src/portfolio/portfolio.service.spec.ts
    rationale: |
      The portfolio epic owns the data, and this service is the single place holdings and totals are computed. The `@Optional() @Inject` token lets tests and the e2e spec supply a seed without breaking Nest DI, which cannot resolve an interface-typed constructor parameter.

  - description: |
      New Nest provider that triggers the runs, plus module wiring.

      ```ts
      export const CLOCK = Symbol('CLOCK');

      @Injectable()
      export class SipScheduler implements OnApplicationBootstrap, OnModuleDestroy {
        constructor(
          private readonly portfolio: PortfolioService,
          @Optional() @Inject(CLOCK) private readonly now: () => Date = () => new Date(),
        ) {}
        onApplicationBootstrap(): void   // runDueSips(now()) once (catch-up), then setInterval hourly, unref'd
        onModuleDestroy(): void          // clearInterval
      }
      ```

      In `PortfolioModule.providers` add `SipScheduler`, a default `{ provide: CLOCK, useValue: () => new Date() }` and a default `{ provide: PORTFOLIO_SEED, useFactory: () => ({ holdings: [...DEMO_HOLDINGS], sips: [...DEMO_SIPS] }) }`. Registering the tokens, rather than relying on `@Optional`, is what lets the e2e spec use `overrideProvider`. The hourly tick calls the same idempotent `runDueSips`, so a SIP buys once per scheduled date however often the tick fires. No new dependency, plain `setInterval` (same style as `PriceFeedService`).
    files:
      - services/api/src/portfolio/sip-scheduler.ts
      - services/api/src/portfolio/sip-scheduler.spec.ts
      - services/api/src/portfolio/portfolio.module.ts
    rationale: |
      Gives the "app starts" catch-up (AC9) and the "date arrives" trigger (AC1) without pulling in @nestjs/schedule. An injectable clock makes both testable with fixed dates.

  - description: |
      End-to-end check through HTTP. Build a testing module from `AppModule` with `PORTFOLIO_SEED` and `CLOCK` overridden, call `app.init()`, stop the price timer as `portfolio.e2e-spec.ts` does (`app.get(PriceFeedService).onModuleDestroy()`), and assert on `GET /holdings` and `GET /portfolio`.
    files:
      - services/api/test/sip-purchases.e2e-spec.ts
    rationale: |
      Proves the bootstrap hook fires and the new state is visible through the endpoints the dashboard will read. The existing `portfolio.e2e-spec.ts` is left unchanged.

tests:
  - |
    AC1 (sip-schedule.spec.ts and portfolio.service.spec.ts). A day-15 monthly SIP on 2026-10-15 buys the full amount as fractional shares at the feed price. The feed is `new PriceFeedService(() => 1)` with no tick, so ITC is at its base price of 46000.

    ```ts
    const sip = { id: 's', symbol: 'ITC', amount: 300000, dayOfMonth: 15, frequency: 'monthly', active: true, lastRunOn: null } as const;
    const svc = new PortfolioService(new PriceFeedService(() => 1), { holdings: [], sips: [{ ...sip }] });
    svc.runDueSips(new Date('2026-10-15T00:00:00Z'));
    const h = svc.listHoldings().find((x) => x.symbol === 'ITC')!;
    expect(h.quantity).toBeCloseTo(300000 / 46000, 10);
    expect(h.investedAmount).toBe(300000);
    ```
  - |
    AC2. Running twice for the same date buys once, and a later tick in the same month is a no-op.

    ```ts
    svc.runDueSips(new Date('2026-10-15T00:00:00Z'));
    const after = svc.listHoldings();
    svc.runDueSips(new Date('2026-10-15T12:00:00Z'));
    svc.runDueSips(new Date('2026-10-20T00:00:00Z'));
    expect(svc.listHoldings()).toEqual(after);
    expect(svc.listSips()[0].lastRunOn).toBe('2026-10-15');
    ```
  - |
    AC3. A stock not currently held appears as a new holding.

    ```ts
    const svc = new PortfolioService(feed, { holdings: [], sips: [{ ...sip, symbol: 'WIPRO' }] });
    svc.runDueSips(new Date('2026-10-15T00:00:00Z'));
    expect(svc.listHoldings().map((h) => h.symbol)).toEqual(['WIPRO']);
    ```
  - |
    AC4. Shares, invested amount and portfolio value all reflect the purchase on an already-held stock (seeded ITC is 30 shares, 1200000 invested).

    ```ts
    const before = svc.getTotals();
    svc.runDueSips(new Date('2026-10-15T00:00:00Z'));
    const h = svc.listHoldings().find((x) => x.symbol === 'ITC')!;
    expect(h.quantity).toBeCloseTo(30 + 300000 / 46000, 10);
    expect(h.investedAmount).toBe(1200000 + 300000);
    expect(h.currentValue).toBe(h.quantity * feed.getPrice('ITC'));
    expect(svc.getTotals().invested).toBe(before.invested + 300000);
    expect(svc.getTotals().currentValue).toBeGreaterThan(before.currentValue);
    ```
  - |
    AC5. No cash balance exists in the model, so a run is never gated on one. The seed has no cash field and the full amount is still bought.

    ```ts
    const svc = new PortfolioService(feed, { holdings: [], sips: [{ ...sip }] });
    svc.runDueSips(new Date('2026-10-15T00:00:00Z'));
    expect(svc.listHoldings()[0].investedAmount).toBe(sip.amount);
    ```
  - |
    AC6. Day 28 runs on the 28th, and the schedule helper treats 1 and 28 as the valid bounds.

    ```ts
    expect(dueDate({ ...sip, dayOfMonth: 28 }, new Date('2026-02-28T00:00:00Z'))).toBe('2026-02-28');
    expect(dueDate({ ...sip, dayOfMonth: 1 }, new Date('2026-10-01T00:00:00Z'))).toBe('2026-10-01');
    ```
  - |
    AC7. A stored day-29 SIP never runs, including on the 29th and in later catch-up.

    ```ts
    const s29 = { ...sip, dayOfMonth: 29 };
    expect(dueDate(s29, new Date('2026-10-29T00:00:00Z'))).toBeNull();
    expect(dueDate({ ...s29, lastRunOn: '2026-08-01' }, new Date('2026-10-30T00:00:00Z'))).toBeNull();
    svc.runDueSips(new Date('2026-10-29T00:00:00Z'));
    expect(svc.listHoldings()).toEqual([]);
    ```
  - |
    AC8. Non-monthly and inactive SIPs never run (the inactive case pins the active-only rule).

    ```ts
    expect(dueDate({ ...sip, frequency: 'weekly' }, new Date('2026-10-15T00:00:00Z'))).toBeNull();
    expect(dueDate({ ...sip, active: false }, new Date('2026-10-15T00:00:00Z'))).toBeNull();
    ```
  - |
    AC9 (sip-schedule.spec.ts, sip-scheduler.spec.ts, then the e2e spec). Several missed dates give exactly one purchase, on bootstrap, at the then-current price. Also pin the year rollover in the schedule spec.

    ```ts
    const svc = new PortfolioService(feed, { holdings: [], sips: [{ ...sip, lastRunOn: '2026-07-15' }] });
    const scheduler = new SipScheduler(svc, () => new Date('2026-10-22T00:00:00Z'));
    scheduler.onApplicationBootstrap();
    scheduler.onModuleDestroy();
    expect(svc.listHoldings()[0].investedAmount).toBe(sip.amount); // one purchase, not three
    expect(svc.listSips()[0].lastRunOn).toBe('2026-10-15');

    // year rollover
    expect(dueDate({ ...sip, dayOfMonth: 20, lastRunOn: '2025-11-20' }, new Date('2026-01-10T00:00:00Z'))).toBe('2025-12-20');
    ```

    The e2e spec does the same through HTTP, with `PORTFOLIO_SEED` holding an ITC SIP with `lastRunOn: '2026-07-15'` and `CLOCK` fixed to 2026-10-22.

    ```ts
    const body = (await request(server).get('/holdings').expect(200)).body;
    expect(body.find((h: any) => h.symbol === 'ITC').investedAmount).toBe(1200000 + 300000);
    const totals = (await request(server).get('/portfolio').expect(200)).body;
    expect(totals.invested).toBe(body.reduce((a: number, h: any) => a + h.investedAmount, 0));
    ```
  - |
    Regression. The existing portfolio.service.spec.ts, portfolio-history.service.spec.ts and portfolio.e2e-spec.ts pass unchanged. `new PortfolioService(feed)` still works with no seed and still lists exactly five holdings before any run, and seeded current values are unchanged.

assumptions_or_open_questions:
  - |
    State stays in memory, as it does today (the `pg` dependency is present but unused and nothing is persisted). A process restart therefore resets `lastRunOn` to the seed value, so "dates passed while the app was not running" is only truly detectable once SIP state is persisted. This plan makes the catch-up logic correct against `lastRunOn` and leaves persistence to whichever story introduces the database. Is that acceptable for this item?
  - |
    A SIP with `lastRunOn === null` only runs when the scheduled date is today. It has no baseline from which to count missed dates, so catch-up skips it. The dashboard epic's SIP creation would need to set `lastRunOn` (or a start date) to the creation date. Consequence: the demo SIPs never catch up on restart, and only buy if the app is up on the 5th, 15th or 25th.
  - |
    Dates are evaluated in UTC, and the scheduled date is stored as a 'YYYY-MM-DD' string. No timezone setting exists in the project.
  - |
    "Current simulated price" is `PriceFeedService.getPrice(symbol)`, the live feed that STORY-027 added. It is read at purchase time, so a catch-up run uses the price at app start (AC9).
  - |
    A SIP whose symbol is not in `CATALOGUE` is skipped silently and its `lastRunOn` is not advanced. `getPrice` throws for unknown symbols, so the service checks the catalogue first.
  - |
    Rounding. The share quantity is a float and `investedAmount` is exact paise. `currentValue` stays derived as `quantity * price` in `listHoldings`, as today, so no rounding is added.
  - |
    PortfolioHistoryService seeds its series from `getTotals()` at construction and only records new totals on a feed tick (30 s). A purchase at bootstrap, or on the hourly tick, shows in `/portfolio` at once but in the chart's last point at the next price tick. Wiring a history refresh from the scheduler is left out as speculative.
  - |
    The existing `portfolio.e2e-spec.ts` boots `AppModule` with the real clock, so on the 5th, 15th or 25th of a month a demo SIP buys at bootstrap. Its assertions are all consistency checks (five holdings, totals equal sums), so they still hold.
  - |
    The 'weekly' and 'daily' frequency values exist only so AC8 can be expressed and tested. No scheduling behaviour for them is built. The inactive case in AC8 is added to pin the "active" wording of the other ACs.
  - |
    The tick is hourly via `setInterval` so no new library is needed. The interval does not affect correctness, since runs are idempotent per scheduled date.

estimated_points: 3

package_dependencies: []

notes: |
  Everything lives in `services/api` (comp_platform_api). No web or worker changes, and no UI components are involved. The API owns the portfolio data (the epic says it "owns the data"), and the worker is a bare job loop with no datastore.

  Existing shape, from reading the code. `PortfolioService(feed: PriceFeedService)` derives `currentValue`, returns, day change and totals from `quantity` and the feed price. Money is integer paise and `quantity` is a plain number, so fractional shares need no type change. `PortfolioHistoryService` and `PortfolioController` depend on `PortfolioService`. `PriceFeedService` already uses a `setInterval(...).unref()` timer with `onModuleInit`/`onModuleDestroy`, which `SipScheduler` mirrors.

  ```mermaid
  flowchart TD
    AppModule --> PortfolioModule
    PortfolioModule --> PortfolioController
    PortfolioModule --> PortfolioService
    PortfolioModule --> SipScheduler
    PortfolioModule --> PortfolioHistoryService
    PortfolioController -->|GET holdings, sips, portfolio| PortfolioService
    SipScheduler -->|bootstrap catch-up and tick| PortfolioService
    PortfolioService -->|due check| SipSchedule
    PortfolioService -->|current price| PriceFeedService
    PortfolioService -->|initial state| SeedData
    PortfolioHistoryService -->|totals| PortfolioService

    classDef touched fill:#f96,color:#000
    class PortfolioModule,PortfolioService,SipScheduler,SipSchedule,SeedData touched
  ```

  Touched nodes and why. `SeedData` gains the frequency, active and lastRunOn fields. `SipSchedule` is new and holds the pure due-date rules. `PortfolioService` gets mutable seeded state and `runDueSips`. `SipScheduler` is new and is the trigger. `PortfolioModule` registers the scheduler and the `CLOCK` and `PORTFOLIO_SEED` tokens. `PortfolioController`, `PriceFeedService` and `PortfolioHistoryService` are untouched context.

  TDD order. Write sip-schedule.spec.ts first (AC6 to AC8, AC2 and AC9 date logic), then the portfolio.service.spec.ts additions (AC1 to AC5), then sip-scheduler.spec.ts (AC9), then the e2e spec. Run `cd services/api && pnpm run devloop` and `pnpm run e2e`.

review_focus: |
  IN scope is the API-side execution of monthly SIPs (day 1-28) against the in-memory portfolio state. OUT of scope are SIP creation, price simulation, persistence, a cash balance, chart-history refresh and any web or worker change. The riskiest part is the due-date rule in `sip-schedule.ts` (month and year rollover, day-29 exclusion, catch-up returning one date, and the `lastRunOn === null` case), together with idempotence across the bootstrap run and the repeating tick. Deliberate choices are the registered `PORTFOLIO_SEED` and `CLOCK` tokens (so e2e can override them), UTC dates, `currentValue` staying derived from the live feed price, no cash check (no cash model exists), and that catch-up depends on `lastRunOn`, which resets on restart until persistence exists.
