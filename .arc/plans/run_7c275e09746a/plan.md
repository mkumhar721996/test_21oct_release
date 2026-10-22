summary: |
  Make the API's portfolio data live. Every catalogue stock gets a current price plus a previous-day close, from which 1D change (amount and percent) is derived. A scheduled price feed (every 30 s, each stock moves by a random amount within +/-0.5%) mutates in-memory prices. Holding figures (current value = quantity x price, returns, 1D change amount/percent) and portfolio totals are derived from live prices on every read. Portfolio value history is seeded per chart period (1D, 1W, 1M, 3M, 1Y, ALL) as a fixed-interval series spanning the full period, ending at the current total; it is extended on every price tick and via a hook called after a SIP purchase so its latest value always equals the portfolio current value total. All work is in comp_platform_api (NestJS, vitest, supertest); charts are displayed by the dashboard epic, not here.
scope:
  - description: |
      Extend the catalogue with a previous-day close and derive day change.
      Before: `interface Stock { symbol; name; price }`.
      After:
      ```ts
      export interface Stock {
        symbol: string;
        name: string;
        price: number;          // current, paise
        previousClose: number;  // paise
        dayChange: number;      // price - previousClose
        dayChangePercent: number; // dayChange / previousClose * 100
      }
      export interface CatalogueEntry { symbol: string; name: string; basePrice: number; previousClose: number }
      export const CATALOGUE: readonly CatalogueEntry[]
      export function toStock(e: CatalogueEntry, price: number): Stock
      ```
      Keep `STOCKS` exported (built from CATALOGUE, price = basePrice) so existing specs and seed consistency keep working. Seed previousClose values slightly different from basePrice so day change is non-zero at start. Base prices stay as today so seeded holdings (quantity x price) equal the existing seeded currentValue.
    files:
      - services/api/src/portfolio/stock-catalogue.ts
      - services/api/src/portfolio/stock-catalogue.spec.ts
    rationale: |
      AC 1, 2, 13 need price and previous close per stock; day change = price - previousClose must be a single derived definition.
  - description: |
      Add `PriceFeedService` (new, `@Injectable`) owning mutable prices and the 30 s schedule. No new package: uses `setInterval` in `onModuleInit`, cleared in `onModuleDestroy` (so the e2e `app.close()` does not leak a timer; `unref()` the timer).
      ```ts
      export const PRICE_TICK_MS = 30_000;
      export const MAX_MOVE = 0.005;
      @Injectable()
      export class PriceFeedService implements OnModuleInit, OnModuleDestroy {
        constructor(rng: () => number = Math.random)
        getStocks(): Stock[]
        getPrice(symbol: string): number
        tick(): void   // move every price by (rng()*2-1)*MAX_MOVE, Math.round to paise, min 1; then notify listeners
        onTick(listener: () => void): void
      }
      ```
      Rounding to integer paise can exceed 0.5% on very low prices only by under 1 paise; the test tolerance is `MAX_MOVE * prev + 1`.
    files:
      - services/api/src/portfolio/price-feed.service.ts
      - services/api/src/portfolio/price-feed.service.spec.ts
    rationale: |
      AC 3: moves of up to about 0.5% every 30 s. Injectable rng and a public `tick()` keep tests deterministic without fake-timer fragility; one fake-timer test proves the 30 s schedule.
  - description: |
      Derive holdings from live prices. `Holding` seed keeps `quantity` and `investedAmount`; `currentValue` is no longer authoritative in seed data (remove it from `DEMO_HOLDINGS`, or ignore it) and is computed as `quantity * price`.
      ```ts
      export type HoldingView = Holding & {
        currentValue: number; returns: number;
        dayChange: number; dayChangePercent: number;
      };
      ```
      `dayChange = quantity * (price - previousClose)`; `dayChangePercent = (price - previousClose) / previousClose * 100`; `returns = currentValue - investedAmount`. `PortfolioService` takes `PriceFeedService` in its constructor and uses it in `listStocks`, `listHoldings`, `getTotals` (totals remain sums over `listHoldings()`).
    files:
      - services/api/src/portfolio/seed-data.ts
      - services/api/src/portfolio/portfolio.service.ts
      - services/api/src/portfolio/portfolio.service.spec.ts
    rationale: |
      AC 4-8, 12: figures must follow price moves; totals equal sums of holdings by construction.
  - description: |
      Add `PortfolioHistoryService` (new) holding per-period fixed-interval series and the period list.
      ```ts
      export const CHART_PERIODS = ['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const;
      export type ChartPeriod = (typeof CHART_PERIODS)[number];
      export interface HistoryPoint { t: number; value: number }  // t = epoch ms
      export interface PortfolioHistory { period: ChartPeriod; intervalMs: number; points: HistoryPoint[] }
      // span / interval: 1D 24h/5min, 1W 7d/1h, 1M 30d/1d, 3M 90d/1d, 1Y 365d/1d, ALL 730d/7d
      getHistory(period: ChartPeriod): PortfolioHistory
      recordTotal(): void   // called on each price tick and after a SIP purchase
      ```
      Seeding: constructor takes an injectable clock and rng; builds each series with `span/interval + 1` points ending at "now" with value = current total, walking backwards with small bounded random steps (values never below 0). `recordTotal()` sets the latest point's value to the current total; if the clock has passed the next interval boundary, it appends a new point and drops the oldest (series length and spacing stay fixed). Subscribes to `PriceFeedService.onTick`. `recordTotal()` is the hook a future SIP-execution story calls after applying a purchase (there is no SIP execution code in the repo today).
    files:
      - services/api/src/portfolio/portfolio-history.service.ts
      - services/api/src/portfolio/portfolio-history.service.spec.ts
    rationale: |
      AC 9, 10, 11, 14. Keeping history in its own service avoids bloating PortfolioService and makes the "latest equals total" invariant testable in isolation.
  - description: |
      Wire up and expose. Register both new providers in `PortfolioModule`; add endpoints `GET /portfolio/history?period=1D` (400 via `BadRequestException` on an unknown period; default 1D) and `GET /portfolio/periods` returning `CHART_PERIODS`. Existing `GET /stocks`, `/holdings`, `/portfolio` now return the new fields.
      ```ts
      @Get('portfolio/history') history(@Query('period') period: string = '1D'): PortfolioHistory
      @Get('portfolio/periods') periods(): readonly ChartPeriod[]
      ```
    files:
      - services/api/src/portfolio/portfolio.module.ts
      - services/api/src/portfolio/portfolio.controller.ts
      - services/api/test/portfolio.e2e-spec.ts
    rationale: |
      The dashboard epic needs an HTTP surface; AC 1, 2, 14 are observable "when viewed" through the API.
