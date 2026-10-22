import { describe, expect, it } from 'vitest';
import { PortfolioHistoryService } from './portfolio-history.service';
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
const oct22 = () => new Date('2026-10-22T00:00:00Z');

function bootstrap(seedSip: Sip) {
  const svc = new PortfolioService(new PriceFeedService(() => 1), { holdings: [], sips: [seedSip] });
  const scheduler = new SipScheduler(svc, oct22);
  scheduler.onApplicationBootstrap();
  scheduler.onModuleDestroy();
  return svc;
}

describe('SipScheduler', () => {
  it('buys once on bootstrap however many dates were missed (AC9)', () => {
    const svc = bootstrap({ ...sip });
    expect(svc.listHoldings()[0].investedAmount).toBe(sip.amount);
    expect(svc.listSips()[0].lastRunOn).toBe('2026-10-15');
  });

  it('buys exactly once on bootstrap for a SIP that has never run (AC9)', () => {
    const svc = bootstrap({ ...sip, lastRunOn: null });
    expect(svc.listHoldings()[0].investedAmount).toBe(sip.amount);
    expect(svc.listSips()[0].lastRunOn).toBe('2026-10-15');
  });

  it('refreshes the chart total after a purchase', () => {
    const feed = new PriceFeedService(() => 1);
    const svc = new PortfolioService(feed, { holdings: [], sips: [{ ...sip }] });
    const history = new PortfolioHistoryService(feed, svc);
    const scheduler = new SipScheduler(svc, oct22, history);
    scheduler.onApplicationBootstrap();
    scheduler.onModuleDestroy();
    expect(history.getHistory('1D').points.at(-1)!.value).toBe(svc.getTotals().currentValue);
  });
});
