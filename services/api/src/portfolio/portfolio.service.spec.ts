import { describe, expect, it } from 'vitest';
import { HoldingView, PortfolioService } from './portfolio.service';
import { STOCKS } from './stock-catalogue';

describe('PortfolioService', () => {
  const service = new PortfolioService();
  const sum = (f: (h: HoldingView) => number) => service.listHoldings().reduce((a, h) => a + f(h), 0);

  it('lists the catalogue', () => {
    expect(service.listStocks()).toEqual(STOCKS);
  });

  it('lists exactly five holdings', () => {
    expect(service.listHoldings()).toHaveLength(5);
  });

  it('gives every holding invested, current value and returns', () => {
    for (const h of service.listHoldings()) {
      expect(typeof h.investedAmount).toBe('number');
      expect(typeof h.currentValue).toBe('number');
      expect(h.returns).toBe(h.currentValue - h.investedAmount);
    }
  });

  it('lists at least one SIP referencing the catalogue', () => {
    const sips = service.listSips();
    expect(sips.length).toBeGreaterThanOrEqual(1);
    const symbols = STOCKS.map((s) => s.symbol);
    for (const s of sips) expect(symbols).toContain(s.symbol);
  });

  it('totals invested as the sum of holdings', () => {
    expect(service.getTotals().invested).toBe(sum((h) => h.investedAmount));
  });

  it('totals current value as the sum of holdings', () => {
    expect(service.getTotals().currentValue).toBe(sum((h) => h.currentValue));
  });

  it('totals returns as the sum of holdings', () => {
    expect(service.getTotals().returns).toBe(sum((h) => h.returns));
  });
});
