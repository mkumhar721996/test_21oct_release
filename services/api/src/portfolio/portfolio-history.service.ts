import { Injectable, Optional } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { PriceFeedService } from './price-feed.service';

export const CHART_PERIODS = ['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

export interface HistoryPoint {
  t: number; // epoch ms
  value: number;
}

export interface PortfolioHistory {
  period: ChartPeriod;
  intervalMs: number;
  points: HistoryPoint[];
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MAX_STEP = 0.01;

const PERIOD_SPECS: Record<ChartPeriod, { spanMs: number; intervalMs: number }> = {
  '1D': { spanMs: DAY, intervalMs: 5 * MINUTE },
  '1W': { spanMs: 7 * DAY, intervalMs: HOUR },
  '1M': { spanMs: 30 * DAY, intervalMs: DAY },
  '3M': { spanMs: 90 * DAY, intervalMs: DAY },
  '1Y': { spanMs: 365 * DAY, intervalMs: DAY },
  ALL: { spanMs: 728 * DAY, intervalMs: 7 * DAY },
};

@Injectable()
export class PortfolioHistoryService {
  private readonly series = new Map<ChartPeriod, PortfolioHistory>();

  constructor(
    feed: PriceFeedService,
    private readonly portfolio: PortfolioService,
    @Optional() private readonly clock: () => number = Date.now,
    @Optional() private readonly rng: () => number = Math.random,
  ) {
    const total = this.portfolio.getTotals().currentValue;
    const now = this.clock();
    for (const period of CHART_PERIODS) {
      const { spanMs, intervalMs } = PERIOD_SPECS[period];
      const count = spanMs / intervalMs + 1;
      const points: HistoryPoint[] = [];
      let value = total;
      for (let i = 0; i < count; i++) {
        points.unshift({ t: now - i * intervalMs, value });
        value = Math.max(0, Math.round(value * (1 + (this.rng() * 2 - 1) * MAX_STEP)));
      }
      this.series.set(period, { period, intervalMs, points });
    }
    feed.onTick(() => this.recordTotal());
  }

  getHistory(period: ChartPeriod): PortfolioHistory {
    const h = this.series.get(period)!;
    return { ...h, points: h.points.map((p) => ({ ...p })) };
  }

  recordTotal(): void {
    const total = this.portfolio.getTotals().currentValue;
    const now = this.clock();
    for (const h of this.series.values()) {
      const last = h.points[h.points.length - 1];
      if (now >= last.t + h.intervalMs) {
        h.points.push({ t: last.t + h.intervalMs, value: total });
        h.points.shift();
      } else {
        last.value = total;
      }
    }
  }
}