tests:
  - |
    AC1 (stock-catalogue.spec.ts, portfolio.e2e-spec.ts) — write first:
    ```ts
    const stocks = (await request(server).get('/stocks').expect(200)).body;
    for (const s of stocks) expect(s.price).toBeGreaterThan(0);
    expect(stocks).toHaveLength(CATALOGUE.length);
    ```
  - |
    AC2 — every stock shows 1D change:
    ```ts
    for (const s of stocks) {
      expect(typeof s.dayChange).toBe('number');
      expect(typeof s.dayChangePercent).toBe('number');
    }
    ```
  - |
    AC3 (price-feed.service.spec.ts) — with rng fixed to 1 then 0, and after `tick()`:
    ```ts
    const before = feed.getStocks();
    feed.tick();
    for (const [i, s] of feed.getStocks().entries())
      expect(Math.abs(s.price - before[i].price)).toBeLessThanOrEqual(0.005 * before[i].price + 1);
    ```
    Plus fake-timer test: `vi.useFakeTimers(); feed.onModuleInit(); vi.advanceTimersByTime(29_999)` -> price unchanged; `advanceTimersByTime(1)` -> at least one price changed (rng fixed non-zero).
  - |
    AC4 (portfolio.service.spec.ts) — after `feed.tick()`:
    ```ts
    for (const h of service.listHoldings()) expect(h.currentValue).toBe(h.quantity * feed.getPrice(h.symbol));
    ```
  - |
    AC5:
    ```ts
    for (const h of service.listHoldings()) expect(h.returns).toBe(h.currentValue - h.investedAmount);
    ```
    with prices moved by `tick()` (rng fixed to 1) so returns differ from the seeded values.
  - |
    AC6:
    ```ts
    const s = feed.getStocks().find((x) => x.symbol === h.symbol)!;
    expect(h.dayChange).toBe(h.quantity * (s.price - s.previousClose));
    ```
  - |
    AC7:
    ```ts
    expect(service.getTotals().currentValue).toBe(service.listHoldings().reduce((a, h) => a + h.currentValue, 0));
    ```
    run after a tick (existing total specs are kept and also run against moved prices).
  - |
    AC8:
    ```ts
    expect(service.getTotals().returns).toBe(service.listHoldings().reduce((a, h) => a + h.returns, 0));
    ```
  - |
    AC9 (portfolio-history.service.spec.ts) — for each of CHART_PERIODS right after construction:
    ```ts
    const h = history.getHistory(p);
    expect(h.points).toHaveLength(SPAN[p] / h.intervalMs + 1);
    for (let i = 1; i < h.points.length; i++) expect(h.points[i].t - h.points[i - 1].t).toBe(h.intervalMs);
    expect(h.points.at(-1)!.t - h.points[0].t).toBe(SPAN[p]);
    ```
  - |
    AC10 — after `feed.tick()` (history subscribed to tick), for every period:
    ```ts
    expect(history.getHistory(p).points.at(-1)!.value).toBe(service.getTotals().currentValue);
    ```
    Plus: advancing the injected clock by one interval then ticking appends one point and drops the oldest (length unchanged, spacing still `intervalMs`).
  - |
    AC11 — simulate a purchase by mutating the holding via a test seam (e.g. raising a held quantity), then calling the hook:
    ```ts
    history.recordTotal();
    for (const p of CHART_PERIODS) expect(history.getHistory(p).points.at(-1)!.value).toBe(service.getTotals().currentValue);
    ```
  - |
    AC12 — after a tick:
    ```ts
    expect(h.dayChangePercent).toBeCloseTo(((price - s.previousClose) / s.previousClose) * 100, 6);
    ```
  - |
    AC13 (stock-catalogue.spec.ts + e2e):
    ```ts
    for (const s of stocks) expect(s.dayChange).toBe(s.price - s.previousClose);
    ```
    also asserted after a tick.
  - |
    AC14 (e2e):
    ```ts
    const body = (await request(server).get('/portfolio/periods').expect(200)).body;
    expect(body).toEqual(['1D', '1W', '1M', '3M', '1Y', 'ALL']);
    await request(server).get('/portfolio/history?period=2Y').expect(400);
    ```
