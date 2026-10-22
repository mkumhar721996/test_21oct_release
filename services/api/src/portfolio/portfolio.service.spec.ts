import { beforeEach, describe, expect, it } from 'vitest';
import { PriceFeedService } from './price-feed.service';
import { HoldingView, PortfolioService } from './portfolio.service';
import { STOCKS } from './stock-catalogue';

describe('PortfolioService', () => {
  let feed: PriceFeedService;
  let service: PortfolioService;
  const sum = (f: (h: HoldingView) => number) => service.listHoldings().reduce((a, h) => a + f(h), 0);

  beforeEach(() => {
    feed = new PriceFeedService(() => 1);
    service = new PortfolioService(feed);
  });

  it('lists the catalogue', () => {
    expect(service.listStocks()).toEqual(STOCKS);
  });

  it('lists exactly five holdings', () => {
    expect(service.listHoldings()).toHaveLength(5);
  });

  it('lists at least one SIP referencing the catalogue', () => {
    const sips = service.listSips();
    expect(sips.length).toBeGreaterThanOrEqual(1);
    const symbols = STOCKS.map((s) => s.symbol);
    for (const s of sips) expect(symbols).toContain(s.symbol);
  });

  it('seeds the same current values as before', () => {
    expect(service.getTotals().currentValue).toBe(2850000 + 2050000 + 2016000 + 1376000 + 1380000);
  });

  describe('after a price move', () => {
    beforeEach(() => {
      feed.tick();
      feed.tick();
    });

    it('values holdings at the moved price', () => {
      for (const h of service.listHoldings()) expect(h.currentValue).toBe(h.quantity * feed.getPrice(h.symbol));
    });

    it('derives returns from current value', () => {
      for (const h of service.listHoldings()) expect(h.returns).toBe(h.currentValue - h.investedAmount);
    });

    it('derives 1D change amount and percent', () => {
      for (const h of service.listHoldings()) {
        const s = feed.getStocks().find((x) => x.symbol === h.symbol)!;
        expect(h.dayChange).toBe(h.quantity * (s.price - s.previousClose));
        expect(h.dayChangePercent).toBeCloseTo(((s.price - s.previousClose) / s.previousClose) * 100, 6);
      }
    });

    it('totals invested, current value and returns as sums of holdings', () => {
      const t = service.getTotals();
      expect(t.invested).toBe(sum((h) => h.investedAmount));
      expect(t.currentValue).toBe(sum((h) => h.currentValue));
      expect(t.returns).toBe(sum((h) => h.returns));
    });
  });
});
