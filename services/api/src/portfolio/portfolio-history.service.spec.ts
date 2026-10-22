import { describe, expect, it } from 'vitest';
import { CHART_PERIODS, PortfolioHistoryService } from './portfolio-history.service';
import { PortfolioService } from './portfolio.service';
import { PriceFeedService } from './price-feed.service';

const DAY = 86_400_000;
const SPAN = { '1D': DAY, '1W': 7 * DAY, '1M': 30 * DAY, '3M': 90 * DAY, '1Y': 365 * DAY, ALL: 728 * DAY };

function setup() {
  let now = 1_700_000_000_000;
  const feed = new PriceFeedService(() => 1);
  const portfolio = new PortfolioService(feed);
  const history = new PortfolioHistoryService(feed, portfolio, () => now, () => 0.3);
  return { feed, portfolio, history, advance: (ms: number) => (now += ms) };
}

describe('PortfolioHistoryService', () => {
  it('offers the chart periods', () => {
    expect([...CHART_PERIODS]).toEqual(['1D', '1W', '1M', '3M', '1Y', 'ALL']);
  });

  it('seeds a fixed-interval series spanning the full period', () => {
    const { history, portfolio } = setup();
    for (const p of CHART_PERIODS) {
      const h = history.getHistory(p);
      expect(h.period).toBe(p);
      expect(h.points).toHaveLength(SPAN[p] / h.intervalMs + 1);
      for (let i = 1; i < h.points.length; i++) expect(h.points[i].t - h.points[i - 1].t).toBe(h.intervalMs);
      expect(h.points.at(-1)!.t - h.points[0].t).toBe(SPAN[p]);
      expect(h.points.every((pt) => pt.value >= 0)).toBe(true);
      expect(h.points.at(-1)!.value).toBe(portfolio.getTotals().currentValue);
    }
  });

  it('ends at the current total after a price tick', () => {
    const { history, feed, portfolio } = setup();
    feed.tick();
    for (const p of CHART_PERIODS) {
      expect(history.getHistory(p).points.at(-1)!.value).toBe(portfolio.getTotals().currentValue);
    }
  });

  it('rolls the window when an interval passes, keeping length and spacing', () => {
    const { history, feed, advance } = setup();
    const before = history.getHistory('1D');
    advance(before.intervalMs);
    feed.tick();
    const after = history.getHistory('1D');
    expect(after.points).toHaveLength(before.points.length);
    expect(after.points[0].t).toBe(before.points[1].t);
    for (let i = 1; i < after.points.length; i++) expect(after.points[i].t - after.points[i - 1].t).toBe(after.intervalMs);
  });

  it('ends at the current total after a purchase is recorded', () => {
    const { history, portfolio } = setup();
    (portfolio as any).holdings[0].quantity += 3;
    history.recordTotal();
    for (const p of CHART_PERIODS) {
      expect(history.getHistory(p).points.at(-1)!.value).toBe(portfolio.getTotals().currentValue);
    }
  });
});