assumptions_or_open_questions:
  - |
    State is in-memory and resets on API restart; no PostgreSQL tables are added (the existing portfolio code is already in-memory seed data). Say if the feed/history should be persisted.
  - |
    No SIP execution code exists in the repo (only `DEMO_SIPS` seed). I expose `PortfolioHistoryService.recordTotal()` as the post-purchase hook and test AC11 through it; the SIP-run mechanism itself is assumed to be a separate story in the epic. Confirm that is acceptable.
  - |
    Holdings' `currentValue` becomes `quantity x live price`. The five seeded values already equal quantity x catalogue price, so the initial numbers do not change.
  - |
    Seeded history is synthetic (bounded random walk backward from the current total); period spans/intervals (1D/5min, 1W/1h, 1M/1d, 3M/1d, 1Y/1d, ALL = 2 years/weekly) are my choice since the story only says "fixed interval". The 1D change on holdings is the sum of per-stock 1D changes weighted by quantity.
  - |
    The 30 s timer runs in the API process (the worker component is not used) because the data lives in the API's memory.
  - |
    Money stays integer paise; prices are rounded to whole paise after each move, hence the +1 paise tolerance in the 0.5% check.
estimated_points: 5
package_dependencies: []
notes: |
  Existing code read: `services/api/src/portfolio/{portfolio.service,portfolio.controller,portfolio.module,seed-data,stock-catalogue}.ts`, their specs and `services/api/test/portfolio.e2e-spec.ts`. The existing `PortfolioService` is constructed with `new PortfolioService()` in its spec; the spec must be updated to construct `new PriceFeedService(rng)` and pass it in.

  ```mermaid
  flowchart TD
    Ctl[portfolio.controller.ts] -->|new history/periods routes| Svc[portfolio.service.ts]
    Ctl --> Hist[portfolio-history.service.ts]
    Svc -->|live prices| Feed[price-feed.service.ts]
    Hist -->|onTick + totals| Feed
    Hist -->|current total| Svc
    Feed --> Cat[stock-catalogue.ts]
    Svc --> Seed[seed-data.ts]
    Mod[portfolio.module.ts] -->|register providers| Feed
    Mod --> Hist
    classDef touched fill:#f96,color:#000
    class Ctl,Svc,Hist,Feed,Cat,Seed,Mod touched
  ```
  All web UI work (chart display, stock views) belongs to the dashboard epic; no `apps/web` changes here, so no UI component reuse applies.
review_focus: |
  IN: API-only price feed, derived holding/total figures, per-period history with the "latest == total" invariant and a `recordTotal()` hook; OUT: chart rendering, web changes, SIP execution itself, persistence. Riskiest area is the history rolling-window logic (fixed spacing and length while ticks arrive every 30 s) and keeping all figures derived from one price source so totals never drift. Deliberate: in-memory state, injectable rng/clock for determinism, and the 1 paise rounding tolerance on the 0.5% bound.
