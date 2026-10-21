import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  CHART_PERIODS,
  ChartPeriod,
  PortfolioHistory,
  PortfolioHistoryService,
} from './portfolio-history.service';
import { HoldingView, PortfolioService, PortfolioTotals } from './portfolio.service';
import { Sip } from './seed-data';
import { Stock } from './stock-catalogue';

@Controller()
export class PortfolioController {
  constructor(
    private readonly portfolio: PortfolioService,
    private readonly history: PortfolioHistoryService,
  ) {}

  @Get('stocks')
  stocks(): Stock[] {
    return this.portfolio.listStocks();
  }

  @Get('holdings')
  holdings(): HoldingView[] {
    return this.portfolio.listHoldings();
  }

  @Get('sips')
  sips(): Sip[] {
    return this.portfolio.listSips();
  }

  @Get('portfolio')
  totals(): PortfolioTotals {
    return this.portfolio.getTotals();
  }

  @Get('portfolio/history')
  getHistory(@Query('period') period: string = '1D'): PortfolioHistory {
    if (!(CHART_PERIODS as readonly string[]).includes(period)) {
      throw new BadRequestException(`period must be one of ${CHART_PERIODS.join(', ')}`);
    }
    return this.history.getHistory(period as ChartPeriod);
  }

  @Get('portfolio/periods')
  periods(): readonly ChartPeriod[] {
    return CHART_PERIODS;
  }
}
