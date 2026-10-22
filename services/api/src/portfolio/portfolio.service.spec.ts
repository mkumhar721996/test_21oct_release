import { beforeEach, describe, expect, it } from 'vitest';
import { PriceFeedService } from './price-feed.service';
import { HoldingView, PortfolioService } from './portfolio.service';
import { DEMO_HOLDINGS, Sip } from './seed-data';
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

describe('PortfolioService.runDueSips', () => {
  const sip: Sip = {
    id: 's',
    symbol: 'ITC',
    amount: 300000,
    dayOfMonth: 15,
    frequency: 'monthly',
    active: true,
    lastRunOn: null,
  };
  const day15 = new Date('2026-10-15T00:00:00Z');
  const feed = () => new PriceFeedService(() => 1);

  it('buys the full amount as fractional shares at the feed price (AC1)', () => {
    const svc = new PortfolioService(feed(), { holdings: [], sips: [{ ...sip }] });
    svc.runDueSips(day15);
    const h = svc.listHoldings().find((x) => x.symbol === 'ITC')!;
    expect(h.quantity).toBeCloseTo(300000 / 46000, 10);
    expect(h.investedAmount).toBe(300000);
  });

  it('buys once per scheduled date (AC2)', () => {
    const svc = new PortfolioService(feed(), { holdings: [], sips: [{ ...sip }] });
    svc.runDueSips(day15);
    const after = svc.listHoldings();
    svc.runDueSips(new Date('2026-10-15T12:00:00Z'));
    svc.runDueSips(new Date('2026-10-20T00:00:00Z'));
    expect(svc.listHoldings()).toEqual(after);
    expect(svc.listSips()[0].lastRunOn).toBe('2026-10-15');
  });

  it('creates a new holding for an unheld stock (AC3)', () => {
    const svc = new PortfolioService(feed(), { holdings: [], sips: [{ ...sip, symbol: 'WIPRO' }] });
    svc.runDueSips(day15);
    expect(svc.listHoldings().map((h) => h.symbol)).toEqual(['WIPRO']);
  });

  it('updates shares, invested amount and portfolio value (AC4)', () => {
    const f = feed();
    const svc = new PortfolioService(f, { holdings: [...DEMO_HOLDINGS], sips: [{ ...sip }] });
    const before = svc.getTotals();
    svc.runDueSips(day15);
    const h = svc.listHoldings().find((x) => x.symbol === 'ITC')!;
    expect(h.quantity).toBeCloseTo(30 + 300000 / 46000, 10);
    expect(h.investedAmount).toBe(1200000 + 300000);
    expect(h.currentValue).toBe(h.quantity * f.getPrice('ITC'));
    expect(svc.getTotals().invested).toBe(before.invested + 300000);
    expect(svc.getTotals().currentValue).toBeGreaterThan(before.currentValue);
  });

  it('is not gated on a cash balance (AC5)', () => {
    const svc = new PortfolioService(feed(), { holdings: [], sips: [{ ...sip }] });
    svc.runDueSips(day15);
    expect(svc.listHoldings()[0].investedAmount).toBe(sip.amount);
  });

  it('never runs a day-29 SIP (AC7)', () => {
    const svc = new PortfolioService(feed(), { holdings: [], sips: [{ ...sip, dayOfMonth: 29 }] });
    svc.runDueSips(new Date('2026-10-29T00:00:00Z'));
    expect(svc.listHoldings()).toEqual([]);
  });

  it('skips a SIP for a symbol outside the catalogue without marking it run', () => {
    const svc = new PortfolioService(feed(), { holdings: [], sips: [{ ...sip, symbol: 'NOPE' }] });
    expect(svc.runDueSips(day15)).toEqual([]);
    expect(svc.listSips()[0].lastRunOn).toBeNull();
  });
});
