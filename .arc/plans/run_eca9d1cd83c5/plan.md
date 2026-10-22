summary: |
  Add the portfolio data foundation to the Platform API (NestJS): a single stock catalogue shared by holdings and the SIP stock choice, one seeded demo investor with exactly five holdings and a few SIPs, and portfolio totals derived from those holdings. The data is exposed through read-only endpoints (GET /stocks, /holdings, /sips, /portfolio). Totals are computed from the holdings, never hard-coded, so invested, current value and returns always add up. Price movement, SIP runs and any dashboard or SIP UI are out of scope (separate stories).
scope:
  - description: |
      Stock catalogue module: one typed list of stocks, the single source for holdings and for the SIP stock choice.

      ```ts
      export interface Stock { symbol: string; name: string; price: number } // price in minor units (paise)
      export const STOCKS: readonly Stock[]
      ```
    files:
      - services/api/src/portfolio/stock-catalogue.ts
      - services/api/src/portfolio/stock-catalogue.spec.ts
    rationale: |
      AC1 needs the SIP choice and holdings to share one catalogue so they cannot drift.
  - description: |
      Seed data: demo investor, five holdings (symbol, quantity, investedAmount, currentValue) and two or three SIPs referencing catalogue symbols. Amounts are integers in minor units to avoid float drift in the sums. Returns is not stored; it is derived as currentValue minus investedAmount.

      ```ts
      export interface Holding { symbol: string; quantity: number; investedAmount: number; currentValue: number }
      export interface Sip { id: string; symbol: string; amount: number; dayOfMonth: number }
      export const DEMO_HOLDINGS: readonly Holding[]
      export const DEMO_SIPS: readonly Sip[]
      ```
    files:
      - services/api/src/portfolio/seed-data.ts
    rationale: |
      AC2, AC3 and AC4. Deriving returns keeps AC7 true by construction.
  - description: |
      PortfolioService with pure read methods, plus a controller and module wired into AppModule.

      ```ts
      listStocks(): Stock[]
      listHoldings(): HoldingView[]   // Holding & { returns: number }
      listSips(): Sip[]
      getTotals(): { invested: number; currentValue: number; returns: number }
      ```

      Routes: GET /stocks, GET /holdings, GET /sips, GET /portfolio (returns the totals). AppModule imports PortfolioModule.
    files:
      - services/api/src/portfolio/portfolio.service.ts
      - services/api/src/portfolio/portfolio.controller.ts
      - services/api/src/portfolio/portfolio.module.ts
      - services/api/src/portfolio/portfolio.service.spec.ts
      - services/api/src/app.module.ts
      - services/api/test/portfolio.e2e-spec.ts
    rationale: |
      Exposes the data to the web app over the Platform API, following the existing HealthController and AppModule pattern. Unit specs live under src and match the vitest include glob. The e2e spec lives under test and matches the e2e glob.
tests:
  - |
    AC1 (write first, fails until the catalogue and the stocks route exist). In services/api/test/portfolio.e2e-spec.ts:
    ```ts
    const stocks = (await request(server).get('/stocks').expect(200)).body;
    const holdings = (await request(server).get('/holdings').expect(200)).body;
    const choices = stocks.map((s: { symbol: string }) => s.symbol);
    for (const h of holdings) expect(choices).toContain(h.symbol);
    ```
    Unit twin in stock-catalogue.spec.ts: every DEMO_HOLDINGS symbol exists in STOCKS, and symbols are unique.
  - |
    AC2. In portfolio.service.spec.ts:
    ```ts
    expect(service.listHoldings()).toHaveLength(5);
    ```
    e2e: `expect(body).toHaveLength(5)` on GET /holdings.
  - |
    AC3. Every holding has a numeric invested amount, current value and returns:
    ```ts
    for (const h of service.listHoldings()) {
      expect(typeof h.investedAmount).toBe('number');
      expect(typeof h.currentValue).toBe('number');
      expect(h.returns).toBe(h.currentValue - h.investedAmount);
    }
    ```
  - |
    AC4. In the service spec and e2e, GET /sips:
    ```ts
    expect(service.listSips().length).toBeGreaterThanOrEqual(1);
    ```
  - |
    AC5. Invested total equals the sum of the holdings:
    ```ts
    const sum = (f: (h: HoldingView) => number) => service.listHoldings().reduce((a, h) => a + f(h), 0);
    expect(service.getTotals().invested).toBe(sum((h) => h.investedAmount));
    ```
  - |
    AC6. Current value total:
    ```ts
    expect(service.getTotals().currentValue).toBe(sum((h) => h.currentValue));
    ```
  - |
    AC7. Returns total, plus an e2e check on GET /portfolio:
    ```ts
    expect(service.getTotals().returns).toBe(sum((h) => h.returns));
    expect(body.returns).toBe(body.currentValue - body.invested);
    ```
assumptions_or_open_questions:
  - |
    Persistence: the stack lists PostgreSQL, but the API has no database wiring, migrations or repository layer yet (only pg is a dependency, and there is no module using it). I assumed the seed is an in-memory typed constant served by the service. Moving it into Postgres tables with a migration would be a larger change and should be a follow-up unless you want it here.
  - |
    "The demo is opened" is read as the API being up with the seed loaded. No web UI for holdings or the SIP picker exists yet, and the scope says the dashboard epic only displays this data, so no web changes are planned. Tell me if a web view is expected in this story.
  - |
    AC1 is satisfied by GET /stocks being the SIP stock choice source (catalogue contains all held stocks, possibly more). Say so if the choice must be exactly the held stocks.
  - |
    Currency and units: amounts are integers in minor units (paise), with INR assumed. The web layer formats them later.
  - |
    Single demo investor, so no investor id in routes. Per-user scoping is out of scope.
  - |
    1D change is part of the parent epic but not in these ACs, so it is not added.
estimated_points: 3
package_dependencies: []
notes: |
  Mirrors the existing HealthController and AppModule pattern in services/api/src. New code is additive under services/api/src/portfolio, with a one-line import in AppModule. Unit tests run with `pnpm test` and e2e with `pnpm e2e` in services/api.

  ```mermaid
  flowchart TD
    AppModule[app.module.ts] --> PortfolioModule[portfolio.module.ts]
    AppModule --> HealthController[health.controller.ts]
    PortfolioModule --> PortfolioController[portfolio.controller.ts]
    PortfolioController --> PortfolioService[portfolio.service.ts]
    PortfolioService --> Stocks[stock-catalogue.ts]
    PortfolioService --> Seed[seed-data.ts]
    Seed --> Stocks
    classDef touched fill:#f96,color:#000
    class AppModule,PortfolioModule,PortfolioController,PortfolioService,Stocks,Seed touched
  ```
review_focus: |
  IN: stock catalogue, seeded demo holdings and SIPs, derived totals, and read-only API endpoints in services/api. OUT: price movement, SIP execution, 1D change, any web UI and database persistence. The riskiest part is keeping the totals derived from the holdings (returns = current value minus invested), not duplicated constants. The in-memory seed rather than Postgres is deliberate, because no DB layer exists yet.
