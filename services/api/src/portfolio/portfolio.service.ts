import { Injectable } from '@nestjs/common';
import { PriceFeedService } from './price-feed.service';
import { DEMO_HOLDINGS, DEMO_SIPS, Holding, Sip } from './seed-data';
import { Stock } from './stock-catalogue';

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
  private readonly holdings: Holding[] = DEMO_HOLDINGS.map((h) => ({ ...h }));

  constructor(private readonly feed: PriceFeedService) {}

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
    return [...DEMO_SIPS];
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
