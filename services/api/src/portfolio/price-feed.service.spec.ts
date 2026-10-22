import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_MOVE, PRICE_TICK_MS, PriceFeedService } from './price-feed.service';

describe('PriceFeedService', () => {
  afterEach(() => vi.useRealTimers());

  it('moves each price by no more than about 0.5% per tick', () => {
    for (const r of [1, 0, 0.5]) {
      const feed = new PriceFeedService(() => r);
      const before = feed.getStocks();
      feed.tick();
      feed.getStocks().forEach((s, i) => {
        expect(Math.abs(s.price - before[i].price)).toBeLessThanOrEqual(MAX_MOVE * before[i].price + 1);
        expect(s.dayChange).toBe(s.price - s.previousClose);
      });
    }
  });

  it('notifies listeners on tick', () => {
    const feed = new PriceFeedService(() => 1);
    const l = vi.fn();
    feed.onTick(l);
    feed.tick();
    expect(l).toHaveBeenCalledTimes(1);
  });

  it('ticks every 30 seconds and stops on destroy', () => {
    vi.useFakeTimers();
    const feed = new PriceFeedService(() => 1);
    const start = feed.getPrice('TCS');
    feed.onModuleInit();
    vi.advanceTimersByTime(PRICE_TICK_MS - 1);
    expect(feed.getPrice('TCS')).toBe(start);
    vi.advanceTimersByTime(1);
    expect(feed.getPrice('TCS')).toBeGreaterThan(start);
    feed.onModuleDestroy();
    const after = feed.getPrice('TCS');
    vi.advanceTimersByTime(PRICE_TICK_MS * 3);
    expect(feed.getPrice('TCS')).toBe(after);
  });
});
