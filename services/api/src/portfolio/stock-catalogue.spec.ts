import { describe, expect, it } from 'vitest';
import { DEMO_HOLDINGS } from './seed-data';
import { CATALOGUE, STOCKS, toStock } from './stock-catalogue';

describe('stock catalogue', () => {
  it('has unique symbols', () => {
    const symbols = STOCKS.map((s) => s.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('contains every demo holding symbol', () => {
    const symbols = STOCKS.map((s) => s.symbol);
    for (const h of DEMO_HOLDINGS) expect(symbols).toContain(h.symbol);
  });

  it('gives every stock a positive price and a non-zero 1D change', () => {
    expect(STOCKS).toHaveLength(CATALOGUE.length);
    for (const s of STOCKS) {
      expect(s.price).toBeGreaterThan(0);
      expect(s.dayChange).not.toBe(0);
      expect(typeof s.dayChangePercent).toBe('number');
    }
  });

  it('derives 1D change as price minus previous close', () => {
    for (const s of STOCKS) expect(s.dayChange).toBe(s.price - s.previousClose);
    const moved = toStock(CATALOGUE[0], CATALOGUE[0].previousClose + 500);
    expect(moved.dayChange).toBe(500);
    expect(moved.dayChangePercent).toBeCloseTo((500 / CATALOGUE[0].previousClose) * 100, 6);
  });
});
