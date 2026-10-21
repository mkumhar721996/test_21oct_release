import { describe, expect, it } from 'vitest';
import { DEMO_HOLDINGS } from './seed-data';
import { STOCKS } from './stock-catalogue';

describe('stock catalogue', () => {
  it('has unique symbols', () => {
    const symbols = STOCKS.map((s) => s.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('contains every demo holding symbol', () => {
    const symbols = STOCKS.map((s) => s.symbol);
    for (const h of DEMO_HOLDINGS) expect(symbols).toContain(h.symbol);
  });
});
