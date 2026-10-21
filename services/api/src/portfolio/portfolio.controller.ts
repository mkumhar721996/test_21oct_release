import { Controller, Get } from '@nestjs/common';
import { HoldingView, PortfolioService, PortfolioTotals } from './portfolio.service';
import { Sip } from './seed-data';
import { Stock } from './stock-catalogue';

@Controller()
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

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
}
