import { describe, expect, it } from 'vitest';
import { PortfolioService } from './portfolio.service';
import { PriceFeedService } from './price-feed.service';
import { Sip } from './seed-data';
import { SipScheduler } from './sip-scheduler';

const sip: Sip = {
  id: 's',
  symbol: 'ITC',
  amount: 300000,
  dayOfMonth: 15,
  frequency: 'monthly',
  active: true,
  lastRunOn: '2026-07-15',
};

describe('SipScheduler', () => {
  it('buys once on bootstrap however many dates were missed (AC9)', () => {
    const svc = new PortfolioService(new PriceFeedService(() => 1), {
      holdings: [],
      sips: [{ ...sip }],
    });
    const scheduler = new SipScheduler(svc, () => new Date('2026-10-22T00:00:00Z'));
    scheduler.onApplicationBootstrap();
    scheduler.onModuleDestroy();
    expect(svc.listHoldings()[0].investedAmount).toBe(sip.amount);
    expect(svc.listSips()[0].lastRunOn).toBe('2026-10-15');
  });
});
