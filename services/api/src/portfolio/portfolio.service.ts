import { Inject, Injectable, Optional } from '@nestjs/common';
import { PriceFeedService } from './price-feed.service';
import { DEMO_HOLDINGS, DEMO_SIPS, Holding, Sip } from './seed-data';
import { dueDate } from './sip-schedule';
import { CATALOGUE, Stock } from './stock-catalogue';

export const PORTFOLIO_SEED = Symbol('PORTFOLIO_SEED');

export interface PortfolioSeed {
  holdings: Holding[];
  sips: Sip[];
}

export type HoldingView = Holding & {
  currentValue: number;
  returns: number;
  dayChange: number;
  dayChangePercent: number;
};

export interface PortfolioTotals {
  invested: number;
  currentValue: number;
  returns: number;
}

@Injectable()
export class PortfolioService {
  private readonly holdings: Holding[];
  private readonly sips: Sip[];

  constructor(
    private readonly feed: PriceFeedService,
    @Optional() @Inject(PORTFOLIO_SEED) seed?: PortfolioSeed,
  ) {
    this.holdings = (seed?.holdings ?? DEMO_HOLDINGS).map((h) => ({ ...h }));
    this.sips = (seed?.sips ?? DEMO_SIPS).map((s) => ({ ...s }));
  }

  listStocks(): Stock[] {
    return this.feed.getStocks();
  }

  listHoldings(): HoldingView[] {
    const stocks = new Map(this.feed.getStocks().map((s) => [s.symbol, s]));
    return this.holdings.map((h) => {
      const s = stocks.get(h.symbol)!;
      const currentValue = h.quantity * s.price;
      return {
        ...h,
        currentValue,
        returns: currentValue - h.investedAmount,
        dayChange: h.quantity * s.dayChange,
        dayChangePercent: s.dayChangePercent,
      };
    });
  }

  listSips(): Sip[] {
    return this.sips.map((s) => ({ ...s }));
  }

  /** Buys every SIP due on `today`; idempotent per scheduled date. */
  runDueSips(today: Date): { sipId: string; symbol: string; scheduledOn: string }[] {
    const ran: { sipId: string; symbol: string; scheduledOn: string }[] = [];
    for (const sip of this.sips) {
      const scheduledOn = dueDate(sip, today);
      if (!scheduledOn || !CATALOGUE.some((e) => e.symbol === sip.symbol)) continue;
      const quantity = sip.amount / this.feed.getPrice(sip.symbol);
      const held = this.holdings.find((h) => h.symbol === sip.symbol);
      if (held) {
        held.quantity += quantity;
        held.investedAmount += sip.amount;
      } else {
        this.holdings.push({ symbol: sip.symbol, quantity, investedAmount: sip.amount });
      }
      sip.lastRunOn = scheduledOn;
      ran.push({ sipId: sip.id, symbol: sip.symbol, scheduledOn });
    }
    return ran;
  }

  getTotals(): PortfolioTotals {
    const holdings = this.listHoldings();
    const sum = (f: (h: HoldingView) => number) => holdings.reduce((a, h) => a + f(h), 0);
    return {
      invested: sum((h) => h.investedAmount),
      currentValue: sum((h) => h.currentValue),
      returns: sum((h) => h.returns),
    };
  }
}
