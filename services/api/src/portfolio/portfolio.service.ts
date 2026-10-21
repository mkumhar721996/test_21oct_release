import { Injectable } from '@nestjs/common';
import { DEMO_HOLDINGS, DEMO_SIPS, Holding, Sip } from './seed-data';
import { STOCKS, Stock } from './stock-catalogue';

export type HoldingView = Holding & { returns: number };

export interface PortfolioTotals {
  invested: number;
  currentValue: number;
  returns: number;
}

@Injectable()
export class PortfolioService {
  listStocks(): Stock[] {
    return [...STOCKS];
  }

  listHoldings(): HoldingView[] {
    return DEMO_HOLDINGS.map((h) => ({ ...h, returns: h.currentValue - h.investedAmount }));
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
